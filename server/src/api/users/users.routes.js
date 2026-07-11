const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const { authenticate } = require('../../common/middleware/auth.middleware');
const upload = require('../../common/middleware/upload.middleware');

router.post('/profile-image', authenticate, upload.single('image'), usersController.uploadProfileImage);

module.exports = router;
