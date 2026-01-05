const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authmiddleware');
const laporanController = require('../controlers/laporancontroller');


router.get("/", isAuthenticated, laporanController.getAll);

router.post('/baca/:id', laporanController.markAsRead);
router.get('/detail/:id', laporanController.getOne);


module.exports = router;