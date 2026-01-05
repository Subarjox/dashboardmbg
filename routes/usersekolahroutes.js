const express = require('express');
const router = express.Router();
const userSekolahController = require('../controlers/usersekolahcontroller');
const multer = require('multer');
const storage = multer.memoryStorage(); // simpan di memory dulu
const upload = multer({ storage });
const { isSekolah } = require('../middleware/authmiddleware');

// Dashboard sekolah
router.get('/', isSekolah, userSekolahController.dashboard);
router.get('/getallsiswa', isSekolah, userSekolahController.getAllSiswaAjax);

// CRUD siswa
router.get('/siswa', isSekolah, userSekolahController.getSiswa);
router.get('/siswa/:id', isSekolah, userSekolahController.getOne);
router.get('/siswa/tambah', isSekolah, userSekolahController.addSiswaForm);
router.post('/siswa/tambah', isSekolah, upload.single('foto'), userSekolahController.createSiswa);

router.get('/siswa/edit/:id', isSekolah, userSekolahController.editSiswaForm);
router.post('/siswa/edit/:id', isSekolah, upload.single('foto'), userSekolahController.updateSiswa);

router.get('/siswa/hapus/:id', isSekolah, userSekolahController.deleteSiswa);

// Edit profil sekolah
router.get('/edit', isSekolah, userSekolahController.editSekolahForm);
router.post('/edit', isSekolah, upload.single('foto'), userSekolahController.updateSekolah);

//peringatan
router.get('/peringatan', isSekolah, userSekolahController.getPeringatan);
router.post('/peringatan/keracunan', isSekolah, userSekolahController.updateKasusKeracunan);
router.post('/peringatan/sistem_down', isSekolah, userSekolahController.updateStatusSistem);

//laporan
router.get('/laporan', isSekolah, userSekolahController.getLaporan);
router.get('/laporan/buat', isSekolah, userSekolahController.BuatLaporanForm);
router.post('/laporan/buat', isSekolah, userSekolahController.BuatLaporan);

module.exports = router;
