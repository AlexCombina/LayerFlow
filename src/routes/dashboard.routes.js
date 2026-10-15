const { Router } = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

router.get('/stats', requireAuth, dashboardController.stats);

module.exports = router;
