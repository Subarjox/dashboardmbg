const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const bcrypt = require('bcrypt');

const sppgController = {
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
      message: req.session.flash?.message || null,
      type: req.session.flash?.type || null,
      kotaList,
      pageTitle: 'Daftar SPPG',
      pageCrumb: 'SPPG',
      breadcrumb: ['Dashboard', 'SPPG'],
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

      let query = supabase
        .from('satuan_gizi')
        .select('*', { count: 'exact' });

      if (search) query = query.ilike('nama_sppg', `%${search}%`);
      if (provinsi) query = query.eq('provinsi_sppg', provinsi);
      if (kota) query = query.eq('kota_sppg', kota);

      query = query.range(from, to).order('id_sppg', { ascending: true });

      const { data, count, error } = await query;

      if (error) return res.json({ error: error.message });
      if (!data) return res.json({ data: [], currentPage: page, totalPages: 0, totalData: 0 });

      const sppgWithCount = await Promise.all(
        data.map(async (sppg) => {
          const { count: sekolahCount, error: sekolahError } = await supabase
            .from('sekolah')
            .select('*', { count: 'exact', head: true })
            .eq('id_sppg', sppg.id_sppg);

          if (sekolahError) {
            console.error('Error menghitung sekolah:', sekolahError.message);
          }

          return {
            ...sppg,
            jumlah_sekolah: sekolahCount || 0,
          };
        })
      );

      res.json({
        data: sppgWithCount,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalData: count,
      });
    } catch (err) {
      res.json({ error: err.message });
    }
  },

  getOne: async (req, res) => {
    try {
      const { id } = req.params;

      const { data: sppg, error } = await supabase
        .from('satuan_gizi')
        .select('*')
        .eq('id_sppg', id)
        .single();

      if (error || !sppg) {
        console.error(error);
        return res.send('SPPG tidak ditemukan.');
      }

      const { count, error: countError } = await supabase
        .from('sekolah')
        .select('id_sppg', { count: 'exact' })
        .eq('id_sppg', id);

      if (countError) {
        console.error(countError);
        return res.send('Gagal menghitung jumlah sekolah.');
      }

      res.render('sppg/detail_sppg', {
        user: req.session.user,
        sppg,
        jumlah_sekolah: count || 0,
        pageTitle: 'Detail SPPG',
        pageCrumb: 'SPPG',
        breadcrumb: ['Dashboard', 'SPPG', 'Detail'],
      });
    } catch (err) {
      console.error('Error getOne SPPG:', err);
      res.send('Terjadi kesalahan server.');
    }
  },

  addForm: async (req, res) => {
    res.render('sppg/tambah_sppg', {
      user: req.session.user,
      pageTitle: 'Tambah SPPG',
      pageCrumb: 'SPPG',
      breadcrumb: ['Dashboard', 'SPPG', 'Tambah'],
    });
  },

  create: async (req, res) => {
    try {
      const {
        id_sppg,
        nama_sppg,
        kota_sppg,
        email_sppg,
        pemilik_sppg,
        provinsi_sppg,
        alamat_sppg,
        no_telpon_sppg
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

        if (uploadError) throw uploadError;

        foto_sppg = supabase
          .storage
          .from('foto-sppg')
          .getPublicUrl(data.path).data.publicUrl;
      }

      const password_sppg = await bcrypt.hash(id_sppg, 10);

      const insertData = {
        id_sppg,
        password_sppg,
        nama_sppg,
        email_sppg,
        kota_sppg,
        pemilik_sppg,
        provinsi_sppg,
        status_sppg: 'aktif',
        alamat_sppg,
        no_telpon_sppg,
        foto_sppg
      };

      const { error } = await supabase
        .from('satuan_gizi')
        .insert([insertData]);

      if (error) throw error;

      req.session.flash = {
        type: 'success',
        message: 'SPPG berhasil ditambahkan',
      };

      res.redirect('/sppg');

    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message || 'Gagal menambahkan SPPG',
      };
      res.redirect('/sppg');
    }
  },


  editForm: async (req, res) => {
    const { id } = req.params;
    const { data: sppg, error } = await supabase
      .from('satuan_gizi')
      .select('*')
      .eq('id_sppg', id)
      .single();

    if (error) return res.send('Gagal memuat data SPPG: ' + error.message);
    const { count, error: countError } = await supabase
      .from('sekolah')
      .select('id_sppg', { count: 'exact' })
      .eq('id_sppg', id);

    if (countError) {
      console.error(countError);
      return res.send('Gagal menghitung jumlah sekolah.');
    }

    res.render('sppg/update_sppg', {
      user: req.session.user,
      sppg,
      jumlah_sekolah: count || 0,
      pageCrumb: 'SPPG',
      pageTitle: 'Edit SPPG',
      breadcrumb: ['Dashboard', 'SPPG', 'Edit'],
    });
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        nama_sppg,
        kota_sppg,
        provinsi_sppg,
        pemilik_sppg,
        alamat_sppg,
        status_sppg,
        no_telpon_sppg,
        foto_lama
      } = req.body;

      let updateData = {
        nama_sppg,
        kota_sppg,
        provinsi_sppg,
        pemilik_sppg,
        alamat_sppg,
        status_sppg,
        no_telpon_sppg,
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

        if (uploadError) throw uploadError;

        updateData.foto_sppg = supabase
          .storage
          .from('foto-sppg')
          .getPublicUrl(data.path).data.publicUrl;
      }

      const { error } = await supabase
        .from('satuan_gizi')
        .update(updateData)
        .eq('id_sppg', id);

      if (error) throw error;

      req.session.flash = {
        type: 'success',
        message: 'SPPG berhasil diperbarui',
      };

      res.redirect('/sppg');

    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message || 'Gagal memperbarui SPPG',
      };
      res.redirect('/sppg');
    }
  },


  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('satuan_gizi')
        .delete()
        .eq('id_sppg', id);

      if (error) throw error;

      req.session.flash = {
        type: 'success',
        message: 'SPPG berhasil dihapus',
      };

      res.redirect('/sppg');

    } catch (err) {
      req.session.flash = {
        type: 'error',
        message: err.message || 'Gagal menghapus SPPG',
      };
      res.redirect('/sppg');
    }
  },

};

module.exports = sppgController;
