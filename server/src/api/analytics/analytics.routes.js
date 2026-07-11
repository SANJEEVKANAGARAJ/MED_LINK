const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const { authenticate, authorize } = require('../../common/middleware/auth.middleware');

router.get('/dashboard', authenticate, authorize('admin'), analyticsController.getDashboardMetrics);

module.exports = router;
