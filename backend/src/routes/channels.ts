import { Router, Request, Response } from 'express';
import { getPool } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { YouTubeService } from '../services/youtubeService';
import { validateYouTubeChannelId } from '../utils/validation';

const router = Router();
const youtubeService = new YouTubeService();

router.get('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  
  const pool = await getPool();
  const [channels]: any = await pool.execute(
    'SELECT * FROM source_channels WHERE user_id = ?',
    [req.user?.id]
  );
  res.json(channels || []);
}));

router.post('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { channel_id, channel_name } = req.body;

  if (!validateYouTubeChannelId(channel_id)) {
    return res.status(400).json({ error: 'Invalid channel ID' });
  }

  const pool = await getPool();
  const [existing]: any = await pool.execute(
    'SELECT * FROM source_channels WHERE user_id = ? AND channel_id = ?',
    [req.user.id, channel_id]
  );

  if (existing && existing.length > 0) {
    return res.status(400).json({ error: 'Channel already added' });
  }

  const result: any = await pool.execute(
    'INSERT INTO source_channels (user_id, channel_id, channel_name, created_at) VALUES (?, ?, ?, NOW())',
    [req.user.id, channel_id, channel_name]
  );

  res.status(201).json({ id: result[0].insertId, channel_id, channel_name });
}));

router.delete('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();
  await pool.execute('DELETE FROM source_channels WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Channel deleted' });
}));

router.post('/:id/refresh', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();
  const [channels]: any = await pool.execute(
    'SELECT * FROM source_channels WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (!channels || channels.length === 0) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const channelInfo = await youtubeService.getChannelInfo(channels[0].channel_id);
  await pool.execute('UPDATE source_channels SET last_fetched = NOW() WHERE id = ?', [req.params.id]);

  res.json(channelInfo);
}));

export default router;