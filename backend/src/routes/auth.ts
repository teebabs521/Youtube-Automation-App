import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { getPool } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Admin emails - these users will automatically get admin role
const ADMIN_EMAILS = [
  'teebabs52@gmail.com',
  // Add more admin emails here
];

/**
 * Google OAuth Login
 */
router.post('/google', asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid token payload' });
    }

    const { email, name, picture, sub: googleId } = payload;
    const emailLower = email.toLowerCase();

    const pool = await getPool();

    // Check if email is in the whitelist
    const [allowedEmails]: any = await pool.execute(
      'SELECT * FROM allowed_emails WHERE email = ? AND is_active = TRUE',
      [emailLower]
    );

    if (allowedEmails.length === 0) {
      console.log(`Login rejected: ${email} is not in the whitelist`);
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your email is not authorized to use this application. Please contact the administrator.',
        email: email,
      });
    }

    // Check if this email should be admin
    const isAdmin = ADMIN_EMAILS.includes(emailLower);

    // Check if user exists
    const [existingUsers]: any = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [emailLower]
    );

    let user;

    if (existingUsers.length > 0) {
      // Update existing user
      user = existingUsers[0];

      // Update role to admin if they're in admin list but not yet admin
      const newRole = isAdmin ? 'admin' : user.role;

      await pool.execute(
        'UPDATE users SET name = ?, picture = ?, google_id = ?, role = ?, updated_at = NOW() WHERE id = ?',
        [name, picture, googleId, newRole, user.id]
      );
      
      user.name = name;
      user.picture = picture;
      user.role = newRole;
    } else {
      // Create new user
      const role = isAdmin ? 'admin' : 'user';
      
      const [result]: any = await pool.execute(
        `INSERT INTO users (email, name, picture, google_id, role, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [emailLower, name, picture, googleId, role]
      );

      user = {
        id: result.insertId,
        email: emailLower,
        name,
        picture,
        role,
      };
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Update last login in whitelist
    await pool.execute(
      'UPDATE allowed_emails SET updated_at = NOW() WHERE email = ?',
      [emailLower]
    );

    console.log(`User logged in: ${email} (role: ${user.role})`);

    res.json({
      message: 'Login successful',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      details: error.message,
    });
  }
}));

/**
 * Get current user
 */
router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();
  const [users]: any = await pool.execute(
    'SELECT id, email, name, picture, role, created_at FROM users WHERE id = ?',
    [req.user.id]
  );

  if (users.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(users[0]);
}));

/**
 * Logout
 */
router.post('/logout', authMiddleware, (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;