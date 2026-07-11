const authService = require('./auth.service');
const { successResponse } = require('../../common/utils/response');

class AuthController {
  async registerPatient(req, res, next) {
    try {
      const { user, accessToken, refreshToken } = await authService.registerPatient(req.body);

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return successResponse(res, 201, 'Patient registered successfully', { user, accessToken });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } = await authService.login(email, password);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return successResponse(res, 200, 'Login successful', { user, accessToken });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      res.clearCookie('refreshToken');
      return successResponse(res, 200, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }
  async forgotPassword(req, res, next) {
    try {
      await authService.forgotPassword(req.body.email);
      return successResponse(res, 200, 'If an account exists with that email, a password reset link has been sent.');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      return successResponse(res, 200, 'Password has been reset successfully. You can now log in.');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
