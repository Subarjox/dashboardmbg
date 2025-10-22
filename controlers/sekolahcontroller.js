// controllers/sekolahController.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sekolahController = {
  // 📘 READ: semua sekolah
  getAll: async (req, res) => {
    const { data, error } = await supabase
      .from('sekolah')
      .select('*');

    if (error) return res.render('sekolah/sekolah', { error: error.message });
    const provinsiList = [...new Set(data.map(s => s.provinsi))];
    const kotaList = [...new Set(data.map(s => s.kota))];

    res.render('sekolah/sekolah', {
      user: req.session.user,
      sekolah: data,
      provinsiList,
      kotaList,
      pageTitle: 'Daftar Sekolah',
      pageCrumb: 'Sekolah',
      breadcrumb: ['Dashboard', 'Sekolah'],
    });
  },

  //AJAX - Pagination
  getAllAjax: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10; // data per halaman
      const from = (page - 1) * limit;
      const to = from + limit - 1;
  
      const search = req.query.search || '';
      const provinsi = req.query.provinsi || '';
      const kota = req.query.kota || '';
      const status = req.query.status || '';
  
      // Build query
      let query = supabase.from('sekolah').select('*', { count: 'exact' });
  
      if (search) query = query.ilike('nama_sekolah', `%${search}%`);
      if (provinsi) query = query.eq('provinsi', provinsi);
      if (kota) query = query.eq('kota', kota);
      if (status) query = query.eq('status_sistem', status);
  
      // Range dan order
      query = query.range(from, to).order('id_sekolah', { ascending: true });
  
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

  // 📗 READ: detail sekolah
  getOne: async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('sekolah')
      .select('*')
      .eq('id_sekolah', id)
      .single();

    if (error) return res.send('Error: ' + error.message);

    res.render('sekolah/detail_sekolah', {
      user: req.session.user,
      sekolah: data,
      pageTitle: 'Detail Sekolah',
      pageCrumb: 'Sekolah',
      breadcrumb: ['Dashboard', 'Sekolah', 'Detail'],
    });
  },

  // 📙 FORM TAMBAH SEKOLAH
  addForm: async (req, res) => {
    res.render('sekolah/tambah_sekolah', {
      user: req.session.user,
      pageTitle: 'Tambah Sekolah',
      pageCrumb: 'Sekolah',
      breadcrumb: ['Dashboard', 'Sekolah', 'Tambah'],
    });
  },

  // 🟢 CREATE SEKOLAH BARU
  create: async (req, res) => {
    const {
      id_sekolah,
      nama_sekolah,
      kota,
      provinsi,
      jumlah_siswa,
      status_sistem,
      telpon_sekolah,
      alamat
    } = req.body;

    let foto_sekolah = null;
    console.log(req.body);
     console.log(req.file);

    if (req.file) {
      console.log('File upload detected:', req.file.originalname);

      const { data, error: uploadError } = await supabase.storage
        .from('foto-sekolah')
        .upload(`sekolah/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: req.file.mimetype,
        });

      if (uploadError) return res.send('Gagal upload foto sekolah: ' + uploadError.message);

      foto_sekolah = supabase.storage.from('foto-sekolah').getPublicUrl(data.path).data.publicUrl;
    }
    
    const insertData = {
      id_sekolah,
      nama_sekolah,
      kota,
      provinsi,
      alamat,
      jumlah_siswa: parseInt(jumlah_siswa) || 0,
      telpon_sekolah: telpon_sekolah || '',
      status_sistem: status_sistem || 'aktif',
      foto_sekolah: foto_sekolah || null
    };
    
    const { error } = await supabase.from('sekolah').insert([insertData]);
    
    if (error) return res.send('Gagal menambah sekolah: ' + error.message);
    res.redirect('/sekolah');
  },

  // 🟡 FORM EDIT SEKOLAH
  editForm: async (req, res) => {
    const { id } = req.params;
    const { data: sekolah, error } = await supabase.from('sekolah')
      .select('*')
      .eq('id_sekolah', id)
      .single();

    if (error) return res.send('Gagal memuat data sekolah: ' + error.message);

    res.render('sekolah/update_sekolah', {
      user: req.session.user,
      sekolah,
      pageCrumb: 'Sekolah',
      pageTitle: 'Edit Sekolah',
      breadcrumb: ['Dashboard', 'Sekolah', 'Edit'],
    });
  },

  // 🧩 UPDATE SEKOLAH
  update: async (req, res) => {
    const { id } = req.params;
    const {
      nama_sekolah,
      kota,
      provinsi,
      jumlah_siswa,
      status_sistem,
      alamat,
      telpon_sekolah,
      foto_lama
    } = req.body;

    let updateData = {
      nama_sekolah,
      kota,
      provinsi,
      jumlah_siswa,
      status_sistem,
      alamat,
      telpon_sekolah,
      foto_sekolah: foto_lama
    };

    if (req.file) {
      console.log('File baru upload detected:', req.file.originalname);

      const { data, error: uploadError } = await supabase.storage
        .from('foto-sekolah')
        .upload(`sekolah/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: req.file.mimetype,
        });

      if (uploadError) return res.send('Gagal upload foto baru: ' + uploadError.message);

      updateData.foto_sekolah = supabase.storage.from('foto-sekolah').getPublicUrl(data.path).data.publicUrl;
    }

    const { error } = await supabase.from('sekolah')
      .update(updateData)
      .eq('id_sekolah', id);

    if (error) return res.send('Gagal mengupdate sekolah: ' + error.message);
    res.redirect('/sekolah');
  },

  // 🔴 DELETE SEKOLAH
  delete: async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('sekolah')
      .delete()
      .eq('id_sekolah', id);

    if (error) return res.send('Gagal menghapus sekolah: ' + error.message);
    res.redirect('/sekolah');
  },
};

module.exports = sekolahController;
