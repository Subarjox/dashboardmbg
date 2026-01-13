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
router.get('/siswa/tambah', isSekolah, userSekolahController.addSiswaForm);
router.post('/siswa/tambah', isSekolah, upload.single('foto'), userSekolahController.createSiswa);


router.get('/siswa/edit/:id', isSekolah, userSekolahController.editSiswaForm);
router.post('/siswa/edit/:id', isSekolah, upload.single('foto'), userSekolahController.updateSiswa);

router.get('/siswa/delete/:id', isSekolah, userSekolahController.deleteSiswa);

router.get('/siswa/:id', isSekolah, userSekolahController.getOne);

// Edit profil sekolah
router.get('/profile', isSekolah, userSekolahController.profileSekolah);

router.get('/profile/edit/:id', isSekolah, userSekolahController.FormUpdateProfileSekolah);
router.post('/profile/edit/:id', isSekolah, upload.single('foto'), userSekolahController.UpdateProfileSekolah);

//peringatan
router.get('/peringatan', isSekolah, userSekolahController.getPeringatan);
router.post('/peringatan/keracunan', isSekolah, userSekolahController.updateKasusKeracunan);
router.post('/peringatan/sistem_down', isSekolah, userSekolahController.updateStatusSistem);

//laporan
router.get('/laporan', isSekolah, userSekolahController.getLaporan);
router.get('/laporan/buat', isSekolah, userSekolahController.BuatLaporanForm);
router.post('/laporan/buat', isSekolah, userSekolahController.BuatLaporan);
router.get('/laporan/baca/:id', isSekolah, userSekolahController.ReadOneLaporan);

router.get('/menu', isSekolah, userSekolahController.getOneMenu);

module.exports = router;
