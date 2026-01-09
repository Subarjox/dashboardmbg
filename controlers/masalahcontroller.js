const { createClient } = require('@supabase/supabase-js');
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

async function SendDevTeamNotification(admin, sekolah, status) {
    const webhookUrl = process.env.DISCORD_DEVTEAM_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log('⚠️ DISCORD_DEV_TEAM_WEBHOOK_URL not set, skipping notification.');
        return;
    }

    const statusConfig = {
        dispatched: {
            title: " DISPATCH TEAM NOTIFICATION",
            description: "Admin telah mengirim tim teknisi ke lokasi berikut.",
            footer: "Status: DISPATCHED",
            color: 0xF1C40F
        },
        on_maintenance: {
            title: " MAINTENANCE STARTED",
            description: "Tim teknisi telah tiba dan mulai melakukan perbaikan sistem.",
            footer: "Status: ON MAINTENANCE",
            color: 0x0096FF
        },
        ready: {
            title: " SYSTEM READY",
            description: "Perbaikan sistem telah selesai dan sistem siap digunakan kembali.",
            footer: "Status: READY",
            color: 0x2ECC71 // hijau
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
                name: "Petugas Admin",
                value:
                    `ID: ${admin?.id || '-'}
Nama: ${admin?.nama || '-'}
Email: ${admin?.email || '-'}`,
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



const MasalahController = {
    getAll: async (req, res) => {
        const { data, error } = await supabase
            .from('sekolah')
            .select('id_sekolah,nama_sekolah,kasus_keracunan, status_sistem')
            .or('kasus_keracunan.eq.bahaya,status_sistem.eq.nonaktif,status_sistem.eq.dispatched,status_sistem.eq.on_maintenance')


        if (error) return res.status(500).json({ error: error.message });
        if (!data) return res.status(404).json({ error: 'Sekolah not found' });

        const TotalMasalahSistem = data.filter(item => item.status_sistem === 'nonaktif').length;
        const TotalKasusKeracunan = data.filter(item => item.kasus_keracunan === 'bahaya').length;

        const TotalMaintenanceSistem = data.filter(
            item => item.status_sistem === 'on_maintenance' || item.status_sistem === 'dispatched'
        ).length;

        const TotalMaintenanceKeracunan = data.filter(
            item => item.kasus_keracunan === 'on_treatment' || item.kasus_keracunan === 'dispatched').length;

        res.render('masalah/masalah', {
            data,
            TotalMasalahSistem,
            TotalKasusKeracunan,
            TotalMaintenanceKeracunan,
            TotalMaintenanceSistem,
            user: req.session.user,
            pageTitle: 'Masalah',
            pageCrumb: 'Masalah',
            breadcrumb: ['Dashboard', 'Masalah'],
        })
    },

    getOne: async (req, res) => {
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

        res.render('masalah/detail_masalah', {
            user: req.session.user,
            peringatan,
            message: req.session.flash?.message || null,
            type: req.session.flash?.type || null,
            pageTitle: 'Detail Masalah',
            pageCrumb: 'Masalah',
            breadcrumb: ['Dashboard', 'Masalah', 'Detail'],
        });
    },

    SendSPPGTeam: async (req, res) => {
        const sekolahId = req.params.id;
        const adminId = req.session.user?.id;

        try {
            const { data: sekolah, error } = await supabase
                .from('sekolah')
                .select('id_sekolah, nama_sekolah, alamat, kota, provinsi, kasus_keracunan')
                .eq('id_sekolah', sekolahId)
                .single();

            if (error) throw error;
            if (!sekolah) throw new Error('Data sekolah tidak ditemukan');

            req.session.flash = {
                message: 'SPPG sudah diperingati',
                type: 'success'
            };

            return res.redirect('/masalah/detail/' + sekolahId);

        } catch (err) {
            console.error(err);
            req.session.flash = {
                message: 'Gagal mengirim notif ke discord SPPG Team',
                type: 'error'
            };

            return res.redirect('/masalah/detail/' + sekolahId);
        }
    },


    SendDevTeam: async (req, res) => {
        const sekolahId = req.params.id;
        const adminId = req.session.user?.id;

        if (!adminId) {
            return res.status(401).send('Unauthorized');
        }

        try {
            const { data: sekolah, error } = await supabase
                .from('sekolah')
                .select('id_sekolah, nama_sekolah, alamat, kota, provinsi, status_sistem')
                .eq('id_sekolah', sekolahId)
                .single();

            if (error || !sekolah) throw error;

            const statusFlow = {
                nonaktif: 'dispatched',
                dispatched: 'on_maintenance',
                on_maintenance: 'ready'
            };

            const nextStatus = statusFlow[sekolah.status_sistem];

            if (!nextStatus) {
                return res
                    .status(400)
                    .send('Status sudah READY atau tidak valid');
            }

            const { error: updateError } = await supabase
                .from('sekolah')
                .update({
                    status_sistem: nextStatus,
                })
                .eq('id_sekolah', sekolahId);

            if (updateError) throw updateError;

            if (sekolah.status_sistem === 'nonaktif') {
                await SendDevTeamNotification(req.session.user, sekolah, 'dispatched');
            } else if (sekolah.status_sistem === 'dispatched') {
                await SendDevTeamNotification(req.session.user, sekolah, 'on_maintenance');
            } else if (sekolah.status_sistem === 'on_maintenance') {
                await SendDevTeamNotification(req.session.user, sekolah, 'ready');
            }

            req.session.flash = {
                message: 'Status berhasil diupdate',
                type: 'success'
            };

            return res.redirect('/masalah/detail/' + sekolahId);

        } catch (err) {
            console.error(err);
            req.session.flash = {
                message: 'Gagal mengupdate status sistem',
                type: 'error'
            };

            return res.redirect('/masalah/detail/' + sekolahId);
        }
    }


}


module.exports = MasalahController;