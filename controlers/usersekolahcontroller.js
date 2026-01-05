const { createClient } = require('@supabase/supabase-js');
const { name } = require('ejs');
const { getLaporan } = require('./usersppgcontroller');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function canSendNotification(lastNotifyAt, cooldownMinutes = 10) {
  if (!lastNotifyAt) return true;

  const last = new Date(lastNotifyAt);
  const now = new Date();

  const diffMinutes = (now - last) / (1000 * 60);
  return diffMinutes >= cooldownMinutes;
}

async function SendNotification(sekolah, problem) {
  const webhookUrl = process.env.DISCORD_WARNING_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('⚠️ DISCORD_WARNING_WEBHOOK_URL not set, skipping notification.');
    return;
  }

  const problemConfig = {
    keracunan: {
      title: "⚠️ KERACUNAN NOTIFICATION",
      description: "Telah Terjadi Keracunan di Sekolah berikut",
      footer: "WARNING - Please Send Medical Team and Notify SPPG",
    },
    sistem: {
      title: "⚠️ SYSTEM DOWN NOTIFICATION",
      description: "Telah Terjadi kegagalan sistem di Sekolah berikut",
      footer: "WARNING - Please send developer team to fix the system",
    }
  };

  const config = problemConfig[problem];
  if (!config) {
    console.warn(`⚠️ Unknown problem: ${problem}, notification skipped`);
    return;
  }

  const embed = {
    title: config.title,
    color: 0xFF0000,
    description: config.description,
    fields: [
      { name: "NPSN", value: sekolah.id_sekolah || "Unknown", inline: true },
      { name: "NAMA SEKOLAH", value: sekolah.nama_sekolah || "Unknown", inline: true },
      { name: "ALAMAT", value: sekolah.alamat || "Unknown", inline: true },
      { name: "KOTA", value: sekolah.kota || "Unknown", inline: true },
      { name: "PROVINSI", value: sekolah.provinsi || "Unknown", inline: true },
      { name: "Time", value: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }), inline: false }
    ],
    footer: { text: config.footer },
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      console.error(`Failed to send Discord notification: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error sending Discord notification:", error);
  }
}


const userSekolahController = {

  //dashboard
  dashboard: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;

    try {
      const { data: sekolah, error: sekolahError } = await supabase
        .from('sekolah')
        .select('*')
        .eq('id_sekolah', sekolahId)
        .single();

      if (sekolahError) throw sekolahError;

      //data satuan gizi
      const { data: sppg, error: sppgError } = await supabase
        .from('satuan_gizi')
        .select('nama_sppg')
        .eq('id_sppg', sekolah.id_sppg)
        .single();

      if (sppgError) throw sppgError;

      //data menu makanan
      const { data: menu_makanan, error: menu_makananError } = await supabase
        .from('menu_makanan')
        .select('nama_makanan')
        .eq('id_sppg', sekolah.id_sppg)
        .limit(1)
        .single();

      //data siswa
      const { data: Siswa, error: TotalSiswaError } = await supabase
        .from('siswa')
        .select('kategori_alergi')
        .eq('sekolah_id', sekolahId);

      if (TotalSiswaError) throw TotalSiswaError;

      const TotalSiswa = Siswa.length;
      const SiswaAlergiBerat = Siswa.filter(i => i.kategori_alergi === 'berat').length;
      const SiswaAlergiRingan = Siswa.filter(i => i.kategori_alergi === 'ringan').length;
      const SiswaTanpaAlergi = Siswa.filter(i => i.kategori_alergi === 'tidak ada').length;


      res.render('users/pihak_sekolah/pihak_sekolah', {
        user: req.session.user,
        sekolah,
        TotalSiswa,
        SiswaAlergiBerat,
        SiswaAlergiRingan,
        SiswaTanpaAlergi,
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


  //siswa
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
        message: req.session.flash?.message || null,
        type: req.session.flash?.type || null,
        pageTitle: 'Siswa Saya',
        pageCrumb: 'Siswa',
        breadcrumb: ['Dashboard Sekolah', 'Siswa'],
      });
    } catch (err) {
      res.send('Error: ' + err.message);
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

    res.render('users/pihak_sekolah/detail_siswa_sekolah', {
      user: req.session.user,
      siswa: data,
      pageTitle: 'Detail Siswa',
      pageCrumb: 'Siswa',
      breadcrumb: ['Dashboard', 'Siswa', 'Detail'],
    });
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
    const { data: sekolah, error } = await supabase.from('sekolah').select('*').eq('id_sekolah', req.session.user?.id_sekolah).single();
    if (error) return res.send('Error: ' + error.message);
    res.render('users/pihak_sekolah/tambah_siswa_sekolah', {
      user: req.session.user,

      sekolah,
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

        foto_siswa =
          supabase.storage
            .from('foto-siswa')
            .getPublicUrl(data.path)
            .data.publicUrl;
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

      req.session.flash = {
        type: 'success',
        message: 'Siswa berhasil ditambahkan',
      };

      res.redirect('/user/sekolah/siswa');

    } catch (err) {
      console.error(err);

      req.session.flash = {
        type: 'error',
        message: 'Siswa gagal ditambahkan',
      };

      res.redirect('/user/sekolah/siswa');
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

      req.session.flash = {
        type: 'success',
        message: 'Data siswa berhasil diupdate',
      };

      res.redirect('/user/sekolah/siswa');

    } catch (err) {
      console.error(err);

      req.session.flash = {
        type: 'error',
        message: 'Data siswa gagal diupdate',
      };

      res.redirect('/user/sekolah/siswa');
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

      req.session.flash = {
        type: 'success',
        message: 'Data siswa berhasil dihapus',
      };

      res.redirect('/user/sekolah/siswa');

    } catch (err) {
      console.error(err);

      req.session.flash = {
        type: 'error',
        message: 'Data siswa gagal dihapus',
      };

      res.redirect('/user/sekolah/siswa');
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


  //peringatan
  getPeringatan: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;

    try {
      const { data: peringatan, error } = await supabase
        .from('sekolah')
        .select('status_sistem, kasus_keracunan')
        .eq('id_sekolah', sekolahId)
        .single();

      if (error) throw error;


      res.render('users/pihak_sekolah/peringatan', {
        user: req.session.user,
        peringatan,
        message: req.session.flash?.message || null,
        type: req.session.flash?.type || null,
        pageTitle: 'Peringatan',
        pageCrumb: 'Peringatan',
        breadcrumb: ['Dashboard Sekolah', 'Peringatan'],
      });

    } catch (err) {
      res.json({ error: err.message });
    }
  },


  //update status + notification
  updateKasusKeracunan: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;
    if (!sekolahId) return res.status(401).send('Unauthorized');

    try {
      const { data: sekolah, error } = await supabase
        .from('sekolah')
        .select('*')
        .eq('id_sekolah', sekolahId)
        .single();

      if (error || !sekolah) throw error;

      if (sekolah.kasus_keracunan === 'resolved') {
        req.session.laporanContext = {
          kasus_keracunan: 'Kasus Keracunan'
        };
        return res.redirect('/user/sekolah/laporan/buat');
      }

      if (sekolah.kasus_keracunan === 'bahaya') {

        if (canSendNotification(sekolah.last_system_down_notify, 10)) {
          await SendNotification(sekolah, 'keracunan');

          await supabase
            .from('sekolah')
            .update({ last_system_down_notify: new Date().toISOString() })
            .eq('id_sekolah', sekolahId);
        }
        req.session.flash = {
          message: 'SPPG anda sudah diperingati, tim medis akan segera berangkat',
          type: 'info'
        };
        return res.redirect('/user/sekolah/peringatan');
      }

      if (sekolah.status_sistem !== 'aktif') {
        return res.redirect('/user/sekolah/peringatan');
      }

      await supabase
        .from('sekolah')
        .update({ kasus_keracunan: 'bahaya' })
        .eq('id_sekolah', sekolahId);

      await SendNotification(sekolah, 'keracunan');

      req.session.flash = {
        message: 'Status telah diganti, mohon tunggu tindakan selanjutnya',
        type: 'info'
      };
      return res.redirect('/user/sekolah/peringatan');

    } catch (err) {
      console.error(err);
      req.session.flash = {
        message: 'Gagal mengupdate status sistem',
        type: 'error'
      };
      return res.redirect('/user/sekolah/peringatan');
    }
  },

  updateStatusSistem: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;
    if (!sekolahId) return res.status(401).send('Unauthorized');

    try {
      const { data: sekolah, error } = await supabase
        .from('sekolah')
        .select('*')
        .eq('id_sekolah', sekolahId)
        .single();

      if (error || !sekolah) throw error;

      if (sekolah.status_sistem === 'ready') {
        req.session.laporanContext = {
          status_sistem: 'Sistem Down'
        };
        return res.redirect('/user/sekolah/laporan/buat');
      }

      if (sekolah.status_sistem === 'nonaktif') {

        if (canSendNotification(sekolah.last_system_down_notify, 10)) {
          await SendNotification(sekolah, 'sistem');

          await supabase
            .from('sekolah')
            .update({ last_system_down_notify: new Date().toISOString() })
            .eq('id_sekolah', sekolahId);
        }

        return res.redirect('/user/sekolah/peringatan');
      }

      if (sekolah.status_sistem !== 'aktif') {
        return res.redirect('/user/sekolah/peringatan');
      }

      await supabase
        .from('sekolah')
        .update({ status_sistem: 'nonaktif' })
        .eq('id_sekolah', sekolahId);

      await SendNotification(sekolah, 'sistem');

      return res.redirect('/user/sekolah/peringatan');

    } catch (err) {
      console.error(err);
      return res.status(500).send('Gagal mengupdate status sistem');
    }
  },


  //Laporan
  getLaporan: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;

    try {
      const { data: data, error } = await supabase
        .from('laporan')
        .select(`
      *,
      sekolah (
        id_sekolah,
        nama_sekolah
      )
    `)
        .eq('id_pelapor', sekolahId);

      const TotalReport = data.length;
      const TotalRead = data.filter(i => i.status_baca === 'dibaca').length;
      const TotalUnread = data.filter(i => i.status_baca === 'belum dibaca').length;

      if (error) throw error;

      res.render('users/pihak_sekolah/laporan_sekolah', {
        user: req.session.user,
        laporan: data,
        TotalReport,
        TotalRead,
        TotalUnread,
        pageTitle: 'Laporan',
        pageCrumb: 'Laporan',
        breadcrumb: ['Dashboard Sekolah', 'Laporan'],
      });
    } catch (err) {
      res.json({ error: err.message });
    }
  },

  BuatLaporanForm: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;
    if (!sekolahId) return res.redirect('/login');

    // Ambil data sekolah
    const { data: sekolah, error } = await supabase
      .from('sekolah')
      .select('id_sekolah, nama_sekolah, status_sistem, kasus_keracunan')
      .eq('id_sekolah', sekolahId)
      .single();

    if (error) {
      console.error(error);
      return res.redirect('/user/sekolah/peringatan');
    }

    if (
      sekolah.status_sistem !== 'ready' &&
      sekolah.kasus_keracunan !== 'resolved'
    ) {
      req.session.flash = {
        message: 'Pastikan masalah sudah diselesaikan',
        type: 'info'
      };
      return res.redirect('/user/sekolah/peringatan');
    }

    const context = req.session.laporanContext;
    delete req.session.laporanContext;

    if (!context) {
      req.session.flash = {
        message: 'Context laporan tidak ditemukan',
        type: 'danger'
      };
      return res.redirect('/user/sekolah/peringatan');
    }

    res.render('users/pihak_sekolah/buat_laporan_sekolah', {
      user: req.session.user,
      sekolah,
      context,
      pageTitle: 'Buat Laporan',
      pageCrumb: 'Buat Laporan',
      breadcrumb: ['Dashboard Sekolah', 'Buat Laporan'],
    });
  },



  BuatLaporan: async (req, res) => {
    const sekolahId = req.session.user?.id_sekolah;

    if (!sekolahId) return res.redirect('/login');

    const { judul_laporan, isi_laporan, jenis_laporan } = req.body;

    try {
      const { error } = await supabase
        .from('laporan')
        .insert({
          id_pelapor: sekolahId,
          judul_laporan,
          isi_laporan,
          jenis_laporan,
          status_laporan: 'pending'
        });

      if (error) throw error;

      req.session.flash = {
        type: 'success',
        message: 'Laporan berhasil dikirim'
      };

      res.redirect('/users/pihak_sekolah/laporan_sekolah');
    } catch (err) {
      res.send(err.message);
    }
  },

};

module.exports = userSekolahController;
