import { Router, Request, Response } from 'express';
import { getPool } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Get all user's destination channels
router.get('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();
  const [channels]: any = await pool.execute(
    'SELECT id, channel_id, channel_name FROM destination_channels WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );

  res.json(channels || []);
}));

// Add destination channel
router.post('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { channel_id, channel_name } = req.body;

  if (!channel_id || !channel_name) {
    return res.status(400).json({ error: 'channel_id and channel_name are required' });
  }

  const pool = await getPool();
  
  // Check if already exists
  const [existing]: any = await pool.execute(
    'SELECT * FROM destination_channels WHERE user_id = ? AND channel_id = ?',
    [req.user.id, channel_id]
  );

  if (existing && existing.length > 0) {
    return res.status(400).json({ error: 'This destination channel already exists' });
  }

  const result: any = await pool.execute(
    'INSERT INTO destination_channels (user_id, channel_id, channel_name, created_at) VALUES (?, ?, ?, NOW())',
    [req.user.id, channel_id, channel_name]
  );

  res.status(201).json({
    id: result[0].insertId,
    channel_id,
    channel_name,
  });
}));

// Delete destination channel
router.delete('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();
  
  const result: any = await pool.execute(
    'DELETE FROM destination_channels WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (result[0].affectedRows === 0) {
    return res.status(404).json({ error: 'Destination channel not found' });
  }

  res.json({ message: 'Destination channel deleted' });
}));

export default router;