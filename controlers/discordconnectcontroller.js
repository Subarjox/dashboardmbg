const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const discordConnectController = {

    redirect: async (req, res) => {
        try {
            const sppgId = req.session.user?.id_sppg;
            if (!sppgId) {
                return res.status(401).send("Unauthorized");
            }

            const params = new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                redirect_uri: process.env.DISCORD_REDIRECT_URI,
                response_type: "code",
                scope: "identify",
                state: sppgId
            });

            return res.redirect(
                `https://discord.com/oauth2/authorize?${params.toString()}`
            );
        } catch (err) {
            console.error("Discord redirect error:", err);
            return res.status(500).send("Discord auth failed");
        }
    },

    // =========================
    // CALLBACK DARI DISCORD
    // =========================
    callback: async (req, res) => {
        const { code, state: sppgId } = req.query;

        if (!code || !sppgId) {
            return res.redirect("/error?discord=invalid");
        }

        try {
            // 1️⃣ Tukar code → access_token
            const tokenRes = await axios.post(
                "https://discord.com/api/oauth2/token",
                new URLSearchParams({
                    client_id: process.env.DISCORD_CLIENT_ID,
                    client_secret: process.env.DISCORD_CLIENT_SECRET,
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: process.env.DISCORD_REDIRECT_URI
                }),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );

            const accessToken = tokenRes.data.access_token;

            // 2️⃣ Ambil user Discord
            const userRes = await axios.get(
                "https://discord.com/api/users/@me",
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );

            const discordId = userRes.data.id;
            const discordUsername = `${userRes.data.username}#${userRes.data.discriminator}`;

            // 3️⃣ Simpan ke Supabase
            const { error } = await supabase
                .from("satuan_gizi")
                .update({
                    discord_acc: discordId,
                    discord_username: discordUsername
                })
                .eq("id_sppg", sppgId);

            if (error) throw error;

            return res.redirect("/dashboard?discord=connected");
        } catch (err) {
            console.error("Discord callback error:", err);
            return res.redirect("/error?discord=failed");
        }
    }
};

module.exports = discordConnectController;
