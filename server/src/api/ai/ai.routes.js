const express = require('express');
const router = express.Router({ mergeParams: true });
const aiController = require('./ai.controller');
const validate = require('../../common/middleware/validate.middleware');
const { authenticate, authorize } = require('../../common/middleware/auth.middleware');
const { submitSymptomsSchema, submitNotesSchema } = require('./ai.schema');

// Submit symptoms (Patient only)
router.post(
  '/symptoms', 
  authenticate, 
  authorize('patient'), 
  validate(submitSymptomsSchema), 
  aiController.submitSymptoms
);

// Submit clinical notes (Doctor only)
router.post(
  '/notes', 
  authenticate, 
  authorize('doctor'), 
  validate(submitNotesSchema), 
  aiController.submitClinicalNotes
);

module.exports = router;
