const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authmiddleware');
const MasalahController = require('../controlers/masalahcontroller');

router.get('/', isAuthenticated, MasalahController.getAll);

router.get('/detail/:id', isAuthenticated, MasalahController.getOne);

// //masalah sistem
router.post('/sendteam/:id', isAuthenticated, MasalahController.SendDevTeam);

// //masalah keracunan
router.post('/notify/:id', isAuthenticated, MasalahController.SendSPPGTeam);

module.exports = router;
