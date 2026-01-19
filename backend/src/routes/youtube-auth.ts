import { Router, Request, Response } from 'express';
import { getPool } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { YouTubeUploadService } from '../services/youtubeUploadService';
import crypto from 'crypto';

const router = Router();
const youtubeUploadService = new YouTubeUploadService();

/**
 * Get YouTube OAuth authorization URL
 */
router.get('/auth-url', authMiddleware, (req: Request, res: Response) => {
  try {
    const authUrl = youtubeUploadService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get auth URL' });
  }
});

/**
 * Handle YouTube OAuth callback (GET from Google)
 * This receives the authorization code from Google and redirects to frontend
 */
router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3005';

  if (error) {
    // Redirect to frontend with error
    return res.redirect(`${frontendUrl}/youtube-callback?error=${encodeURIComponent(error as string)}`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/youtube-callback?error=no_code`);
  }

  try {
    // Exchange code for tokens
    const tokens = await youtubeUploadService.exchangeCodeForTokens(code as string);

    // Redirect to frontend with tokens
    const params = new URLSearchParams({
      success: 'true',
      accessToken: tokens.accessToken || '',
      refreshToken: tokens.refreshToken || '',
      expiryDate: String(tokens.expiryDate || ''),
    });

    res.redirect(`${frontendUrl}/youtube-callback?${params.toString()}`);
  } catch (err) {
    console.error('YouTube auth callback error:', err);
    res.redirect(`${frontendUrl}/youtube-callback?error=token_exchange_failed`);
  }
}));

/**
 * Store YouTube tokens (called from frontend after successful auth)
 */
router.post('/store-tokens', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { accessToken, refreshToken, expiryDate } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: 'Access token required' });
  }

  try {
    const pool = await getPool();

    // Encrypt tokens before storing
    const encryptionKey = process.env.ENCRYPTION_KEY || '0'.repeat(64);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);

    // Encrypt access token
    let encrypted: Buffer = cipher.update(Buffer.from(accessToken || ''));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const encryptedAccessToken = iv.toString('hex') + ':' + encrypted.toString('hex');

    // Encrypt refresh token
    const cipher2 = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
    let refreshEncrypted: Buffer = cipher2.update(Buffer.from(refreshToken || ''));
    refreshEncrypted = Buffer.concat([refreshEncrypted, cipher2.final()]);
    const encryptedRefreshToken = iv.toString('hex') + ':' + refreshEncrypted.toString('hex');

    // Store tokens in database
    await pool.execute(
      'UPDATE users SET youtube_access_token = ?, youtube_refresh_token = ?, youtube_token_expiry = ? WHERE id = ?',
      [encryptedAccessToken, encryptedRefreshToken, new Date(expiryDate || 0), req.user.id]
    );

    res.json({ message: 'YouTube tokens stored successfully' });
  } catch (error) {
    console.error('Error storing YouTube tokens:', error);
    res.status(500).json({ error: 'Failed to store tokens' });
  }
}));

/**
 * Check if user has YouTube authorization
 */
router.get('/status', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();
  const [users]: any = await pool.execute(
    'SELECT youtube_access_token FROM users WHERE id = ?',
    [req.user.id]
  );

  const isAuthorized = users[0]?.youtube_access_token ? true : false;

  res.json({
    authorized: isAuthorized,
    message: isAuthorized ? 'YouTube authorized' : 'YouTube authorization required',
  });
}));

export default router;