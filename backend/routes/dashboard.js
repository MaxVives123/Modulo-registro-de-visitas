const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

router.use(authMiddleware);

router.get('/stats', dashboardController.getStats);
router.get('/activity', dashboardController.getActivityChart);
router.get('/destinations', dashboardController.getDestinationChart);
router.get('/recent', dashboardController.getRecentVisits);

module.exports = router;
