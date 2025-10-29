// controllers/sppgController.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sppgController = {
  // 📘 READ: semua SPPG
  getAll: async (req, res) => {
    const { data, error } = await supabase
      .from('satuan_gizi')
      .select('*')
      .order('id_sppg', { ascending: true });

    if (error) return res.render('sppg/sppg', { error: error.message });

    const provinsiList = [...new Set(data.map(s => s.provinsi_sppg))];
    const kotaList = [...new Set(data.map(s => s.kota_sppg))];

    res.render('sppg/sppg', {
      user: req.session.user,
      sppg: data,
      provinsiList,
      kotaList,
      pageTitle: 'Daftar SPPG',
      pageCrumb: 'SPPG',
      breadcrumb: ['Dashboard', 'SPPG'],
    });
  },

  // ⚡ AJAX - Pagination, Search, Filter
  getAllAjax: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const search = req.query.search || '';
      const provinsi = req.query.provinsi || '';
      const kota = req.query.kota || '';

      let query = supabase
        .from('satuan_gizi')
        .select('*', { count: 'exact' });

      if (search) query = query.ilike('nama_sppg', `%${search}%`);
      if (provinsi) query = query.eq('provinsi_sppg', provinsi);
      if (kota) query = query.eq('kota_sppg', kota);

      query = query.range(from, to).order('id_sppg', { ascending: true });

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

  // 📗 READ: detail satu SPPG
  getOne: async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('satuan_gizi')
      .select('*')
      .eq('id_sppg', id)
      .single();

    if (error) return res.send('Error: ' + error.message);

    res.render('sppg/detail_sppg', {
      user: req.session.user,
      sppg: data,
      pageTitle: 'Detail SPPG',
      pageCrumb: 'SPPG',
      breadcrumb: ['Dashboard', 'SPPG', 'Detail'],
    });
  },

  // 📙 FORM TAMBAH SPPG
  addForm: async (req, res) => {
    res.render('sppg/tambah_sppg', {
      user: req.session.user,
      pageTitle: 'Tambah SPPG',
      pageCrumb: 'SPPG',
      breadcrumb: ['Dashboard', 'SPPG', 'Tambah'],
    });
  },

  // 🟢 CREATE SPPG BARU
  create: async (req, res) => {
    const {
      id_sppg,
      nama_sppg,
      kota_sppg,
      provinsi_sppg,
      alamat_sppg,
      no_telp_sppg
    } = req.body;

    let foto_sppg = null;
    if (req.file) {
      const { data, error: uploadError } = await supabase.storage
        .from('foto-sppg')
        .upload(`sppg/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: req.file.mimetype,
        });

      if (uploadError)
        return res.send('Gagal upload foto SPPG: ' + uploadError.message);

      foto_sppg = supabase.storage.from('foto-sppg').getPublicUrl(data.path).data.publicUrl;
    }

    const insertData = {
      id_sppg,
      nama_sppg,
      kota_sppg,
      provinsi_sppg,
      alamat_sppg,
      no_telp_sppg,
      foto_sppg: foto_sppg || null
    };

    const { error } = await supabase.from('satuan_gizi').insert([insertData]);
    if (error) return res.send('Gagal menambah SPPG: ' + error.message);
    res.redirect('/sppg');
  },

  // 🟡 FORM EDIT SPPG
  editForm: async (req, res) => {
    const { id } = req.params;
    const { data: sppg, error } = await supabase
      .from('satuan_gizi')
      .select('*')
      .eq('id_sppg', id)
      .single();

    if (error) return res.send('Gagal memuat data SPPG: ' + error.message);

    res.render('sppg/update_sppg', {
      user: req.session.user,
      sppg,
      pageCrumb: 'SPPG',
      pageTitle: 'Edit SPPG',
      breadcrumb: ['Dashboard', 'SPPG', 'Edit'],
    });
  },

  // 🧩 UPDATE SPPG
  update: async (req, res) => {
    const { id } = req.params;
    const {
      nama_sppg,
      kota_sppg,
      provinsi_sppg,
      alamat_sppg,
      no_telp_sppg,
      foto_lama
    } = req.body;

    let updateData = {
      nama_sppg,
      kota_sppg,
      provinsi_sppg,
      alamat_sppg,
      no_telp_sppg,
      foto_sppg: foto_lama
    };

    if (req.file) {
      const { data, error: uploadError } = await supabase.storage
        .from('foto-sppg')
        .upload(`sppg/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: req.file.mimetype,
        });

      if (uploadError)
        return res.send('Gagal upload foto baru: ' + uploadError.message);

      updateData.foto_sppg = supabase.storage.from('foto-sppg').getPublicUrl(data.path).data.publicUrl;
    }

    const { error } = await supabase
      .from('satuan_gizi')
      .update(updateData)
      .eq('id_sppg', id);

    if (error) return res.send('Gagal mengupdate SPPG: ' + error.message);
    res.redirect('/sppg');
  },

  // 🔴 DELETE SPPG
  delete: async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('satuan_gizi')
      .delete()
      .eq('id_sppg', id);

    if (error) return res.send('Gagal menghapus SPPG: ' + error.message);
    res.redirect('/sppg');
  },
};

module.exports = sppgController;
