require("dotenv").config();
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const { createClient } = require("@supabase/supabase-js");
const { isAuthenticated, isSekolah } = require("./middleware/authmiddleware");



const app = express();
app.use('/vendor', express.static('node_modules'));

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function sendDiscordNotification(user, role) {
  const webhookUrl = process.env.DISCORD_LOGIN_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('⚠️ DISCORD_LOGIN_WEBHOOK_URL not set, skipping notification.');
    return;
  }

  const embed = {
    title: "🔔 User Login Notification",
    color: 0x00FF00,
    fields: [
      { name: "Name", value: user.nama || user.nama_sekolah || user.nama_sppg || "Unknown", inline: true },
      { name: "Email", value: user.email || user.email_sekolah || user.email_sppg || "Unknown", inline: true },
      { name: "Role", value: role.toUpperCase(), inline: true },
      { name: "Time", value: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }), inline: false }
    ],
    footer: { text: "FoodGuard System" },
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

async function sendRequestNotification(data) {
  const webhookUrl = process.env.DISCORD_ACCOUNT_REQUEST_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('⚠️ DISCORD_ACCOUNT_REQUEST_WEBHOOK_URL not set, skipping notification.');
    return;
  }

  const embed = {
    title: "Account Request Notification",
    color: 0x00FF00,
    fields: [
      { name: "Nama Akun", value: data.nama || "Unknown", inline: true },
      { name: "ID Akun / NPSN ", value: data.id || "Unknown", inline: true },
      { name: "No Telp", value: data.no_telp || "Unknown", inline: true },
      { name: "Alamat", value: data.alamat || "Unknown", inline: true },
      { name: "Email", value: data.email || "Unknown", inline: true },
      { name: "Jenis Akun", value: data.jenis_akun || "Unknown", inline: true },
      { name: "Time", value: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }), inline: false }
    ],
    footer: { text: "FoodGuard System - Account Request" },
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

app.use('/vendor', express.static('node_modules'));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.use((req, res, next) => {
  const path = req.path.replace(/\/$/, "");
  res.locals.currentPath = path;
  res.locals.isActive = (matchPath, options = { exact: false }) => {
    if (!matchPath) return false;
    matchPath = matchPath.replace(/\/$/, "");
    if (options.exact) return path === matchPath;
    return path.startsWith(matchPath);
  };
  next();
});

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;

  res.locals.pageTitle = "Dashboard";
  res.locals.pageBreadcrumb = [{ name: "Dashboard", href: "/dashboard" }];

  next();
});

// Routes
app.get('/', (req, res) => {
  const flash = req.session.flash;
  delete req.session.flash;

  res.render('login', {
    message: flash?.message || null,
    type: flash?.type || null
  });
});

