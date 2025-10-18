const express = require('express');
const router = express.Router();
const siswaController = require('../controlers/siswacontroller');
const { isAuthenticated } = require('../middleware/authmiddleware');
const multer = require('multer');

const storage = multer.memoryStorage(); // simpan di memory dulu
const upload = multer({ storage });

// ROUTES
router.get('/', isAuthenticated, siswaController.getAll);

router.get('/detail/:id', isAuthenticated, siswaController.getOne);

// Form tambah
// Submit tambah siswa (pakai multer)
router.get('/tambah', isAuthenticated, siswaController.addForm);
router.post('/tambah', isAuthenticated, upload.single('foto'), siswaController.create);

// Update & Delete
router.get('/update/:id', isAuthenticated, siswaController.editForm);
router.post('/update/:id', isAuthenticated, upload.single('foto'), siswaController.update);

router.get('/delete/:id', siswaController.delete);

module.exports = router;
