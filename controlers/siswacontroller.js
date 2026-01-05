const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const siswaController = {

  getAll: async (req, res) => {
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
      `);

    if (error) {
      console.error(error);
      return res.render('siswa/siswa', { error: error.message });
    }

    res.render('siswa/siswa', {
      user: req.session.user,
      siswa: data,
      message: req.session.flash?.message || null,
      type: req.session.flash?.type || null,
      pageTitle: 'Daftar Siswa',
      pageCrumb: 'Siswa',
      breadcrumb: ['Dashboard', 'Siswa'],
    });
  },

  getAllAjax: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const search = req.query.search || '';
      const provinsi = req.query.provinsi || '';

      let query = supabase
        .from('siswa')
        .select(`
          nisn,
          nama,
          orang_tua,
          kategori_alergi,
          deskripsi_alergi,
          foto_siswa,
          sekolah:sekolah_id(nama_sekolah, kota, provinsi)
        `, { count: 'exact' });

      if (search) query = query.ilike('nama', `%${search}%`);
      if (provinsi) query = query.eq('sekolah.provinsi', provinsi);

      query = query.range(from, to).order('nisn', { ascending: true });

      const { data, count, error } = await query;
      if (error) return res.json({ error: error.message });

      res.json({
        data,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalData: count,
      });

    } catch (err) {
      res.json({ error: err.message });
    }
  },

  getOne: async (req, res) => {
    const { id } = req.params;

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
      .eq('nisn', id)
      .single();

    if (error) {
      console.error(error);
      return res.send('Error: ' + error.message);
    }

    res.render('siswa/detail_siswa', {
      user: req.session.user,
      siswa: data,
      pageTitle: 'Detail Siswa',
      pageCrumb: 'Siswa',
      breadcrumb: ['Dashboard', 'Siswa', 'Detail'],
    });
  },

  addForm: async (req, res) => {
    const { data: sekolah, error } = await supabase.from('sekolah').select('*');
    if (error) return res.send('Error: ' + error.message);

    res.render('siswa/tambah_siswa', {
      user: req.session.user,
      sekolah,
      pageTitle: 'Tambah Siswa',
      pageCrumb: 'Siswa',
      breadcrumb: ['Dashboard', 'Siswa', 'Tambah'],
    });
  },

  create: async (req, res) => {
    const { nisn, nama, sekolah_id, orangtua, kategori_alergi, deskripsi_alergi } = req.body;

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

        if (uploadError) return res.send('Gagal upload foto: ' + uploadError.message);

        foto_siswa = supabase
          .storage
          .from('foto-siswa')
          .getPublicUrl(data.path).data.publicUrl;
      }

      const { error } = await supabase.from('siswa').insert([{
        nisn,
        nama,
        sekolah_id,
        orang_tua: orangtua,
        kategori_alergi,
        deskripsi_alergi,
        foto_siswa,
      }]);

      if (error) throw error;

      req.session.flash = {
        type: 'success',
        message: 'Siswa berhasil ditambahkan',
      };

      req.session.save(() => {
        res.redirect('/siswa');
      });

    } catch (err) {
      console.error(err);

      req.session.flash = {
        type: 'error',
        message: 'Siswa gagal ditambahkan',
      };

      req.session.save(() => {
        res.redirect('/siswa');
      });
    }
  },

  editForm: async (req, res) => {
    const { id } = req.params;

    const { data: siswa, error } = await supabase
      .from('siswa')
      .select('*')
      .eq('nisn', id)
      .single();

    const { data: sekolah } = await supabase.from('sekolah').select('*');

    if (error) return res.send('Gagal memuat data siswa: ' + error.message);

    res.render('siswa/update_siswa', {
      user: req.session.user,
      siswa,
      sekolah,
      pageTitle: 'Edit Siswa',
      pageCrumb: 'Siswa',
      breadcrumb: ['Dashboard', 'Siswa', 'Edit'],
    });
  },

  update: async (req, res) => {
    const { id } = req.params;
    const { nama, sekolah_id, orangtua, kategori_alergi, deskripsi_alergi, foto_lama } = req.body;

    try {
      let updateData = {
        nama,
        sekolah_id,
        orang_tua: orangtua,
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

        if (uploadError) return res.send('Gagal upload foto baru: ' + uploadError.message);

        updateData.foto_siswa = supabase
          .storage
          .from('foto-siswa')
          .getPublicUrl(data.path).data.publicUrl;
      }

      const { error } = await supabase
        .from('siswa')
        .update(updateData)
        .eq('nisn', id);

      if (error) throw error;

      req.session.flash = {
        type: 'success',
        message: 'Siswa berhasil diupdate',
      };

      req.session.save(() => {
        res.redirect('/siswa');
      });

    } catch (err) {
      console.error(err);

      req.session.flash = {
        type: 'error',
        message: 'Siswa gagal diupdate',
      };

      req.session.save(() => {
        res.redirect('/siswa');
      });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('siswa')
        .delete()
        .eq('nisn', id);

      if (error) throw error;

      req.session.flash = {
        type: 'success',
        message: 'Siswa berhasil dihapus',
      };

      req.session.save(() => {
        res.redirect('/siswa');
      });

    } catch (err) {
      console.error(err);

      req.session.flash = {
        type: 'error',
        message: 'Siswa gagal dihapus',
      };

      req.session.save(() => {
        res.redirect('/siswa');
      });
    }
  },
};

module.exports = siswaController;
