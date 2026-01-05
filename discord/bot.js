require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
} = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
  ],
});


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


const commands = [
  new SlashCommandBuilder()
    .setName("register")
    .setDescription("Hubungkan akun Discord dengan SPPG")
    .addStringOption(opt =>
      opt
        .setName("id_sppg")
        .setDescription("ID SPPG kamu")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("unlink")
    .setDescription("Putuskan koneksi Discord dari SPPG"),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(
  process.env.DISCORD_BOT_TOKEN
);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_APP_ID,
        process.env.DISCORD_GUILD_ID
      ),
      { body: commands }
    );

    console.log("✅ Slash commands (register & unlink) berhasil didaftarkan");

  } catch (err) {
    console.error("❌ Gagal daftar command:", err);
  }
})();

client.once("clientReady", () => {
  console.log(`🤖 Bot login sebagai ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const discordId = interaction.user.id;

  try {
    // ACK SEKALI SAJA
    await interaction.deferReply({ flags: 64 });

    /* ================= REGISTER ================= */
    if (interaction.commandName === "register") {
      const idSPPG = interaction.options.getString("id_sppg");

      // cek discord sudah dipakai
      const { data: discordUsed } = await supabase
        .from("satuan_gizi")
        .select("id_sppg, nama_sppg")
        .eq("discord_acc", discordId)
        .maybeSingle();

      if (discordUsed) {
        return await interaction.editReply(
          `❌ Discord ini sudah terhubung ke **${discordUsed.nama_sppg}** (ID: ${discordUsed.id_sppg})`
        );
      }

      // cek SPPG
      const { data: sppg } = await supabase
        .from("satuan_gizi")
        .select("id_sppg, nama_sppg, discord_acc")
        .eq("id_sppg", idSPPG)
        .maybeSingle();

      if (!sppg) {
        return await interaction.editReply("❌ ID SPPG tidak ditemukan.");
      }

      if (sppg.discord_acc) {
        return await interaction.editReply(
          `❌ SPPG **${sppg.nama_sppg}** sudah terhubung ke Discord lain.`
        );
      }

      const { error } = await supabase
        .from("satuan_gizi")
        .update({ discord_acc: discordId })
        .eq("id_sppg", idSPPG);

      if (error) {
        return await interaction.editReply(
          "❌ Gagal menyimpan data. Silakan coba lagi."
        );
      }

      return await interaction.editReply(
        `✅ **Berhasil terhubung!**\n\n🏫 SPPG: **${sppg.nama_sppg}**\n🆔 ID: **${sppg.id_sppg}**`
      );
    }

    /* ================= UNLINK ================= */
    else if (interaction.commandName === "unlink") {
      const { data: sppg } = await supabase
        .from("satuan_gizi")
        .select("id_sppg, nama_sppg")
        .eq("discord_acc", discordId)
        .maybeSingle();

      if (!sppg) {
        return await interaction.editReply(
          "❌ Discord kamu **belum terhubung** ke akun SPPG mana pun."
        );
      }

      const { error } = await supabase
        .from("satuan_gizi")
        .update({ discord_acc: null })
        .eq("id_sppg", sppg.id_sppg);

      if (error) {
        return await interaction.editReply(
          "❌ Gagal memutuskan koneksi. Coba lagi."
        );
      }

      return await interaction.editReply(
        `✅ **Berhasil unlink**\n\n🏫 SPPG: **${sppg.nama_sppg}**\n🆔 ID: **${sppg.id_sppg}**`
      );
    }

  } catch (err) {
    console.error("INTERACTION ERROR:", err);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("❌ Terjadi kesalahan internal.");
    }
  }
});


client.login(process.env.DISCORD_BOT_TOKEN);
