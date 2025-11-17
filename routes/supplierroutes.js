const express = require('express');
const router = express.Router();
const supplierController = require('../controlers/suppliercontroller');
const { isAuthenticated } = require('../middleware/authmiddleware');
const multer = require('multer');

const storage = multer.memoryStorage(); // simpan di memory dulu
const upload = multer({ storage });

router.get('/',isAuthenticated, supplierController.getAll);
router.get('/datasupplier',isAuthenticated, supplierController.getAllAjax);
router.get('/detail/:id', supplierController.getOne);

router.get('/tambah',isAuthenticated, supplierController.addForm);
router.post('/tambah',isAuthenticated, upload.single('foto'), supplierController.create);

router.get('/edit/:id',isAuthenticated, supplierController.editForm);
router.post('/edit/:id',isAuthenticated, upload.single('foto'), supplierController.update);

router.get('/delete/:id',isAuthenticated, supplierController.delete);

module.exports = router;
