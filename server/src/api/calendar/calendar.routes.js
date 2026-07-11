const express = require('express');
const router = express.Router();
const calendarController = require('./calendar.controller');
const { authenticate } = require('../../common/middleware/auth.middleware');

router.get('/auth', authenticate, calendarController.getAuthUrl);


router.get('/status', authenticate, calendarController.getStatus);

router.post('/disconnect', authenticate, calendarController.disconnect);

router.get('/callback', calendarController.handleCallback.bind(calendarController));

module.exports = router;
