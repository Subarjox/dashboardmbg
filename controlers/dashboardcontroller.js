const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DashboardController = {
    dashboard: async (req, res) => {
      try {
        // 1. Siswa
        const { count: totalSiswa } = await supabase
          .from('siswa')
          .select('*', { count: 'exact', head: true });
  
        const { count: siswaTidakAdaAlergi } = await supabase
          .from('siswa')
          .select('*', { count: 'exact', head: true })
          .eq('kategori_alergi', 'tidak ada');
  
        const { count: siswaAlergiRingan } = await supabase
          .from('siswa')
          .select('*', { count: 'exact', head: true })
          .eq('kategori_alergi', 'ringan');
  
        const { count: siswaAlergiBerat } = await supabase
          .from('siswa')
          .select('*', { count: 'exact', head: true })
          .eq('kategori_alergi', 'berat');
  
        // 2. Sekolah
        const { count: totalSekolah } = await supabase
          .from('sekolah')
          .select('*', { count: 'exact', head: true });
  
        const { count: sekolahAktif } = await supabase
          .from('sekolah')
          .select('*', { count: 'exact', head: true })
          .eq('status_sistem', 'aktif');
  
        const { count: sekolahNonaktif } = await supabase
          .from('sekolah')
          .select('*', { count: 'exact', head: true })
          .eq('status_sistem', 'nonaktif');
  
        // 3. Supplier
        const { count: totalSupplier } = await supabase
          .from('supplier')
          .select('*', { count: 'exact', head: true });
  
        // 4. Kasus Keracunan
        const { count: kasusAman } = await supabase
          .from('sekolah')
          .select('*', { count: 'exact', head: true })
          .eq('kasus_keracunan', 'aman');
  
        const { count: kasusBahaya } = await supabase
          .from('sekolah')
          .select('*', { count: 'exact', head: true })
          .eq('kasus_keracunan', 'bahaya');

        
        totalkasus=kasusBahaya+sekolahNonaktif
  
        // Kirim data ke view
        res.render('dashboard', {
          user: req.session.user,
          totalSiswa,
          siswaTidakAdaAlergi,
          siswaAlergiRingan,
          siswaAlergiBerat,
          totalSekolah,
          sekolahAktif,
          sekolahNonaktif,
          totalSupplier,
          kasusAman,
          kasusBahaya,
          totalkasus,
          pageCrumb: 'Dashboard',
          pageTitle: 'Dashboard',
        });
      } catch (error) {
        console.error(error);
        res.send('Gagal memuat data dashboard: ' + error.message);
      }
    },
  };
  
  module.exports = DashboardController;