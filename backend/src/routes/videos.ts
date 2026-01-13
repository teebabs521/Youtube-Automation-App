import { Router, Request, Response } from 'express';
import { getPool } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { YouTubeService } from '../services/youtubeService';

const router = Router();
const youtubeService = new YouTubeService();

router.get('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { status, channel_id } = req.query;
  const pool = await getPool();

  let query = 'SELECT * FROM videos WHERE user_id = ?';
  const params: any[] = [req.user.id];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (channel_id) {
    query += ' AND source_channel_id = ?';
    params.push(channel_id);
  }

  const [videos]: any = await pool.execute(query, params);
  res.json(videos);
}));

router.post('/channel/:channelId/fetch', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const pool = await getPool();
  const [channels]: any = await pool.execute(
    'SELECT * FROM source_channels WHERE id = ? AND user_id = ?',
    [req.params.channelId, req.user.id]
  );

  if (channels.length === 0) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const videos = await youtubeService.getChannelVideos(channels[0].channel_id);

  for (const video of videos) {
    const videoId = video.snippet?.resourceId?.videoId;
    const [existing]: any = await pool.execute('SELECT * FROM videos WHERE video_id = ?', [videoId]);

    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO videos (user_id, source_channel_id, video_id, title, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [
          req.user.id,
          req.params.channelId,
          videoId,
          video.snippet?.title,
          video.snippet?.description,
          'pending',
        ]
      );
    }
  }

  res.json({ message: 'Videos fetched', count: videos.length });
}));

router.put('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { title, description, tags } = req.body;
  const pool = await getPool();

  await pool.execute(
    'UPDATE videos SET title = ?, description = ?, tags = ? WHERE id = ? AND user_id = ?',
    [title, description, tags?.join(','), req.params.id, req.user.id]
  );

  res.json({ message: 'Video updated' });
}));

router.post('/:id/post', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const pool = await getPool();
  const [videos]: any = await pool.execute('SELECT * FROM videos WHERE id = ? AND user_id = ?', [
    req.params.id,
    req.user.id,
  ]);

  if (videos.length === 0) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const video = videos[0];
  await pool.execute('UPDATE videos SET status = ?, posted_at = NOW() WHERE id = ?', [
    'posted',
    req.params.id,
  ]);

  res.json({ message: 'Video posted' });
}));

router.delete('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const pool = await getPool();
  await pool.execute('DELETE FROM videos WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Video deleted' });
}));

export default router;
