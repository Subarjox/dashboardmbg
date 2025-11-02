const express = require('express');
const router = express.Router();
const  sppgController = require('../controlers/sppgcontroller');
const { isAuthenticated } = require('../middleware/authmiddleware');
const multer = require('multer');

const storage = multer.memoryStorage(); // simpan di memory dulu
const upload = multer({ storage });

// ROUTES
router.get('/', isAuthenticated, sppgController.getAll);

router.get('/datasppg', isAuthenticated, sppgController.getAllAjax);

router.get('/detail/:id', isAuthenticated, sppgController.getOne);

// Submit tambah siswa (pakai multer)
router.get('/tambah', isAuthenticated, sppgController.addForm);
router.post('/tambah', isAuthenticated, upload.single('foto'), sppgController.create);

// Update & Delete
router.get('/update/:id', isAuthenticated, sppgController.editForm);
router.post('/update/:id', isAuthenticated, upload.single('foto'), sppgController.update);

router.get('/delete/:id', sppgController.delete);

module.exports = router;
