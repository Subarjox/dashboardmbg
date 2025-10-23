require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');
const { isAuthenticated } = require('./middleware/authmiddleware');

const app = express();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  const path = req.path.replace(/\/$/, ""); // hapus trailing slash
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
  res.locals.pageBreadcrumb = [
    { name: "Dashboard", href: "/dashboard" }
  ];

  next();
});

// Routes
app.get('/', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
  const { nama, email,username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert([{nama, email, username, password: hashedPassword }])
    .select();

  if (error) {
    console.log(error);
    return res.render('register', { error: error.message });
  }

  res.render('login', { message: 'Register berhasil! Silakan login.' });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1);

  if (error || users.length === 0) {
    return res.render('login', { error: 'Email tidak ditemukan' });
  }

  const user = users[0];
  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    console.log('Password salah');
    return res.render('login', { error: 'Password salah' });
  }

  req.session.user = {   
    id: user.id, 
    email: user.email, 
    nama: user.nama };
  res.redirect('/dashboard');
});

app.get('/dashboard', isAuthenticated, (req, res) => res.render('dashboard', { user: req.session.user }));

const siswaRoutes = require('./routes/siswaroutes');
app.use('/siswa', siswaRoutes);

const sekolahRoutes = require('./routes/sekolahroutes');
app.use('/sekolah', sekolahRoutes);

const supplierRoutes = require('./routes/supplierroutes');
app.use('/supplier', supplierRoutes);

app.get('/tes', isAuthenticated, (req, res) => res.render('detail_siswa'));
app.get('/supplier', isAuthenticated, (req, res) => res.render('supplier'));
app.get('/tray', isAuthenticated, (req, res) => res.render('tray/tray'));
app.get('/laporan', isAuthenticated, (req, res) => res.render('laporan'));


// LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
