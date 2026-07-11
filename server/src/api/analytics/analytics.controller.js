const analyticsService = require('./analytics.service');
const { successResponse } = require('../../common/utils/response');

class AnalyticsController {
  async getDashboardMetrics(req, res, next) {
    try {
      const metrics = await analyticsService.getDashboardMetrics();
      return successResponse(res, 200, 'Analytics metrics fetched successfully', metrics);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
