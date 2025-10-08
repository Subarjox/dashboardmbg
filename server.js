const express = require('express');
const path = require('path'); 
const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get('/', (req, res) => {
  res.render('dashboard'); 
});

app.get('/test', (req, res) => {
  res.render('berita'); 
});

app.get('/sekolah', (req, res) => {
  res.render('sekolah'); 
});

app.listen(3000, () => {
  console.log('listening on port 3000');
});