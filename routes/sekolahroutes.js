const express = require('express');
const router = express.Router();
const sekolahController = require('../controlers/sekolahcontroller');
const { isAuthenticated } = require('../middleware/authmiddleware');
const multer = require('multer');

const storage = multer.memoryStorage(); // simpan file di memory sebelum upload ke Supabase
const upload = multer({ storage });

// ROUTES

// Halaman utama daftar sekolah
router.get('/', isAuthenticated, sekolahController.getAll);

router.get('/detail/:id', isAuthenticated, sekolahController.getOne);

// Form tambah sekolah
router.get('/tambah', isAuthenticated, sekolahController.addForm);
router.post('/tambah', isAuthenticated, upload.single('foto'), sekolahController.create);

// Form update sekolah
router.get('/update/:id', isAuthenticated, sekolahController.editForm);
router.post('/update/:id', isAuthenticated, upload.single('foto'), sekolahController.update);

// Hapus sekolah
router.get('/delete/:id', isAuthenticated, sekolahController.delete);

module.exports = router;
