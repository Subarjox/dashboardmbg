// controllers/sekolahController.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sekolahController = {
  getAll: async (req, res) => {
    const { data, error } = await supabase
      .from('sekolah')
      .select(`
        *,
        satuan_gizi(id_sppg, nama_sppg)
      `); 

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

  getAllAjax: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
  
      const search = req.query.search || '';
      const provinsi = req.query.provinsi || '';
      const kota = req.query.kota || '';
      const status = req.query.status || '';
  
      let query = supabase
      .from('sekolah')
      .select(`
        *,
        satuan_gizi(nama_sppg)
      `, { count: 'exact' });
  
      if (search) query = query.ilike('nama_sekolah', `%${search}%`);
      if (provinsi) query = query.eq('provinsi', provinsi);
      if (kota) query = query.eq('kota', kota);
      if (status) query = query.eq('status_sistem', status);
  
      query = query.range(from, to).order('kasus_keracunan', { ascending: false }).order('status_sistem', { ascending: false }).order('id_sekolah', { ascending: true });
  
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
      .from('sekolah')
      .select(`
        *,
        satuan_gizi(id_sppg, nama_sppg)
      `)
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

  addForm: async (req, res) => {
    const { data: sppgList, error } = await supabase
      .from('satuan_gizi')
      .select('id_sppg, nama_sppg');

    res.render('sekolah/tambah_sekolah', {
      user: req.session.user,
      sppgList: sppgList || [],
      pageTitle: 'Tambah Sekolah',
      pageCrumb: 'Sekolah',
      breadcrumb: ['Dashboard', 'Sekolah', 'Tambah'],
    });
  },

  create: async (req, res) => {
    try {
      const {
        id_sekolah,
        nama_sekolah,
        kota,
        provinsi,
        jumlah_siswa,
        status_sistem,
        telpon_sekolah,
        alamat,
        kasus_keracunan,
        email_sekolah,
        id_sppg
      } = req.body;
  
      const { data: existingEmail, error: emailError } = await supabase
        .from('sekolah')
        .select('email_sekolah')
        .eq('email_sekolah', email_sekolah)
        .limit(1);
  
      if (emailError) {
        console.error('Gagal cek email:', emailError.message);
        return res.send('Terjadi kesalahan saat memeriksa email.');
      }
  
      if (existingEmail && existingEmail.length > 0) {
        return res.render('sekolah/tambah_sekolah', {
          user: req.session.user,
          sppgList: [],
          pageTitle: 'Tambah Sekolah',
          pageCrumb: 'Sekolah',
          breadcrumb: ['Dashboard', 'Sekolah', 'Tambah'],
          error: 'Email sudah digunakan! Gunakan email lain.',
        });
      }

      let foto_sekolah = null;
      if (req.file) {
        const { data, error: uploadError } = await supabase.storage
          .from('foto-sekolah')
          .upload(`sekolah/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: req.file.mimetype,
          });
  
        if (uploadError)
          return res.send('Gagal upload foto sekolah: ' + uploadError.message);
  
        foto_sekolah = supabase.storage
          .from('foto-sekolah')
          .getPublicUrl(data.path).data.publicUrl;
      }

      const insertData = {
        id_sekolah,
        password_sekolah: id_sekolah,
        nama_sekolah,
        kota,
        provinsi,
        alamat,
        email_sekolah,
        id_sppg: parseInt(id_sppg),
        jumlah_siswa: parseInt(jumlah_siswa) || 0,
        telpon_sekolah: telpon_sekolah || '',
        status_sistem: status_sistem || 'aktif',
        kasus_keracunan: kasus_keracunan || 'aman',
        foto_sekolah: foto_sekolah || null,
      };
  
      const { error } = await supabase.from('sekolah').insert([insertData]);
      if (error) {
        console.error(error);
        return res.send('Gagal menambah sekolah: ' + error.message);
      }
  
      res.redirect('/sekolah');
  
    } catch (err) {
      console.error('Error:', err.message);
      res.send('Terjadi kesalahan server: ' + err.message);
    }
  },

  editForm: async (req, res) => {
    const { id } = req.params;

    const { data: sekolah, error } = await supabase
      .from('sekolah')
      .select('*')
      .eq('id_sekolah', id)
      .single();

    const { data: sppgList } = await supabase
      .from('satuan_gizi')
      .select('id_sppg, nama_sppg');

    if (error) return res.send('Gagal memuat data sekolah: ' + error.message);

    res.render('sekolah/update_sekolah', {
      user: req.session.user,
      sekolah,
      sppgList,
      pageCrumb: 'Sekolah',
      pageTitle: 'Edit Sekolah',
      breadcrumb: ['Dashboard', 'Sekolah', 'Edit'],
    });
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        nama_sekolah,
        kota,
        provinsi,
        jumlah_siswa,
        status_sistem,
        alamat,
        telpon_sekolah,
        id_sppg,
        email_sekolah,
        foto_lama
      } = req.body;
  
      const { data: existingEmail, error: emailError } = await supabase
        .from('sekolah')
        .select('id_sekolah, email_sekolah')
        .eq('email_sekolah', email_sekolah)
        .neq('id_sekolah', id) 
        .limit(1);
  
      if (emailError) {
        console.error('Gagal cek email:', emailError.message);
        return res.send('Terjadi kesalahan saat memeriksa email.');
      }
  
      if (existingEmail && existingEmail.length > 0) {

        return res.render('sekolah/edit_sekolah', {
          user: req.session.user,
          error: 'Email sudah digunakan sekolah lain!',
          pageTitle: 'Edit Sekolah',
          pageCrumb: 'Sekolah',
          breadcrumb: ['Dashboard', 'Sekolah', 'Edit'],
          sekolah: {
            id_sekolah: id,
            nama_sekolah,
            kota,
            provinsi,
            jumlah_siswa,
            status_sistem,
            alamat,
            telpon_sekolah,
            id_sppg,
            email_sekolah,
            foto_sekolah: foto_lama,
          },
        });
      }

      let updateData = {
        nama_sekolah,
        kota,
        provinsi,
        jumlah_siswa: parseInt(jumlah_siswa) || 0,
        status_sistem,
        alamat,
        telpon_sekolah,
        email_sekolah,
        id_sppg: parseInt(id_sppg),
        foto_sekolah: foto_lama,
      };

      console.log(updateData);
  
      if (req.file) {
        const { data, error: uploadError } = await supabase.storage
          .from('foto-sekolah')
          .upload(`sekolah/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: req.file.mimetype,
          });
  
        if (uploadError)
          return res.send('Gagal upload foto baru: ' + uploadError.message);
  
        updateData.foto_sekolah = supabase.storage
          .from('foto-sekolah')
          .getPublicUrl(data.path).data.publicUrl;
      }
      const { error } = await supabase
        .from('sekolah')
        .update(updateData)
        .eq('id_sekolah', id);
  
      if (error) {
        console.error(error);
        return res.send('Gagal mengupdate sekolah: ' + error.message);
      }
  
      res.redirect('/sekolah');
  
    } catch (err) {
      console.error('Error:', err.message);
      res.send('Terjadi kesalahan server: ' + err.message);
    }
  },

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
