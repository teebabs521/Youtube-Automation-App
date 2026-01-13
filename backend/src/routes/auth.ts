import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const authService = new AuthService();

router.post('/google', asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const googleProfile = await authService.verifyGoogleToken(token);
  const { user, accessToken } = await authService.loginOrCreateUser(googleProfile);

  res.json({ user, accessToken });
}));

router.post('/logout', authMiddleware, (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getUser((req as any).user.id);
  res.json(user);
}));

router.put('/profile', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateUserProfile((req as any).user.id, req.body);
  res.json(user);
}));

export default router;
