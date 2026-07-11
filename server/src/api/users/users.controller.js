const usersService = require('./users.service');
const { successResponse, errorResponse } = require('../../common/utils/response');

class UsersController {
  async uploadProfileImage(req, res) {
    try {
      if (!req.file) {
        return errorResponse(res, 400, 'No image file provided');
      }
      const userId = req.user.id;
      const imageUrl = req.file.path;
      const user = await usersService.updateProfileImage(userId, imageUrl);
      successResponse(res, 200, 'Profile image updated successfully', user);
    } catch (error) {
      errorResponse(res, error.statusCode || 500, error.message || 'Internal server error');
    }
  }
}

module.exports = new UsersController();
