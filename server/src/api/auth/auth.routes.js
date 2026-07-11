const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const validate = require('../../common/middleware/validate.middleware');
const { registerPatientSchema, loginSchema } = require('./auth.schema');

router.post('/register', validate(registerPatientSchema), authController.registerPatient);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
