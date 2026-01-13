import { OAuth2Client } from 'google-auth-library';
import { getPool } from '../config/database';
import { generateToken, encrypt } from '../utils/encryption';
import dotenv from 'dotenv';

dotenv.config();

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export class AuthService {
  async verifyGoogleToken(token: string) {
    try {
      const ticket = await oauth2Client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      return ticket.getPayload();
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async loginOrCreateUser(googleProfile: any) {
    const pool = await getPool();
    const [rows]: any = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [googleProfile.email]
    );

    if (rows.length > 0) {
      const user = rows[0];
      const accessToken = generateToken({ id: user.id, email: user.email, role: user.role });
      return { user, accessToken };
    }

    const result: any = await pool.execute(
      'INSERT INTO users (email, name, google_id, role, created_at) VALUES (?, ?, ?, ?, NOW())',
      [googleProfile.email, googleProfile.name, googleProfile.sub, 'user']
    );

    const accessToken = generateToken({
      id: result.insertId,
      email: googleProfile.email,
      role: 'user',
    });

    return {
      user: {
        id: result.insertId,
        email: googleProfile.email,
        name: googleProfile.name,
        role: 'user',
      },
      accessToken,
    };
  }

  async getUser(userId: number) {
    const pool = await getPool();
    const [rows]: any = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    return rows[0] || null;
  }

  async updateUserProfile(userId: number, data: any) {
    const pool = await getPool();
    const { name, target_channel_id } = data;

    if (target_channel_id) {
      const encrypted = encrypt(target_channel_id);
      await pool.execute('UPDATE users SET name = ?, target_channel_id = ? WHERE id = ?', [
        name,
        encrypted,
        userId,
      ]);
    } else {
      await pool.execute('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
    }

    return this.getUser(userId);
  }
}
