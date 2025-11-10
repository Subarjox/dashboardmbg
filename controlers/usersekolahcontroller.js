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

      // Ambil siswa milik sekolah tersebut
      const { data: siswa, error: siswaError } = await supabase
        .from('siswa')
        .select('*')
        .eq('sekolah_id', sekolahId);

      if (siswaError) throw siswaError;

      res.render('usersekolah/dashboard', {
        user: req.session.user,
        sekolah,
        siswa,
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
        .select('*')
        .eq('sekolah_id', sekolahId);

      if (error) throw error;

      res.render('usersekolah/siswa', {
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

  // ➕ Form tambah siswa
  addSiswaForm: async (req, res) => {
    res.render('usersekolah/tambah_siswa', {
      user: req.session.user,
      pageTitle: 'Tambah Siswa',
      pageCrumb: 'Siswa',
      breadcrumb: ['Dashboard Sekolah', 'Tambah Siswa'],
    });
  },

  // 🧩 Tambah siswa baru
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

  // ✏️ Edit siswa
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

  // 🗑️ Hapus siswa (dibolehkan)
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

  // ⚙️ Edit data sekolah sendiri (tidak bisa hapus)
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
