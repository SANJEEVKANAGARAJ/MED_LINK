const calendarService = require('./calendar.service');

class CalendarController {
  getAuthUrl(req, res, next) {
    try {
      const userId = req.user.id;
      const url = calendarService.getAuthUrl(userId);
      res.status(200).json({ success: true, data: { url } });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req, res, next) {
    try {
      const userId = req.user.id;
      const refreshToken = await calendarService.getRefreshToken(userId);
      res.status(200).json({ success: true, data: { connected: !!refreshToken } });
    } catch (error) {
      next(error);
    }
  }

  async disconnect(req, res, next) {
    try {
      const userId = req.user.id;
      await calendarService.deleteRefreshToken(userId);
      res.status(200).json({ success: true, message: 'Google Calendar disconnected successfully' });
    } catch (error) {
      next(error);
    }
  }

  async handleCallback(req, res, next) {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).json({ success: false, error: 'Missing code or state (userId) in callback' });
      }

      const userId = state;
      await calendarService.handleCallback(code, userId);
      
      const db = require('../../db');
      const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
      let rolePath = 'patient';
      if (userResult.rowCount > 0) {
        rolePath = userResult.rows[0].role;
      }

      // Redirect to frontend or send success message
      const frontendUrl = process.env.FRONTEND_URL;
      res.redirect(`${frontendUrl}/${rolePath}/dashboard?calendarSync=success`);
    } catch (error) {
      console.error('Calendar OAuth Callback Error:', error);
      const frontendUrl = process.env.FRONTEND_URL;
      res.redirect(`${frontendUrl}/login?calendarSync=failed`);
    }
  }
}

module.exports = new CalendarController();
