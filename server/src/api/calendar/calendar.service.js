const { google } = require('googleapis');
const db = require('../../db');

class CalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  getAuthUrl(userId) {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: userId,
    });
  }

  async handleCallback(code, userId) {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    if (tokens.refresh_token) {
      await this.saveRefreshToken(userId, tokens.refresh_token);
    }
    
    return tokens;
  }

  async saveRefreshToken(userId, refreshToken) {
    const query = `
      INSERT INTO user_oauth_tokens (user_id, refresh_token)
      VALUES ($1, $2)
      ON CONFLICT (user_id) 
      DO UPDATE SET refresh_token = EXCLUDED.refresh_token, updated_at = CURRENT_TIMESTAMP
    `;
    await db.query(query, [userId, refreshToken]);
  }

  async getRefreshToken(userId) {
    const result = await db.query('SELECT refresh_token FROM user_oauth_tokens WHERE user_id = $1', [userId]);
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0].refresh_token;
  }

  async deleteRefreshToken(userId) {
    await db.query('DELETE FROM user_oauth_tokens WHERE user_id = $1', [userId]);
  }

  async getCalendarClient(userId) {
    const refreshToken = await this.getRefreshToken(userId);
    if (!refreshToken) return null;

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    auth.setCredentials({ refresh_token: refreshToken });
    return google.calendar({ version: 'v3', auth });
  }

  async createEvent(appointmentId, userId, eventDetails) {
    try {
      const calendar = await this.getCalendarClient(userId);
      if (!calendar) return; 

      const res = await calendar.events.insert({
        calendarId: 'primary',
        resource: {
          summary: eventDetails.summary,
          description: eventDetails.description,
          start: {
            dateTime: eventDetails.startDateTime,
            timeZone: 'UTC', 
          },
          end: {
            dateTime: eventDetails.endDateTime,
            timeZone: 'UTC',
          },
        },
      });

      await db.query(
        `INSERT INTO calendar_sync (appointment_id, user_id, event_id) VALUES ($1, $2, $3)`,
        [appointmentId, userId, res.data.id]
      );
    } catch (error) {
      console.error(`Failed to create calendar event for user ${userId}:`, error.message);
    }
  }

  async updateEvent(appointmentId, userId, eventDetails) {
    try {
      const calendar = await this.getCalendarClient(userId);
      if (!calendar) return;

      const syncResult = await db.query(
        `SELECT event_id FROM calendar_sync WHERE appointment_id = $1 AND user_id = $2`,
        [appointmentId, userId]
      );
      if (syncResult.rowCount === 0) return;

      const eventId = syncResult.rows[0].event_id;

      await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: {
          summary: eventDetails.summary,
          description: eventDetails.description,
          start: {
            dateTime: eventDetails.startDateTime,
            timeZone: 'UTC',
          },
          end: {
            dateTime: eventDetails.endDateTime,
            timeZone: 'UTC',
          },
        },
      });
    } catch (error) {
      console.error(`Failed to update calendar event for user ${userId}:`, error.message);
    }
  }

  async deleteEvent(appointmentId, userId) {
    try {
      const calendar = await this.getCalendarClient(userId);
      if (!calendar) return;

      const syncResult = await db.query(
        `SELECT id, event_id FROM calendar_sync WHERE appointment_id = $1 AND user_id = $2`,
        [appointmentId, userId]
      );
      if (syncResult.rowCount === 0) return;

      const { id, event_id } = syncResult.rows[0];

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: event_id,
      });

      await db.query(`DELETE FROM calendar_sync WHERE id = $1`, [id]);
    } catch (error) {
      console.error(`Failed to delete calendar event for user ${userId}:`, error.message);
    }
  }

  async syncAppointmentForUsers(appointmentId, patientUserId, doctorUserId, eventDetails) {
    await this.createEvent(appointmentId, patientUserId, eventDetails);
    await this.createEvent(appointmentId, doctorUserId, eventDetails);
  }
}

module.exports = new CalendarService();
