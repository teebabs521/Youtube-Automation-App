import { Router, Request, Response } from 'express';
import { getPool } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Get user settings/profile
router.get('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();
  const [users]: any = await pool.execute(
    'SELECT id, email, name, role, target_channel_id, target_channel_name, created_at, updated_at FROM users WHERE id = ?',
    [req.user.id]
  );

  if (!users || users.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(users[0]);
}));

// Update user settings
router.put('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { name, target_channel_id, target_channel_name } = req.body;

  // Validate input
  if (!name && !target_channel_id) {
    return res.status(400).json({ error: 'At least one field must be provided' });
  }

  const pool = await getPool();
  
  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];

  if (name) {
    updates.push('name = ?');
    values.push(name);
  }

  if (target_channel_id) {
    updates.push('target_channel_id = ?');
    values.push(target_channel_id);
    
    updates.push('target_channel_name = ?');
    values.push(target_channel_name || 'Unknown Channel');
  }

  updates.push('updated_at = NOW()');
  values.push(req.user.id);

  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

  await pool.execute(query, values);

  // Return updated user
  const [users]: any = await pool.execute(
    'SELECT id, email, name, role, target_channel_id, target_channel_name, created_at, updated_at FROM users WHERE id = ?',
    [req.user.id]
  );

  res.json(users[0]);
}));

// Get list of user's source channels (for target channel selection)
router.get('/source-channels', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();
  const [channels]: any = await pool.execute(
    'SELECT id, channel_id, channel_name FROM source_channels WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );

  res.json(channels || []);
}));

export default router;