const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);


//Status_sistem 
async function SendDevTeamNotification(sekolah) {
    const webhookUrl = process.env.DISCORD_WARNING_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log('⚠️ DISCORD_WARNING_WEBHOOK_URL not set, skipping notification.');
        return;
    }

    const embed = {
        title: "⚠️ SYSTEM DOWN NOTIFICATION",
        color: 0xFF0000,
        fields: [
            { name: "NPSN", value: sekolah.id_sekolah || "Unknown", inline: true },
            { name: "NAMA SEKOLAH", value: sekolah.nama_sekolah || "Unknown", inline: true },
            { name: "ALAMAT", value: sekolah.alamat || "Unknown", inline: true },
            { name: "KOTA", value: sekolah.kota || "Unknown", inline: true },
            { name: "PROVINSI", value: sekolah.provinsi || "Unknown", inline: true },
            { name: "Time", value: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }), inline: false }
        ],
        footer: { text: "FoodGuard System - WARNING - Please send developer team to fix the system" },
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

//Kasus_Keracunan
async function SendDevTeamNotification(sppg, sekolah, status) {
    const webhookUrl = process.env.DISCORD_SPPG_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log('⚠️ DISCORD_DEV_TEAM_WEBHOOK_URL not set, skipping notification.');
        return;
    }

    const statusConfig = {
        dispatched: {
            title: " DISPATCH TEAM NOTIFICATION",
            description: "SPPG telah mengirim tim medis ke lokasi berikut.",
            footer: "Status: DISPATCHED",
            color: 0xF1C40F
        },
        on_treatment: {
            title: " TREATMENT STARTED",
            description: "Tim medis telah tiba dan mulai melakukan penanganan kasus keracunan.",
            footer: "Status: ON TREATMENT",
            color: 0x0096FF
        },
        resolved: {
            title: "RESOLVED",
            description: "Penanganan kasus keracunan telah selesai.",
            footer: "Status: READY",
            color: 0x2ECC71
        }
    };

    const config = statusConfig[status];
    if (!config) {
        console.warn(`⚠️ Unknown status: ${status}, notification skipped`);
        return;
    }


    const embed = {
        title: config.title,
        description: config.description,
        color: config.color,
        fields: [
            {
                name: "SPPG",
                value:
                    `ID: ${sppg?.id_sppg || '-'}
Nama: ${sppg?.nama || '-'}
Email: ${sppg?.email || '-'}`,
                inline: false
            },
            {
                name: "Data Sekolah",
                value:
                    `Nama: ${sekolah?.nama_sekolah || '-'}
Alamat: ${sekolah?.alamat || '-'}
Kota: ${sekolah?.kota || '-'}
Provinsi: ${sekolah?.provinsi || '-'}`,
                inline: false
            },
            {
                name: "Waktu",
                value: new Date().toLocaleString('id-ID', {
                    timeZone: 'Asia/Jakarta'
                }),
                inline: false
            }
        ],
        footer: { text: `FoodGuard System • ${config.footer}` },
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(' Discord notification failed:', text);
        }
    } catch (error) {
        console.error(" Error sending Discord notification:", error);
    }
}

