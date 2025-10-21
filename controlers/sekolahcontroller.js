const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sekolahController = {
  // READ
  getAll: async (req, res) => {
    const { data, error } = await supabase
      .from('sekolah')
      .select(`
        id_sekolah,
        nama_sekolah,
        kota,
        provinsi,
        jumlah_siswa,
        status_sistem,
        alamat,
        foto_sekolah
      `);
    if (error) return res.render('sekolah/sekolah', { error: error.message });

    res.render('sekolah/sekolah', {
      user: req.session.user,
      sekolah: data,
      pageTitle: 'Sekolah',
      pageCrumb: 'Sekolah',
      breadcrumb: ['Dashboard', 'Sekolah']
    });
  },

  getOne: async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('sekolah')
      .select(`
        id_sekolah,
        nama_sekolah,
        kota,
        provinsi,
        jumlah_siswa,
        status_sistem,
        alamat,
        foto_sekolah
      `)
      .eq('id_sekolah', id)
      .single();

    if (error) return res.send('Error: ' + error.message);
    res.render('sekolah/detail_sekolah', {
      user: req.session.user,
      sekolah: data,
      pageTitle: 'Detail Sekolah',
      pageCrumb: 'Sekolah',
      breadcrumb: ['Dashboard', 'Sekolah', 'Detail']
    });
  },

  // CREATE
  addForm: async (req, res) => {
    res.render('sekolah/tambah_sekolah', {
      user: req.session.user,
      pageTitle: 'Tambah Sekolah',
      pageCrumb: 'Sekolah',
      breadcrumb: ['Dashboard', 'Sekolah', 'Tambah']
    });
  },

  create: async (req, res) => {
    const {
      id_sekolah,
      nama_sekolah,
      kota,
      provinsi,
      jumlah_siswa,
      status_sistem,
      alamat
    } = req.body;

    let foto_sekolah = null;
    if (req.file) {
      const { data, error: uploadError } = await supabase.storage
        .from('foto-sekolah')
        .upload(`sekolah/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: req.file.mimetype
        });

      if (uploadError) return res.send('Gagal upload foto sekolah: ' + uploadError.message);

      foto_sekolah = supabase.storage
        .from('foto-sekolah')
        .getPublicUrl(data.path).data.publicUrl;
    }

    const { error } = await supabase
      .from('sekolah')
      .insert([{
        id_sekolah,
        nama_sekolah,
        kota,
        provinsi,
        jumlah_siswa,
        status_sistem,
        alamat,
        foto_sekolah
      }]);

    if (error) return res.send('Gagal menambah sekolah: ' + error.message);
    res.redirect('/sekolah');
  },

  // EDIT FORM
  editForm: async (req, res) => {
    const { id } = req.params;
    const { data: sekolah, error } = await supabase
      .from('sekolah')
      .select('*')
      .eq('id_sekolah', id)
      .single();

    if (error) return res.send('Gagal memuat data sekolah: ' + error.message);
    res.render('sekolah/update_sekolah', {
      user: req.session.user,
      sekolah,
      pageTitle: 'Edit Sekolah',
      pageCrumb: 'Sekolah',
      breadcrumb: ['Dashboard', 'Sekolah', 'Edit']
    });
  },

  // UPDATE PROCESS
  update: async (req, res) => {
    const { id } = req.params;
    const {
      nama_sekolah,
      kota,
      provinsi,
      jumlah_siswa,
      status_sistem,
      alamat,
      foto_lama
    } = req.body;

    let updateData = {
      nama_sekolah,
      kota,
      provinsi,
      jumlah_siswa,
      status_sistem,
      alamat,
      foto_sekolah: foto_lama
    };

    // Jika ada foto baru diupload
    if (req.file) {
      const { data, error: uploadError } = await supabase.storage
        .from('foto-sekolah')
        .upload(`sekolah/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: req.file.mimetype
        });

      if (uploadError) return res.send('Gagal upload foto baru: ' + uploadError.message);

      updateData.foto_sekolah = supabase.storage
        .from('foto-sekolah')
        .getPublicUrl(data.path).data.publicUrl;
    }

    const { error } = await supabase
      .from('sekolah')
      .update(updateData)
      .eq('id_sekolah', id);

    if (error) return res.send('Gagal mengupdate sekolah: ' + error.message);
    res.redirect('/sekolah');
  },

  // DELETE
  delete: async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from('sekolah')
      .delete()
      .eq('id_sekolah', id);

    if (error) return res.send('Gagal menghapus sekolah: ' + error.message);
    res.redirect('/sekolah');
  },
};

module.exports = sekolahController;

