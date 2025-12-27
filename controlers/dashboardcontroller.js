const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DashboardController = {
  dashboard: async (req, res) => {
    try {
      // Execute all queries in parallel
      const [
        { count: totalSiswa },
        { count: siswaTidakAdaAlergi },
        { count: siswaAlergiRingan },
        { count: siswaAlergiBerat },
        { count: totalSekolah },
        { count: sekolahAktif },
        { count: sekolahNonaktif },
        { count: totalSupplier },
        { count: totalSPPG },
        { count: kasusAman },
        { count: kasusBahaya },
        { count: laporan_belum_dibaca }
      ] = await Promise.all([
        // 1. Siswa
        supabase.from('siswa').select('*', { count: 'exact', head: true }),
        supabase.from('siswa').select('*', { count: 'exact', head: true }).eq('kategori_alergi', 'tidak ada'),
        supabase.from('siswa').select('*', { count: 'exact', head: true }).eq('kategori_alergi', 'ringan'),
        supabase.from('siswa').select('*', { count: 'exact', head: true }).eq('kategori_alergi', 'berat'),

        // Sekolah
        supabase.from('sekolah').select('*', { count: 'exact', head: true }),
        supabase.from('sekolah').select('*', { count: 'exact', head: true }).eq('status_sistem', 'aktif'),
        supabase.from('sekolah').select('*', { count: 'exact', head: true }).eq('status_sistem', 'nonaktif'),

        // Supplier
        supabase.from('supplier').select('*', { count: 'exact', head: true }),

        // SPPG
        supabase.from('satuan_gizi').select('*', { count: 'exact', head: true }),

        // Kasus Keracunan
        supabase.from('sekolah').select('*', { count: 'exact', head: true }).eq('kasus_keracunan', 'aman'),
        supabase.from('sekolah').select('*', { count: 'exact', head: true }).eq('kasus_keracunan', 'bahaya'),

        // Laporan
        supabase.from('laporan').select('*', { count: 'exact', head: true }).eq('status_baca', 'belum dibaca')
      ]);

      const totalkasus = kasusBahaya + sekolahNonaktif;

      res.render('dashboard', {
        user: req.session.user,
        totalSiswa,
        siswaTidakAdaAlergi,
        siswaAlergiRingan,
        siswaAlergiBerat,
        totalSekolah,
        sekolahAktif,
        sekolahNonaktif,
        totalSPPG,
        totalSupplier,
        kasusAman,
        kasusBahaya,
        totalkasus,
        laporan_belum_dibaca,
        pageCrumb: 'Dashboard',
        pageTitle: 'Dashboard Utama',
      });
    } catch (error) {
      console.error(error);
      res.send('Gagal memuat data dashboard: ' + error.message);
    }
  },

  //Laporan AJax
  getAllAjax: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 5;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase.from('laporan')
        .select(`
            id_laporan,
            id_pelapor,
            judul_laporan,
            jenis_laporan,
            created_at,
            status_laporan,
            status_baca
          `, { count: 'exact' })
        .order('id_laporan', { ascending: false }) // terbaru dulu
        .range(from, to);

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

};

module.exports = DashboardController;