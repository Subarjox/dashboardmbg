const express = require('express');
const router = express.Router();
const profileController = require('../controlers/profilecontoller');
const { isAuthenticated } = require('../middleware/authmiddleware');
const multer = require('multer');

const storage = multer.memoryStorage(); // simpan di memory dulu
const upload = multer({ storage });

router.get('/', isAuthenticated, profileController.getprofile);

router.get('/edit/:id', isAuthenticated, profileController.editprofileform);
router.post('/edit/:id', isAuthenticated, upload.single('foto'), profileController.editprofile);

module.exports = router;

