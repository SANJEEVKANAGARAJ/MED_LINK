const express = require('express');
const router = express.Router();
const prescriptionsController = require('./prescriptions.controller');

router.post('/appointments/:appointmentId/prescriptions', prescriptionsController.createPrescription);

module.exports = router;
