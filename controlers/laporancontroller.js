const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const laporanController = {
    getAll: async (req, res) => {
        const { data, error } = await supabase
            .from('laporan')
            .select(`
      *,
      sekolah (
        id_sekolah,
        nama_sekolah
      )
    `)
            .order('status_laporan', { ascending: false })
            .order('created_at', { ascending: true });

        if (error) {
            return res.render('laporan/laporan', {
                laporan: [],
                error: error.message,
            });
        }

        const TotalRead = data.filter(i => i.status_baca === 'dibaca').length;
        const TotalUnread = data.filter(i => i.status_baca === 'belum dibaca').length;

        res.render('laporan/laporan', {
            user: req.session.user,
            laporan: data,
            TotalRead,
            TotalUnread,
            message: req.session.flash?.message || null,
            type: req.session.flash?.type || null,
            pageTitle: 'Daftar Laporan',
            pageCrumb: 'Laporan',
            breadcrumb: ['Dashboard', 'Laporan'],
        });
    },


    getOne: async (req, res) => {
        try {
            const { id } = req.params;

            const { data: laporan, error } = await supabase
                .from('laporan')
                .select(`
        *,
        sekolah (
          nama_sekolah
        )
      `)
                .eq('id_laporan', id)
                .single();

            if (error || !laporan) {
                console.error('Laporan tidak ditemukan:', error);
                return res.status(404).render('404', {
                    message: 'Laporan tidak ditemukan'
                });
            }

            res.render('laporan/detail_laporan', {
                user: req.session.user,
                laporan, // 🔥 ini penting (dipakai di EJS)
                pageTitle: 'Detail Laporan',
                pageCrumb: 'Laporan',
                breadcrumb: ['Dashboard', 'Laporan', 'Detail'],
            });

        } catch (err) {
            console.error('Error getOne Laporan:', err);
            res.status(500).send('Terjadi kesalahan server.');
        }
    },

    markAsRead: async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('laporan')
                .update({ status_baca: 'dibaca' })
                .eq('id_laporan', id);

            if (error) throw error;

            res.redirect('/laporan/detail/' + id);

        } catch (err) {
            console.error(err);
            res.status(500).send('Gagal mengubah status baca');
        }
    }



};

module.exports = laporanController;
