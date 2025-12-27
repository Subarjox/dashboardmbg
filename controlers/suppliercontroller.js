const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supplierController = {

  getAll: async (req, res) => {
    const { data, error } = await supabase
      .from('supplier')
      .select('*')
      .order('id_supplier', { ascending: true });

    if (error) {
      console.error(error);
      return res.render('supplier/supplier', { error: error.message });
    }

    res.render('supplier/supplier', {
      user: req.session.user,
      supplier: data,
      pageCrumb: 'Supplier',
      pageTitle: 'Daftar Supplier',
      breadcrumb: ['Dashboard', 'Supplier'],
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
        .from('supplier')
        .select('id_supplier, nama_supplier, provinsi_supplier, kota_supplier, jenis_makanan, rating, foto_supplier, no_telp, alamat_supplier, nama_pemilik', { count: 'exact' });

      if (search) query = query.ilike('nama_supplier', `%${search}%`);
      if (provinsi) query = query.eq('provinsi_supplier', provinsi);

      query = query.range(from, to).order('id_supplier', { ascending: true });

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
      .from('supplier')
      .select('*')
      .eq('id_supplier', id)
      .single();

    if (error) return res.send('Error: ' + error.message);

    res.render('supplier/detail_supplier', {
      user: req.session.user,
      supplier: data,
      pageTitle: 'Detail Supplier',
      pageCrumb: 'Supplier',
      breadcrumb: ['Dashboard', 'Supplier', 'Detail'],
    });
  },

  addForm: async (req, res) => {
    res.render('supplier/tambah_supplier', {
      user: req.session.user,
      pageTitle: 'Tambah Supplier',
      pageCrumb: 'Supplier',
      breadcrumb: ['Dashboard', 'Supplier', 'Tambah'],
    });
  },

  create: async (req, res) => {
    const { id_supplier, nama_supplier, provinsi_supplier, kota_supplier, jenis_makanan, rating, no_telp, alamat_supplier, nama_pemilik } = req.body;
    let foto_supplier = null;

    if (req.file) {
      const { data, error: uploadError } = await supabase.storage
        .from('foto-supplier')
        .upload(`supplier/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: req.file.mimetype,
        });

      if (uploadError) return res.send('Gagal upload foto: ' + uploadError.message);

      foto_supplier = supabase.storage.from('foto-supplier').getPublicUrl(data.path).data.publicUrl;
    }

    const { error } = await supabase.from('supplier').insert([
      { id_supplier, nama_supplier, provinsi_supplier, kota_supplier, jenis_makanan, rating, foto_supplier, no_telp, alamat_supplier, nama_pemilik },
    ]);

    if (error) return res.send('Gagal menambah supplier: ' + error.message);

    res.redirect('/supplier');
  },


  editForm: async (req, res) => {
    const { id } = req.params;
    const { data: supplier, error } = await supabase.from('supplier').select('*').eq('id_supplier', id).single();

    if (error) return res.send('Gagal memuat data supplier: ' + error.message);

    res.render('supplier/update_supplier', {
      user: req.session.user,
      supplier,
      pageCrumb: 'Supplier',
      pageTitle: 'Edit Supplier',
      breadcrumb: ['Dashboard', 'Supplier', 'Edit'],
    });
  },

  update: async (req, res) => {
    const { id } = req.params;
    const { nama_supplier, provinsi_supplier, kota_supplier, jenis_makanan, rating, no_telp, alamat_supplier, nama_pemilik, foto_lama } = req.body;

    let updateData = {
      nama_supplier,
      provinsi_supplier,
      kota_supplier,
      jenis_makanan,
      rating,
      no_telp,
      alamat_supplier,
      nama_pemilik,
      foto_supplier: foto_lama,
    };

    if (req.file) {
      const { data, error: uploadError } = await supabase.storage
        .from('foto-supplier')
        .upload(`supplier/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: req.file.mimetype,
        });

      if (uploadError) return res.send('Gagal upload foto baru: ' + uploadError.message);

      updateData.foto_supplier = supabase.storage.from('foto-supplier').getPublicUrl(data.path).data.publicUrl;
    }

    const { error } = await supabase.from('supplier').update(updateData).eq('id_supplier', id);
    if (error) return res.send('Gagal mengupdate supplier: ' + error.message);

    res.redirect('/supplier');
  },

  delete: async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('supplier').delete().eq('id_supplier', id);

    if (error) return res.send('Gagal menghapus supplier: ' + error.message);

    res.redirect('/supplier');
  },
};

module.exports = supplierController;
