const express = require('express');
const router = express.Router();
const userSekolahController = require('../controllers/usersekolahcontroller');
const multer = require('multer');
const storage = multer.memoryStorage(); // simpan di memory dulu
const upload = multer({ storage });
const { isSekolah } = require('../middleware/authmiddleware');

// Dashboard sekolah
router.get('/user/sekolah/dashboard', isSekolah, userSekolahController.dashboard);

// CRUD siswa
router.get('/siswa', isSekolah, userSekolahController.getSiswa);
router.get('/siswa/tambah', isSekolah, userSekolahController.addSiswaForm);
router.post('/siswa/tambah', isSekolah, upload.single('foto_siswa'), userSekolahController.createSiswa);
router.get('/siswa/edit/:id', isSekolah, userSekolahController.editSiswaForm);
router.post('/siswa/edit/:id', isSekolah, upload.single('foto_siswa'), userSekolahController.updateSiswa);
router.get('/siswa/hapus/:id', isSekolah, userSekolahController.deleteSiswa);

// Edit profil sekolah
router.get('/edit', isSekolah, userSekolahController.editSekolahForm);
router.post('/edit', isSekolah, upload.single('foto_sekolah'), userSekolahController.updateSekolah);

module.exports = router;
