const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authmiddleware');
const MasalahController = require('../controlers/masalahcontroller');

router.get('/', isAuthenticated, MasalahController.getAll);

module.exports = router;
