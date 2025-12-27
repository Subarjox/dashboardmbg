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
      user: req.session.user, // untuk navbar
      siswa: data,
      pageTitle: 'Daftar Siswa',
      pageCrumb: 'Siswa',
      breadcrumb: ['Dashboard', 'Siswa'],
    });
  },

  getAllAjax: async (req, res) => {
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
        totalData: count
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

      foto_siswa = supabase.storage.from('foto-siswa').getPublicUrl(data.path).data.publicUrl;
    }

    const { error } = await supabase.from('siswa').insert([
      {
        nisn,
        nama,
        sekolah_id,
        orang_tua: orangtua,
        kategori_alergi,
        deskripsi_alergi,
        foto_siswa,
      },
    ]);

    if (error) return res.send('Gagal menambah siswa: ' + error.message);

    res.redirect('/siswa');
  },

  editForm: async (req, res) => {
    const { id } = req.params;
    const { data: siswa, error } = await supabase.from('siswa').select('*').eq('nisn', id).single();
    const { data: sekolah } = await supabase.from('sekolah').select('*');

    if (error) return res.send('Gagal memuat data siswa: ' + error.message);

    res.render('siswa/update_siswa', {
      user: req.session.user,
      siswa,
      sekolah,
      pageCrumb: 'Siswa',
      pageTitle: 'Edit Siswa',
      breadcrumb: ['Dashboard', 'Siswa', 'Edit'],
    });
  },

  update: async (req, res) => {
    const { id } = req.params;
    const { nama, sekolah_id, orangtua, kategori_alergi, deskripsi_alergi, foto_lama } = req.body;

    let updateData = {
      nama,
      sekolah_id,
      orang_tua: orangtua,
      kategori_alergi,
      deskripsi_alergi,
      foto_siswa: foto_lama, // default pakai foto lama
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

      updateData.foto_siswa = supabase.storage.from('foto-siswa').getPublicUrl(data.path).data.publicUrl;
    }

    const { error } = await supabase.from('siswa').update(updateData).eq('nisn', id);
    if (error) return res.send('Gagal mengupdate siswa: ' + error.message);

    res.redirect('/siswa');
  },

  delete: async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('siswa').delete().eq('nisn', id);

    if (error) return res.send('Gagal menghapus siswa: ' + error.message);

    res.redirect('/siswa');
  },
};

module.exports = siswaController;
