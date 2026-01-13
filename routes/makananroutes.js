const express = require('express');
const router = express.Router();
const makananController = require('../controlers/makanancontroller');
const multer = require('multer');
const storage = multer.memoryStorage();
const { isAuthenticated } = require('../middleware/authmiddleware');


router.get('/', isAuthenticated, makananController.getAll);
router.get('/detail/:id', isAuthenticated, makananController.getOne);
router.get('/getallmenu', isAuthenticated, makananController.getAllAjax);

module.exports = router;
