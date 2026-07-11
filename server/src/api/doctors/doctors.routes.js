const express = require('express');
const router = express.Router();
const doctorsController = require('./doctors.controller');
const validate = require('../../common/middleware/validate.middleware');
const { authenticate, authorize } = require('../../common/middleware/auth.middleware');
const { createDoctorSchema, updateDoctorSchema, availabilitySchema, leaveSchema } = require('./doctors.schema');

// Middleware to ensure a doctor can only modify their own schedule unless they are an admin
const isOwnerOrAdmin = (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (req.user.role === 'doctor' && req.user.id === req.params.id) return next();
  
  return res.status(403).json({
    success: false,
    message: 'Forbidden. You can only manage your own schedule.',
  });
};

// Public / Authenticated Read Operations
router.get('/', authenticate, doctorsController.getAllDoctors);

// Get current logged-in doctor profile
router.get(
  '/me',
  authenticate,
  authorize('doctor'),
  doctorsController.getMe
);

router.get('/:id', authenticate, doctorsController.getDoctorById);
router.get('/:id/availability', authenticate, doctorsController.getAvailability);

// Admin-only CRUD Operations
router.post('/', authenticate, authorize('admin'), validate(createDoctorSchema), doctorsController.createDoctor);
router.put('/:id', authenticate, authorize('admin'), validate(updateDoctorSchema), doctorsController.updateDoctor);
router.delete('/:id', authenticate, authorize('admin'), doctorsController.deleteDoctor);

// Schedule Management (Doctor or Admin)
router.post(
  '/:id/availability', 
  authenticate, 
  authorize('admin', 'doctor'), 
  isOwnerOrAdmin, 
  validate(availabilitySchema), 
  doctorsController.setAvailability
);

router.get('/:id/leave', authenticate, doctorsController.getLeave);

router.post(
  '/:id/leave', 
  authenticate, 
  authorize('admin', 'doctor'), 
  isOwnerOrAdmin, 
  validate(leaveSchema), 
  doctorsController.addLeave
);

router.delete(
  '/:id/leave/:date', 
  authenticate, 
  authorize('admin', 'doctor'), 
  isOwnerOrAdmin, 
  doctorsController.removeLeave
);

module.exports = router;
