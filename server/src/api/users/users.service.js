const db = require('../../db');

class UsersService {
  async updateProfileImage(userId, imageUrl) {
    const result = await db.query(
      'UPDATE users SET profile_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, profile_image_url',
      [imageUrl, userId]
    );
    if (result.rowCount === 0) {
      throw { statusCode: 404, message: 'User not found' };
    }
    return result.rows[0];
  }
}

module.exports = new UsersService();
