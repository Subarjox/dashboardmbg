
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userSppgController = {

    dashboard: async (req, res) => {
        const sppgId = req.session.user?.id_sppg;

        try {
            const { data: sppg, error: sppgError } = await supabase
                .from('satuan_gizi')
                .select('*')
                .eq('id_sppg', sppgId)
                .single();

            if (sppgError) throw sppgError;

            // Ambil siswa milik sekolah tersebut
            const { data: sekolah, error: sekolahError } = await supabase
                .from('sekolah')
                .select('*')
                .eq('id_sppg', sppgId);

            if (sekolahError) throw sekolahError;

            res.render('users/pihak_sekolah/pihak_sekolah', {
                user: req.session.user,
                sekolah,
                sppg,
                pageCrumb: 'Dashboard',
                pageTitle: 'Dashboard Sekolah',
                breadcrumb: ['Dashboard Sekolah'],
            });
        } catch (err) {
            console.error(err);
            res.send('Gagal memuat dashboard: ' + err.message);
        }
    },

};