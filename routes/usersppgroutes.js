const express = require('express');
const router = express.Router();
const userSppgController = require('../controlers/usersppgcontroller');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const { isSPPG } = require('../middleware/authmiddleware');

// Dashboard sekolah
router.get('/', isSPPG, userSppgController.dashboard);

//sekolah (tanopa Read only)
router.get('/sekolah', isSPPG, userSppgController.getSekolahSPPG);
router.get('/getallsekolah', isSPPG, userSppgController.getAllsekolahAJAX);
router.get('/sekolah/:id', isSPPG, userSppgController.getOneSekolahSPPG);

//supplier (CRUD)
router.get('/supplier', isSPPG, userSppgController.getSupplierSPPG);
router.get('/getallsupplier', isSPPG, userSppgController.getAllSupplierAJAX);


router.get('/supplier/tambah', isSPPG, userSppgController.addFormSupplierSPPG);
router.post('/supplier/tambah', isSPPG, upload.single('foto'), userSppgController.createSupplierSPPG);

router.get('/supplier/edit/:id', isSPPG, userSppgController.editFormSupplierSPPG);
router.post('/supplier/edit/:id', isSPPG, upload.single('foto'), userSppgController.updateSupplierSPPG);

router.get('/supplier/delete/:id', isSPPG, userSppgController.deleteSupplierSPPG);

router.get('/supplier/detail/:id', isSPPG, userSppgController.getOneSupplierSPPG);

//peringatan
router.get('/peringatan', isSPPG, userSppgController.getAllPeringatan);
router.get('/peringatan/:id', isSPPG, userSppgController.getOnePeringatan);

//Peringatan
router.post('/peringatan/sendmedical/:id', isSPPG, userSppgController.SendMedTeam);
router.post('/peringatan/notify/:id', isSPPG, userSppgController.SendDevTeamNotification);

router.get('/menu', isSPPG, userSppgController.getMenu);
router.post('/menu/edit/:id', isSPPG, userSppgController.updateMenu);

router.get('/laporan', isSPPG, userSppgController.getLaporan);
router.get('/laporan/:id', isSPPG, userSppgController.getOneLaporan);



module.exports = router;
