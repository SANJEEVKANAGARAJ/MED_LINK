const express = require('express');
const router = express.Router();
const reviewsController = require('./reviews.controller');
const { authenticate } = require('../../common/middleware/auth.middleware');
const { authorize } = require('../../common/middleware/auth.middleware');

// Patient submits a review after an appointment
router.post('/reviews', authenticate, authorize('patient'), reviewsController.submitReview.bind(reviewsController));

// Public — get all reviews for a doctor
router.get('/reviews/doctor/:doctorId', reviewsController.getDoctorReviews.bind(reviewsController));

module.exports = router;
