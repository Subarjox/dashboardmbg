// controllers/sekolahController.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const bcrypt = require('bcrypt');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const makananController = {
    getAll: async (req, res) => {
        const [
            { count: totalSekolah },
            { count: sekolahAktif },
            { count: sekolahNonaktif }] =
            await Promise.all([
                supabase.from('sekolah').select('*', { count: 'exact', head: true }),
                supabase.from('sekolah').select('*', { count: 'exact', head: true }).eq('status_sistem', 'aktif'),
                supabase.from('sekolah').select('*', { count: 'exact', head: true }).eq('status_sistem', 'nonaktif'),
            ]);

        const { data, error } = await supabase
            .from('menu_makanan')
            .select(`
        *,
        satuan_gizi(id_sppg, nama_sppg)
      `);

        if (error) return res.render('menu/menu', { error: error.message });


        res.render('menu/menu', {
            user: req.session.user,
            message: req.session.flash?.message || null,
            type: req.session.flash?.type || null,
            makanan: data,
            pageTitle: 'Daftar Menu',
            pageCrumb: 'Menu',
            breadcrumb: ['Dashboard', 'Menu'],
        });
    },

    getAllAjax: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 10;
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const search = req.query.search || '';

            let query = supabase
                .from('satuan_gizi')
                .select(`
        id_sppg,
        nama_sppg,
        menu_makanan (
          id_menu,
          nama_makanan,
          tanggal_menu
        ),
        sekolah (count)
      `, { count: 'exact' })
                .not('menu_makanan.nama_makanan', 'is', null)
                .neq('menu_makanan.nama_makanan', 'Menu belum diisi')
                .range(from, to);

            // ✅ SEARCH DI TABEL RELASI
            if (search) {
                query = query.ilike(
                    'menu_makanan.nama_makanan',
                    `%${search}%`
                );
            }

            const { data, count, error } = await query;
            if (error) return res.json({ error: error.message });

            // 🔥 RAPiHKAN RESPONSE (ENAK DIPAKAI FRONTEND)
            const result = data.map(sppg => ({
                id_sppg: sppg.id_sppg,
                nama_sppg: sppg.nama_sppg,
                total_sekolah: sppg.sekolah?.[0]?.count || 0,
                menu_makanan: sppg.menu_makanan || []
            }));

            res.json({
                data: result,
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
            .from('menu_makanan')
            .select(`
        *,
        satuan_gizi(id_sppg, nama_sppg)
      `)
            .eq('id_menu', id)
            .single();

        if (error) return res.send('Error: ' + error.message);

        res.render('menu/detail_menu', {
            user: req.session.user,
            makanan: data,
            pageTitle: 'Detail Menu',
            pageCrumb: 'Menu',
            breadcrumb: ['Dashboard', 'Menu', 'Detail'],
        });
    }

};

module.exports = makananController;