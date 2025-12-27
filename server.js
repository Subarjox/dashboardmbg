require("dotenv").config();
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const { createClient } = require("@supabase/supabase-js");
const { isAuthenticated, isSekolah } = require("./middleware/authmiddleware");

const app = express();

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

  const { data, error } = await supabase
    .from('users')
    .insert([{ nama, email, username, password: hashedPassword }])
    .select();

  if (error) {
    console.log(error);
    return res.render("register", { error: error.message });
  }

  res.render("login", { message: "Register berhasil! Silakan login." });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  //user_admin
  //user_admin
  try {
    const { data: adminData, error: adminError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (adminError) throw adminError;

    if (adminData && adminData.length > 0) {
      const admin = adminData[0];
      const match = await bcrypt.compare(password, admin.password);

      if (!match) return res.render('login', { error: 'Password salah!' });

      req.session.user = {
        id: admin.id,
        nama: admin.nama,
        email: admin.email,
        role: "admin",
      };

      console.log('✅ Login sebagai ADMIN:', admin.email);
      sendDiscordNotification({ nama: admin.nama, email: admin.email }, 'admin');
      return res.redirect('/dashboard');
    }

    //User_Sekolah
    const { data: sekolahData, error: sekolahError } = await supabase
      .from("sekolah")
      .select("*")
      .eq("email_sekolah", email)
      .limit(1);

    if (sekolahError) throw sekolahError;

    if (sekolahData && sekolahData.length > 0) {
      const sekolah = sekolahData[0];
      const match = await bcrypt.compare(password, sekolah.password_sekolah);

      if (!match) return res.render('login', { error: 'Password salah!' },
        console.log('pass salah')
      );

      req.session.user = {
        id_sekolah: sekolah.id_sekolah,
        nama: sekolah.nama_sekolah,
        email: sekolah.email_sekolah,
        role: "sekolah",
      };

      console.log('✅ Login sebagai SEKOLAH:', sekolah.email_sekolah);
      sendDiscordNotification({ nama_sekolah: sekolah.nama_sekolah, email_sekolah: sekolah.email_sekolah }, 'sekolah');
      return res.redirect('/user/sekolah');
    }

    //User_SPPG
    const { data: sppgData, error: sppgError } = await supabase
      .from('satuan_gizi')
      .select('*')
      .eq('email_sppg', email)
      .limit(1);

    if (sppgError) throw sppgError;

    if (sppgData && sppgData.length > 0) {
      const sppg = sppgData[0];
      const match = await bcrypt.compare(password, sppg.password_sppg);

      if (!match) return res.render('login', { error: 'Password salah!' },
        console.log('pass salah')
      );

      req.session.user = {
        id_sppg: sppg.id_sppg,
        nama: sppg.nama_sppg,
        email: sppg.email_sppg,
        role: "sppg",
      };

      console.log('✅ Login sebagai SPPG:', sppg.email_sppg);
      // Send notification (non-blocking)
      sendDiscordNotification({ nama_sppg: sppg.nama_sppg, email_sppg: sppg.email_sppg }, 'sppg');
      return res.redirect('/');
    }

    return res.render("login", { error: "Akun tidak ditemukan!" });
  } catch (err) {
    console.error(" Error saat login:", err);
    res.render("login", { error: "Terjadi kesalahan server." });
  }
});

app.get("/analitik", (req, res) => {
  res.render("analitik");
});

const dashboardRoutes = require('./routes/dashboardroutes');
app.use('/dashboard', dashboardRoutes);

const masalahRoutes = require('./routes/masalahroutes');
app.use('/masalah', masalahRoutes);

const siswaRoutes = require('./routes/siswaroutes');
app.use('/siswa', siswaRoutes);

const sekolahRoutes = require("./routes/sekolahroutes");
app.use("/sekolah", sekolahRoutes);

const supplierRoutes = require('./routes/supplierroutes');
app.use('/supplier', supplierRoutes);

const sppgRoutes = require('./routes/sppgroutes');
app.use('/sppg', sppgRoutes);


//user routes
const usersekolahRoutes = require('./routes/usersekolahroutes');
app.use('/user/sekolah', usersekolahRoutes);

// const usersppgRoutes = require('./routes/usersppgroutes');
// app.use('/user/sppg', usersppgRoutes);



app.get('/tes', isSekolah, (req, res) => res.render('users/pihak_sekolah/pihak_sekolah'));
app.get('/laporan', isAuthenticated, (req, res) => res.render('laporan'));


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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Running, http://localhost:${PORT}`));