app.get('/register', (req, res) => res.render('register'));
app.post('/register', async (req, res) => {
  const { nama, email, username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const { error } = await supabase
    .from('users')
    .insert([{ nama, email, username, password: hashedPassword }]);

  if (error) {
    console.log(error);
    req.session.flash = {
      type: 'error',
      message: error.message
    };
    return res.redirect('/register');
  }

  req.session.flash = {
    type: 'success',
    message: 'Register berhasil! Silakan login.'
  };

  res.redirect('/');
});


app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // ================= ADMIN =================
    const { data: adminData, error: adminError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (adminError) throw adminError;

    if (adminData?.length) {
      const admin = adminData[0];
      const match = await bcrypt.compare(password, admin.password);

      if (!match) {
        req.session.flash = {
          type: 'error',
          message: 'Password salah'
        };
        return res.redirect('/');
      }

      req.session.user = {
        id: admin.id,
        nama: admin.nama,
        email: admin.email,
        foto: admin.foto,
        role: "admin",
      };

      sendDiscordNotification({ nama: admin.nama, email: admin.email }, 'admin');
      return res.redirect('/dashboard');
    }

    // ================= SEKOLAH =================
    const { data: sekolahData, error: sekolahError } = await supabase
      .from("sekolah")
      .select("*")
      .eq("email_sekolah", email)
      .limit(1);

    if (sekolahError) throw sekolahError;

    if (sekolahData?.length) {
      const sekolah = sekolahData[0];
      const match = await bcrypt.compare(password, sekolah.password_sekolah);

      if (!match) {
        req.session.flash = {
          type: 'error',
          message: 'Password salah'
        };
        return res.redirect('/');
      }

      req.session.user = {
        id_sekolah: sekolah.id_sekolah,
        nama: sekolah.nama_sekolah,
        email: sekolah.email_sekolah,
        foto: sekolah.foto_sekolah,
        role: "sekolah",
      };

      sendDiscordNotification(
        { nama_sekolah: sekolah.nama_sekolah, email_sekolah: sekolah.email_sekolah },
        'sekolah'
      );

      return res.redirect('/user/sekolah');
    }

    // ================= SPPG =================
    const { data: sppgData, error: sppgError } = await supabase
      .from('satuan_gizi')
      .select('*')
      .eq('email_sppg', email)
      .limit(1);

    if (sppgError) throw sppgError;

    if (sppgData?.length) {
      const sppg = sppgData[0];
      const match = await bcrypt.compare(password, sppg.password_sppg);

      if (!match) {
        req.session.flash = {
          type: 'error',
          message: 'Password salah'
        };
        return res.redirect('/');
      }

      req.session.user = {
        id_sppg: sppg.id_sppg,
        nama: sppg.nama_sppg,
        email: sppg.email_sppg,
        foto: sppg.foto_sppg,
        role: "sppg",
      };

      sendDiscordNotification(
        { nama_sppg: sppg.nama_sppg, email_sppg: sppg.email_sppg },
        'sppg'
      );

      return res.redirect('/user/sppg');
    }

    // ================= AKUN TIDAK DITEMUKAN =================
    req.session.flash = {
      type: 'error',
      message: 'Akun tidak ditemukan!'
    };
    res.redirect('/');

  } catch (err) {
    console.error("Error saat login:", err);

    req.session.flash = {
      type: 'error',
      message: 'Terjadi kesalahan server.'
    };
    res.redirect('/');
  }
});


//request
app.get('/request', async (req, res) => {
  res.render('request');
});

app.post('/request', async (req, res) => {
  const data = req.body;
  await sendRequestNotification(data);

  req.session.flash = {
    type: 'success',
    message: 'Permohonan berhasil dikirim!. Akun akan dikirim lewat email dalam 1 x 24 Jam'
  };

  res.redirect('/');
});

const dashboardRoutes = require('./routes/dashboardroutes');
app.use('/dashboard', dashboardRoutes);

const masalahRoutes = require('./routes/masalahroutes');
app.use('/masalah', masalahRoutes);

const siswaRoutes = require('./routes/siswaroutes');
app.use('/siswa', siswaRoutes);

const sekolahRoutes = require("./routes/sekolahroutes");
app.use("/sekolah", sekolahRoutes);

const laporanRoutes = require("./routes/laporanroutes");
app.use("/laporan", laporanRoutes);

const supplierRoutes = require('./routes/supplierroutes');
app.use('/supplier', supplierRoutes);

const sppgRoutes = require('./routes/sppgroutes');
app.use('/sppg', sppgRoutes);

const profileRoutes = require('./routes/profileroutes');
app.use('/profile', profileRoutes);


//user routes
const usersekolahRoutes = require('./routes/usersekolahroutes');
app.use('/user/sekolah', usersekolahRoutes);

const usersppgRoutes = require('./routes/usersppgroutes');
app.use('/user/sppg', usersppgRoutes);


// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// handle 404
app.use((req, res, next) => {
  res.status(404).render("404", {
    pageTitle: "404 - Halaman Tidak Ditemukan",
    pageCrumb: "Error 404",
  });
});

app.use((req, res, next) => {
  res.status(500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510).render("500", {
    pageTitle: "500 - Internal Server Error",
    pageCrumb: "Error 500",
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Running, http://localhost:${PORT}`));
