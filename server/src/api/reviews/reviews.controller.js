const reviewsService = require('./reviews.service');
const { successResponse } = require('../../common/utils/response');

class ReviewsController {
  async submitReview(req, res, next) {
    try {
      const review = await reviewsService.submitReview(req.user.id, req.body);
      return successResponse(res, 201, 'Review submitted successfully', review);
    } catch (error) { next(error); }
  }

  async getDoctorReviews(req, res, next) {
    try {
      const data = await reviewsService.getDoctorReviews(req.params.doctorId);
      return successResponse(res, 200, 'Reviews fetched', data);
    } catch (error) { next(error); }
  }
}

module.exports = new ReviewsController();
