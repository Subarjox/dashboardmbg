const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MasalahController = {
    getAll: async (req, res) => {
        const { data, error } = await supabase
            .from('sekolah')
            .select('id_sekolah,foto_sekolah,nama_sekolah,kasus_keracunan, status_sistem')
            .or('kasus_keracunan.eq.bahaya,status_sistem.eq.nonaktif')

        if (error) return res.status(500).json({ error: error.message });
        if (!data) return res.status(404).json({ error: 'Sekolah not found' });

        res.render('masalah/masalah', {
            data,
            user: req.session.user,
            pageTitle: 'Masalah',
            pageCrumb: 'Masalah',
            breadcrumb: ['Dashboard', 'Masalah'],
        })
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
            .or('kasus_keracunan.eq.bahaya,status_sistem.eq.nonaktif')
            .single();

        if (error) return res.send('Error: ' + error.message);

        res.render('masalah/detail_masalah', {
            user: req.session.user,
            data,
            pageTitle: 'Detail Masalah',
            pageCrumb: 'Masalah',
            breadcrumb: ['Dashboard', 'Masalah', 'Detail'],
        });
    },

    SendMedicAction: async (req, res) => {
        const { id } = req.params;
        let insertData = {
            kasus_keracunan: 'SPPG-Notified'
        };

        const { error } = await supabase.from('sekolah').update(insertData).eq('id_sekolah', id);
        if (error) {
            console.error(error);
            return res.send('Terjadi Error : ' + error.message);
        }

        res.redirect('/masalah');
    },

    SendMedicAction: async (req, res) => {
        const { id } = req.params;
        let insertData = {
            kasus_keracunan: 'SPPG-Notified'
        };

        const { error } = await supabase.from('sekolah').update(insertData).eq('id_sekolah', id);
        if (error) {
            console.error(error);
            return res.send('Terjadi Error : ' + error.message);
        }

        res.redirect('/masalah');
    }


}


module.exports = MasalahController;