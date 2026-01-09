const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const profileController = {

    getprofile: async (req, res) => {
        const { id } = req.session.user;

        const { data, error } = await supabase
            .from('users')
            .select(`*`)
            .eq('id', id)
            .single();

        if (error) {
            console.error(error);
            return res.send('Error: ' + error.message);
        }

        res.render('settings/profile', {
            user: req.session.user,
            data,
            pageTitle: 'Profile',
            pageCrumb: 'Profile',
            breadcrumb: ['Dashboard', 'Profile'],
        });
    },

    editprofileform: async (req, res) => {
        const { id } = req.session.user;
        const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
        if (error) return res.send('Error: ' + error.message);

        res.render('settings/edit_profile', {
            user: req.session.user,
            data,
            pageTitle: 'Edit Profile',
            pageCrumb: 'Profile',
            breadcrumb: ['Dashboard', 'Profile', 'Edit'],
        });
    },

    editprofile: async (req, res) => {
        const { id } = req.params;
        const { nama, email, jabatan, username, foto_lama } = req.body;

        try {
            let updateData = {
                nama,
                username,
                email,
                jabatan,
                foto: foto_lama,
            };

            if (req.file) {
                const { data, error: uploadError } = await supabase.storage
                    .from('foto-user')
                    .upload(`user/${Date.now()}_${req.file.originalname}`, req.file.buffer, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: req.file.mimetype,
                    });

                if (uploadError) return res.send('Gagal upload foto baru: ' + uploadError.message);

                updateData.foto = supabase
                    .storage
                    .from('foto-user')
                    .getPublicUrl(data.path).data.publicUrl;
            }

            const { error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            req.session.flash = {
                type: 'success',
                message: 'Profile berhasil diupdate',
            };

            req.session.save(() => {
                res.redirect('/profile');
            });

        } catch (err) {
            console.error(err);

            req.session.flash = {
                type: 'error',
                message: 'Profile gagal diupdate',
            };

            req.session.save(() => {
                res.redirect('/profile');
            });
        }
    }

}

module.exports = profileController
