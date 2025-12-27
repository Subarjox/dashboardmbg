const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userSekolahController = {

  dashboard: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;

    try {
      const { data: sekolah, error: sekolahError } = await supabase
        .from('sekolah')
        .select('*')
        .eq('id_sekolah', sekolahId)
        .single();

      if (sekolahError) throw sekolahError;

      //ambil data satuan gizi
      const { data: sppg, error: sppgError } = await supabase
        .from('satuan_gizi')
        .select('nama_sppg')
        .eq('id_sppg', sekolah.id_sppg)
        .single();

      if (sppgError) throw sppgError;

      //ambil data menu makanan
      const { data: menu_makanan, error: menu_makananError } = await supabase
        .from('menu_makanan')
        .select('nama_makanan')
        .eq('id_sppg', sekolah.id_sppg)
        .limit(1)
        .single();

      // Ambil siswa milik sekolah tersebut
      const { count: TotalSiswa, error: TotalSiswaError } = await supabase
        .from('siswa')
        .select('*', { count: 'exact', head: true })
        .eq('sekolah_id', sekolahId);

      if (TotalSiswaError) throw TotalSiswaError;

      res.render('users/pihak_sekolah/pihak_sekolah', {
        user: req.session.user,
        sekolah,
        TotalSiswa,
        sppg,
        menu_makanan,
        pageCrumb: 'Dashboard',
        pageTitle: 'Dashboard Sekolah',
        breadcrumb: ['Dashboard Sekolah'],
      });
    } catch (err) {
      console.error(err);
      res.send('Gagal memuat dashboard: ' + err.message);
    }
  },

  getSiswa: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;

    try {
      const { data, error } = await supabase
        .from('siswa')
        .select(`
        nisn,
        nama,
        orang_tua,
        kategori_alergi,
        deskripsi_alergi,
        foto_siswa,
        sekolah:sekolah_id(nama_sekolah, kota, provinsi)
      `)
        .eq('sekolah_id', sekolahId);

      if (error) throw error;

      res.render('users/pihak_sekolah/siswa_sekolah', {
        user: req.session.user,
        siswa: data,
        pageTitle: 'Siswa Saya',
        pageCrumb: 'Siswa',
        breadcrumb: ['Dashboard Sekolah', 'Siswa'],
      });
    } catch (err) {
      res.send('Error: ' + err.message);
    }
  },

  getAllSiswaAjax: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10; // jumlah data per halaman
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const search = req.query.search || '';
      const provinsi = req.query.provinsi || '';

      let query = supabase.from('siswa')
        .select(`
          nisn,
          nama,
          orang_tua,
          kategori_alergi,
          deskripsi_alergi,
          foto_siswa,
          sekolah:sekolah_id(nama_sekolah, kota, provinsi)
        `, { count: 'exact' })
        .eq('sekolah_id', sekolahId);


      if (search) query = query.ilike('nama', `%${search}%`);
      if (provinsi) query = query.eq('sekolah.provinsi', provinsi);

      query = query.range(from, to).order('nisn', { ascending: true });

      const { data, count, error } = await query;

      if (error) return res.json({ error: error.message });

      res.json({
        data,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalData: count
      });

    } catch (err) {
      res.json({ error: err.message });
    }
  },

  addSiswaForm: async (req, res) => {
    res.render('usersekolah/tambah_siswa', {
      user: req.session.user,
      pageTitle: 'Tambah Siswa',
      pageCrumb: 'Siswa',
      breadcrumb: ['Dashboard Sekolah', 'Tambah Siswa'],
    });
  },

  createSiswa: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;
    const { nisn, nama, orang_tua, kategori_alergi, deskripsi_alergi } = req.body;

    try {
      let foto_siswa = null;

      if (req.file) {
        const { data, error: uploadError } = await supabase.storage
          .from('foto-siswa')
          .upload(`siswa/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: req.file.mimetype,
          });

        if (uploadError) throw uploadError;
        foto_siswa = supabase.storage.from('foto-siswa').getPublicUrl(data.path).data.publicUrl;
      }

      const { error } = await supabase.from('siswa').insert([
        {
          nisn,
          nama,
          sekolah_id: sekolahId,
          orang_tua,
          kategori_alergi,
          deskripsi_alergi,
          foto_siswa,
        },
      ]);

      if (error) throw error;

      res.redirect('/user-sekolah/siswa');
    } catch (err) {
      console.error(err);
      res.send('Gagal menambah siswa: ' + err.message);
    }
  },

  editSiswaForm: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;
    const { id } = req.params;

    try {
      const { data: siswa, error } = await supabase
        .from('siswa')
        .select('*')
        .eq('nisn', id)
        .eq('sekolah_id', sekolahId)
        .single();

      if (error) throw error;

      res.render('usersekolah/edit_siswa', {
        user: req.session.user,
        siswa,
        pageTitle: 'Edit Siswa',
        pageCrumb: 'Siswa',
        breadcrumb: ['Dashboard Sekolah', 'Edit Siswa'],
      });
    } catch (err) {
      res.send('Gagal memuat data siswa: ' + err.message);
    }
  },

  updateSiswa: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;
    const { id } = req.params;
    const { nama, orang_tua, kategori_alergi, deskripsi_alergi, foto_lama } = req.body;

    try {
      let updateData = {
        nama,
        orang_tua,
        kategori_alergi,
        deskripsi_alergi,
        foto_siswa: foto_lama,
      };

      if (req.file) {
        const { data, error: uploadError } = await supabase.storage
          .from('foto-siswa')
          .upload(`siswa/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: req.file.mimetype,
          });

        if (uploadError) throw uploadError;
        updateData.foto_siswa = supabase.storage.from('foto-siswa').getPublicUrl(data.path).data.publicUrl;
      }

      const { error } = await supabase
        .from('siswa')
        .update(updateData)
        .eq('nisn', id)
        .eq('sekolah_id', sekolahId);

      if (error) throw error;

      res.redirect('/user-sekolah/siswa');
    } catch (err) {
      res.send('Gagal mengupdate siswa: ' + err.message);
    }
  },

  deleteSiswa: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;
    const { id } = req.params;

    try {
      const { error } = await supabase
        .from('siswa')
        .delete()
        .eq('nisn', id)
        .eq('sekolah_id', sekolahId);

      if (error) throw error;

      res.redirect('/user-sekolah/siswa');
    } catch (err) {
      res.send('Gagal menghapus siswa: ' + err.message);
    }
  },

  editSekolahForm: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;

    try {
      const { data: sekolah, error } = await supabase
        .from('sekolah')
        .select('*')
        .eq('id_sekolah', sekolahId)
        .single();

      if (error) throw error;

      res.render('usersekolah/edit_sekolah', {
        user: req.session.user,
        sekolah,
        pageTitle: 'Edit Data Sekolah',
        breadcrumb: ['Dashboard Sekolah', 'Edit Sekolah'],
      });
    } catch (err) {
      res.send('Gagal memuat data sekolah: ' + err.message);
    }
  },

  updateSekolah: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;
    const { nama_sekolah, kota, provinsi, alamat, telpon_sekolah, email_sekolah, foto_lama } = req.body;

    try {
      let updateData = {
        nama_sekolah,
        kota,
        provinsi,
        alamat,
        telpon_sekolah,
        email_sekolah,
        foto_sekolah: foto_lama,
      };

      if (req.file) {
        const { data, error: uploadError } = await supabase.storage
          .from('foto-sekolah')
          .upload(`sekolah/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: req.file.mimetype,
          });

        if (uploadError) throw uploadError;
        updateData.foto_sekolah = supabase.storage.from('foto-sekolah').getPublicUrl(data.path).data.publicUrl;
      }

      const { error } = await supabase
        .from('sekolah')
        .update(updateData)
        .eq('id_sekolah', sekolahId);

      if (error) throw error;

      res.redirect('/user-sekolah');
    } catch (err) {
      res.send('Gagal mengupdate data sekolah: ' + err.message);
    }
  },


};

module.exports = userSekolahController;
