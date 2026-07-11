const express = require('express');
const router = express.Router();
const patientsController = require('./patients.controller');
const validate = require('../../common/middleware/validate.middleware');
const { authenticate, authorize } = require('../../common/middleware/auth.middleware');
const { updatePatientSchema, searchPatientSchema } = require('./patients.schema');

// Middleware to ensure a patient can only access their own data, while doctors/admins have full access
const isOwnerOrClinical = async (req, res, next) => {
  if (['admin', 'doctor'].includes(req.user.role)) return next();

  // We need to fetch the user_id of the target patient to compare.
  
  try {
    const db = require('../../db');
    const result = await db.query('SELECT user_id FROM patients WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    
    if (result.rows[0].user_id === req.user.id) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Forbidden. You can only access your own profile.',
    });
  } catch (error) {
    next(error);
  }
};

// Global Clinical Access (Doctors/Admins)
router.get(
  '/', 
  authenticate, 
  authorize('admin', 'doctor'), 
  validate(searchPatientSchema, 'query'), 
  patientsController.searchPatients
);

// Get current logged-in patient profile
router.get(
  '/me',
  authenticate,
  authorize('patient'),
  patientsController.getMe
);

// Targeted Access (Specific Patient, Doctor, or Admin)
router.get(
  '/:id', 
  authenticate, 
  isOwnerOrClinical, 
  patientsController.getPatientById
);

router.put(
  '/:id', 
  authenticate, 
  isOwnerOrClinical, 
  validate(updatePatientSchema), 
  patientsController.updatePatient
);

router.get(
  '/:id/history', 
  authenticate, 
  isOwnerOrClinical, 
  patientsController.getPatientHistory
);

// Doctor-only: fetch pre-visit symptoms & AI summary for a specific appointment
router.get(
  '/appointment/:appointmentId/symptoms',
  authenticate,
  authorize('doctor', 'admin'),
  patientsController.getAppointmentSymptoms
);

module.exports = router;
