const bcrypt = require('bcrypt');
const db = require('../../db');
const { signAccessToken, signRefreshToken } = require('../../common/utils/jwt');

class AuthService {
  async registerPatient(data) {
    const { email, password, first_name, last_name, date_of_birth, phone_number } = data;

    // 1. Check if user exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rowCount > 0) {
      throw { statusCode: 409, message: 'User with this email already exists' };
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 3. Create user
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role',
        [email, passwordHash, first_name, last_name, 'patient']
      );
      const user = userResult.rows[0];

      // 4. Create patient profile
      await client.query(
        'INSERT INTO patients (user_id, first_name, last_name, date_of_birth, phone_number) VALUES ($1, $2, $3, $4, $5)',
        [user.id, first_name, last_name, date_of_birth, phone_number]
      );

      await client.query('COMMIT');

      // 5. Generate tokens
      const accessToken = signAccessToken({ id: user.id, role: user.role });
      const refreshToken = signRefreshToken({ id: user.id, role: user.role });

      return { user, accessToken, refreshToken };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async login(email, password) {
    const userResult = await db.query('SELECT id, email, first_name, last_name, password_hash, role FROM users WHERE email = $1', [email]);
    if (userResult.rowCount === 0) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const user = userResult.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const accessToken = signAccessToken({ id: user.id, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id, role: user.role });

    delete user.password_hash;
    return { user, accessToken, refreshToken };
  }

  async forgotPassword(email) {
    const crypto = require('crypto');
    const { enqueueEmail } = require('../email/emailQueue.service');
    const { getPasswordResetTemplate } = require('../email/email.templates');

    const userResult = await db.query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (userResult.rowCount === 0) {
      return;
    }

    const user = userResult.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await db.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
      [resetTokenHash, expiresAt, user.id]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await enqueueEmail(user.email, 'Password Reset Request', getPasswordResetTemplate(resetUrl));
  }

  async resetPassword(token, newPassword) {
    const crypto = require('crypto');
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const userResult = await db.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > CURRENT_TIMESTAMP',
      [resetTokenHash]
    );

    if (userResult.rowCount === 0) {
      throw { statusCode: 400, message: 'Invalid or expired password reset token' };
    }

    const user = userResult.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );
  }
}

module.exports = new AuthService();