const userSppgController = {

    dashboard: async (req, res) => {
        const sppgId = req.session.user?.id_sppg;
        try {

            //ambil data sppg
            const { data: sppg, error: sppgError } = await supabase
                .from('satuan_gizi')
                .select('nama_sppg,pemilik_sppg, kota_sppg, provinsi_sppg')
                .eq('id_sppg', sppgId)
                .single();

            if (sppgError) throw sppgError;

            //ambil data menu makanan
            const { data: menu_makanan, error: menu_makananError } = await supabase
                .from('menu_makanan')
                .select('nama_makanan')
                .eq('id_sppg', sppgId)
                .limit(1)
                .single();

            // Ambil total sekolah milik sppg tersebut
            const { count: totalSekolah, error: totalSekolahError } = await supabase
                .from('sekolah')
                .select('*', { count: 'exact', head: true })
                .eq('id_sppg', sppgId);

            if (totalSekolahError) throw totalSekolahError;

            // Ambil total supplier milik sppg tersebut
            const { count: totalSupplier, error: totalSupplierError } = await supabase
                .from('supplier')
                .select('*', { count: 'exact', head: true })
                .eq('id_sppg', sppgId);

            if (totalSupplierError) throw totalSupplierError;

            res.render('users/pihak_sppg/pihak_sppg', {
                user: req.session.user,
                sppg,
                menu_makanan,
                totalSekolah,
                totalSupplier,
                pageCrumb: 'Dashboard',
                pageTitle: 'Dashboard SPPG',
                breadcrumb: ['Dashboard SPPG'],
            });
        } catch (err) {
            console.error(err);
            res.send('Gagal memuat dashboard: ' + err.message);
        }
    },


    //SEKOLAH
    getSekolahSPPG: async (req, res) => {
        const [
            { count: totalSekolah },
            { count: sekolahAktif },
            { count: sekolahNonaktif }] =
            await Promise.all([
                supabase.from('sekolah').select('*', { count: 'exact', head: true }).eq('id_sppg', req.session.user?.id_sppg),
                supabase.from('sekolah').select('*', { count: 'exact', head: true }).eq('status_sistem', 'aktif').eq('id_sppg', req.session.user?.id_sppg),
                supabase.from('sekolah').select('*', { count: 'exact', head: true }).eq('status_sistem', 'nonaktif').eq('id_sppg', req.session.user?.id_sppg),
            ]);

        const { data, error } = await supabase
            .from('sekolah')
            .select(`
        *,
        satuan_gizi(id_sppg, nama_sppg)
      `)
            .eq('id_sppg', req.session.user?.id_sppg);

        if (error) return res.render('sekolah/sekolah', { error: error.message });
        const provinsiList = [...new Set(data.map(s => s.provinsi))];
        const kotaList = [...new Set(data.map(s => s.kota))];
        res.render('users/pihak_sppg/sppg_sekolah', {
            user: req.session.user,
            totalSekolah,
            sekolahAktif,
            message: req.session.flash?.message || null,
            type: req.session.flash?.type || null,
            sekolahNonaktif,
            sekolah: data,
            provinsiList,
            kotaList,
            pageCrumb: 'Sekolah',
            pageTitle: 'Sekolah SPPG',
            breadcrumb: ['Dashboard SPPG', 'Sekolah'],
        });
    },

    getAllsekolahAJAX: async (req, res) => {
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
      `, { count: 'exact' })
                .eq('id_sppg', req.session.user?.id_sppg);

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


    getOneSekolahSPPG: async (req, res) => {
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
        res.render('users/pihak_sppg/detail_sekolah_sppg', {
            user: req.session.user,
            sekolah: data,
            pageCrumb: 'Sekolah',
            pageTitle: 'Sekolah SPPG',
            breadcrumb: ['Dashboard SPPG', 'Sekolah'],
        });
    },


    //supplier
    getSupplierSPPG: async (req, res) => {
        const { data, error } = await supabase
            .from('supplier')
            .select('*')
            .order('id_supplier', { ascending: true })
            .eq('id_sppg', req.session.user?.id_sppg);

        if (error) {
            console.error(error);
            return res.render('users/pihak_sppg/sppg_supplier', { error: error.message });
        }

        res.render('users/pihak_sppg/sppg_supplier', {
            user: req.session.user,
            supplier: data,
            message: req.session.flash?.message || null,
            type: req.session.flash?.type || null,
            pageCrumb: 'Supplier',
            pageTitle: 'Daftar Supplier',
            breadcrumb: ['Dashboard', 'Supplier'],
        });
    },

    getAllSupplierAJAX: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 10;
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const search = req.query.search || '';
            const provinsi = req.query.provinsi || '';

            let query = supabase
                .from('supplier')
                .select(`*,
        satuan_gizi(nama_sppg)
      `, { count: 'exact' })
                .eq('id_sppg', req.session.user?.id_sppg);

            if (search) query = query.ilike('nama_supplier', `%${search}%`);
            if (provinsi) query = query.eq('provinsi_supplier', provinsi);

            query = query.range(from, to).order('id_supplier', { ascending: true });

            const { data, count, error } = await query;
            if (error) return res.json({ error: error.message });

            res.json({
                data,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalData: count,
            });
        } catch (err) {
            res.json({ error: err.message });
        }
    },

    getOneSupplierSPPG: async (req, res) => {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('supplier')
            .select(`*,
      satuan_gizi(id_sppg, nama_sppg)
    `)
            .eq('id_supplier', id)
            .single();

        if (error) return res.send('Error: ' + error.message);

        res.render('users/pihak_sppg/detail_supplier_sppg', {
            user: req.session.user,
            supplier: data,
            pageTitle: 'Detail Supplier',
            pageCrumb: 'Supplier',
            breadcrumb: ['Dashboard', 'Supplier', 'Detail'],
        });
    },

    addFormSupplierSPPG: async (req, res) => {
        const { data: sppg, error } = await supabase
            .from('satuan_gizi')
            .select('id_sppg, nama_sppg')
            .eq('id_sppg', req.session.user?.id_sppg)
            .single();

        if (error) return res.send('Error: ' + error.message);

        res.render('users/pihak_sppg/tambah_supplier_sppg', {
            user: req.session.user,
            sppg,
            pageTitle: 'Tambah Supplier',
            pageCrumb: 'Supplier',
            breadcrumb: ['Dashboard', 'Supplier', 'Tambah'],
        });
    },

    createSupplierSPPG: async (req, res) => {
        const id_sppg = req.session.user.id_sppg;
        try {
            const {
                id_supplier,
                nama_supplier,
                provinsi_supplier,
                kota_supplier,
                jenis_makanan,
                no_telp,
                alamat_supplier,
                nama_pemilik,
            } = req.body;

            let foto_supplier = null;

            if (req.file) {
                const { data, error: uploadError } = await supabase.storage
                    .from('foto-supplier')
                    .upload(`supplier/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: req.file.mimetype,
                    });

                if (uploadError) {
                    req.session.flash = {
                        type: 'error',
                        message: 'Gagal upload foto supplier',
                    };
                    return res.redirect('/user/sppg/supplier');
                }

                foto_supplier = supabase
                    .storage
                    .from('foto-supplier')
                    .getPublicUrl(data.path).data.publicUrl;
            }

            const { error } = await supabase.from('supplier').insert([{
                id_supplier,
                nama_supplier,
                provinsi_supplier,
                kota_supplier,
                jenis_makanan,
                foto_supplier,
                no_telp,
                alamat_supplier,
                nama_pemilik,
                id_sppg
            }]);

            if (error) throw error;

            req.session.flash = {
                type: 'success',
                message: 'Supplier berhasil ditambahkan',
            };

            res.redirect('/user/sppg/supplier');

        } catch (err) {
            req.session.flash = {
                type: 'error',
                message: err.message || 'Gagal menambahkan supplier',
            };
            res.redirect('/user/sppg/supplier');
        }
    },

    editFormSupplierSPPG: async (req, res) => {
        const { id } = req.params;
        const { data: supplier, error } = await supabase.from('supplier').select('*').eq('id_supplier', id).single();

        const { data: sppg } = await supabase
            .from('satuan_gizi')
            .select('id_sppg, nama_sppg')
            .eq('id_sppg', req.session.user?.id_sppg)
            .single();

        if (error) return res.send('Gagal memuat data supplier: ' + error.message);

        res.render('users/pihak_sppg/update_supplier_sppg', {
            user: req.session.user,
            supplier,
            sppg,
            pageCrumb: 'Supplier',
            pageTitle: 'Edit Supplier',
            breadcrumb: ['Dashboard', 'Supplier', 'Edit'],
        });
    },

    updateSupplierSPPG: async (req, res) => {
        try {
            const { id } = req.params;

            const {
                nama_supplier,
                provinsi_supplier,
                kota_supplier,
                jenis_makanan,
                no_telp,
                alamat_supplier,
                nama_pemilik,
                foto_lama
            } = req.body;

            let foto_supplier = foto_lama;

            if (req.file) {
                const { data, error } = await supabase.storage
                    .from('foto-supplier')
                    .upload(
                        `supplier/${Date.now()}_${req.file.originalname}`,
                        req.file.buffer,
                        { contentType: req.file.mimetype }
                    );

                if (error) throw error;

                foto_supplier = supabase
                    .storage
                    .from('foto-supplier')
                    .getPublicUrl(data.path).data.publicUrl;
            }

            const { error } = await supabase
                .from('supplier')
                .update({
                    nama_supplier,
                    provinsi_supplier,
                    kota_supplier,
                    jenis_makanan,
                    no_telp,
                    alamat_supplier,
                    nama_pemilik,
                    foto_supplier
                })
                .eq('id_supplier', id);

            if (error) throw error;

            req.session.flash = {
                type: 'success',
                message: 'Supplier berhasil diperbarui'
            };

            res.redirect('/user/sppg/supplier');

        } catch (err) {
            console.error(err);
            req.session.flash = {
                type: 'error',
                message: err.message || 'Gagal update supplier'
            };
            res.redirect('/user/sppg/supplier');
        }
    },


    deleteSupplierSPPG: async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('supplier')
                .delete()
                .eq('id_supplier', id);

            if (error) throw error;

            req.session.flash = {
                type: 'success',
                message: 'Supplier berhasil dihapus',
            };

            res.redirect('/user/sppg/supplier');

        } catch (err) {
            req.session.flash = {
                type: 'error',
                message: err.message || 'Gagal menghapus supplier',
            };
            res.redirect('/user/sppg/supplier');
        }
    },



    //peringatan
    getAllPeringatan: async (req, res) => {
        const sppgId = req.session.user?.id_sppg;
        const { data, error } = await supabase
            .from('sekolah')
            .select('id_sekolah,nama_sekolah,kasus_keracunan, status_sistem')
            .or('kasus_keracunan.eq.bahaya,status_sistem.eq.nonaktif,status_sistem.eq.dispatched,status_sistem.eq.on_maintenance')
            .eq('id_sppg', sppgId)


        if (error) return res.status(500).json({ error: error.message });
        if (!data) return res.status(404).json({ error: 'Sekolah Tidak Ditemukan' });

        const TotalMasalahSistem = data.filter(item => item.status_sistem === 'nonaktif').length;
        const TotalKasusKeracunan = data.filter(item => item.kasus_keracunan === 'bahaya').length;

        const TotalMaintenanceSistem = data.filter(
            item => item.status_sistem === 'on_maintenance' || item.status_sistem === 'dispatched'
        ).length;

        const TotalMaintenanceKeracunan = data.filter(
            item => item.kasus_keracunan === 'on_treatment' || item.kasus_keracunan === 'dispatched').length;

        res.render('users/pihak_sppg/peringatan_sekolah', {
            data,
            TotalMasalahSistem,
            TotalKasusKeracunan,
            TotalMaintenanceKeracunan,
            TotalMaintenanceSistem,
            user: req.session.user,
            pageTitle: 'Peringatan',
            pageCrumb: 'Peringatan',
            breadcrumb: ['Dashboard SPPG', 'Peringatan'],
        })
    },

    getOnePeringatan: async (req, res) => {
        const { id } = req.params;
        const { data: peringatan, error } = await supabase
            .from('sekolah')
            .select(`
    *,
    satuan_gizi(id_sppg, nama_sppg)
  `)
            .eq('id_sekolah', id)
            .single();

        if (error) return res.send('Error: ' + error.message);

        res.render('users/pihak_sppg/detail_peringatan_sekolah', {
            user: req.session.user,
            peringatan,
            message: req.session.flash?.message || null,
            type: req.session.flash?.type || null,
            pageCrumb: 'Peringatan',
            pageTitle: 'Peringatan',
            breadcrumb: ['Dashboard SPPG', 'Peringatan'],
        });
    },

    SendMedTeam: async (req, res) => {
        const sekolahId = req.params.id;
        const sppgId = req.session.user?.id_sppg;

        if (!sppgId) {
            req.session.flash = {
                message: 'Anda tidak memiliki akses',
                type: 'error'
            };

            return res.redirect('/');
        }

        try {
            const { data: sekolah, error } = await supabase
                .from('sekolah')
                .select('id_sekolah, nama_sekolah, alamat, kota, provinsi, kasus_keracunan')
                .eq('id_sekolah', sekolahId)
                .single();

            if (error || !sekolah) throw error;

            const statusFlow = {
                bahaya: 'dispatched',
                dispatched: 'on_treatment',
                on_treatment: 'resolved'
            };

            const nextStatus = statusFlow[sekolah.kasus_keracunan];

            if (!nextStatus) {
                return res
                    .status(400)
                    .send('Status sudah READY atau tidak valid');
            }

            const { error: updateError } = await supabase
                .from('sekolah')
                .update({
                    kasus_keracunan: nextStatus,
                })
                .eq('id_sekolah', sekolahId);

            if (updateError) throw updateError;

            if (sekolah.kasus_keracunan === 'bahaya') {
                await SendDevTeamNotification(req.session.user, sekolah, 'dispatched');
            } else if (sekolah.kasus_keracunan === 'dispatched') {
                await SendDevTeamNotification(req.session.user, sekolah, 'on_treatment');
            } else if (sekolah.kasus_keracunan === 'on_treatment') {
                await SendDevTeamNotification(req.session.user, sekolah, 'resolved');
            }

            req.session.flash = {
                message: 'Status berhasil diupdate',
                type: 'success'
            };

            return res.redirect('/user/sppg/peringatan/' + sekolahId);

        } catch (err) {
            console.error(err);
            req.session.flash = {
                message: 'Gagal mengupdate status sistem',
                type: 'error'
            };

            return res.redirect('/user/sppg/peringatan/' + sekolahId);
        }
    },

    SendDevTeamNotification: async (req, res) => {
        const { sekolahId } = req.params;

        try {
            const { data: sekolah, error } = await supabase
                .from('sekolah')
                .select('*')
                .eq('id_sekolah', sekolahId)
                .maybeSingle();

            if (!sekolah) {
                req.session.flash = {
                    message: 'Data sekolah tidak ditemukan',
                    type: 'error'
                };
                return res.redirect('/user/sppg/peringatan');
            }

            if (
                sekolah.status_sistem === 'nonaktif'
            ) {
                req.session.flash = {
                    message: 'Notifikasi sudah dikirim sebelumnya, mohon tunggu',
                    type: 'error'
                };
                return res.redirect('/user/sppg/peringatan/' + sekolahId);
            }

            await sendDevTeamNotification(sekolah);

            req.session.flash = {
                message: 'Petugas sudah diperingati',
                type: 'success'
            };

            return res.redirect('/user/sppg/peringatan/' + sekolahId);

        } catch (err) {
            console.error(err);
            req.session.flash = {
                message: 'Gagal mengirim notifikasi',
                type: 'error'
            };
            return res.redirect('/user/sppg/peringatan/' + sekolahId);
        }
    },


    getMenu: async (req, res) => {
        const sppgId = req.session.user?.id_sppg;
        res.render('users/pihak_sppg/detail_menu_sekolah', {
            user: req.session.user,
            pageCrumb: 'Menu',
            pageTitle: 'Menu',
            breadcrumb: ['Dashboard SPPG', 'Menu'],
        });
    },

    updateMenu: async (req, res) => {
        const sppgId = req.session.user?.id_sppg;
        res.render('users/pihak_sppg/update_menu_sekolah', {
            user: req.session.user,
            pageCrumb: 'Menu',
            pageTitle: 'Menu',
            breadcrumb: ['Dashboard SPPG', 'Menu'],
        });
    },

    getLaporan: async (req, res) => {
        const sppgId = req.session.user?.id_sppg;
        res.render('users/pihak_sppg/laporan_sekolah_sppg', {
            user: req.session.user,
            pageCrumb: 'Laporan',
            pageTitle: 'Laporan',
            breadcrumb: ['Dashboard SPPG', 'Laporan'],
        });
    },

    getOneLaporan: async (req, res) => {
        const sppgId = req.session.user?.id_sppg;
        res.render('users/pihak_sppg/detail_laporan_sekolah_sppg', {
            user: req.session.user,
            pageCrumb: 'Laporan',
            pageTitle: 'Laporan',
            breadcrumb: ['Dashboard SPPG', 'Laporan'],
        });
    },

};

module.exports = userSppgController;