const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authmiddleware');
const DashboardController = require('../controlers/dashboardcontroller');

// GET /dashboard
router.get('/', isAuthenticated, DashboardController.dashboard);

module.exports = router;
