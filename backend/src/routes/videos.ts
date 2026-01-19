import { Router, Request, Response } from 'express';
import { getPool } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { YouTubeService } from '../services/youtubeService';
import { YouTubeUploadService } from '../services/youtubeUploadService';
import crypto from 'crypto';

const router = Router();
const youtubeService = new YouTubeService();
const youtubeUploadService = new YouTubeUploadService();

// Daily video post limit
const DAILY_VIDEO_LIMIT = 2;

/**
 * Get all videos for user
 */
router.get('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { status, channel_id } = req.query;
  const pool = await getPool();

  let query = 'SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC';
  const params: any[] = [req.user.id];

  if (status) {
    query = 'SELECT * FROM videos WHERE user_id = ? AND status = ? ORDER BY created_at DESC';
    params.push(status);
  }

  if (channel_id) {
    query = 'SELECT * FROM videos WHERE user_id = ? AND source_channel_id = ? ORDER BY created_at DESC';
    params.push(channel_id);
  }

  const [videos]: any = await pool.execute(query, params);
  res.json(videos || []);
}));

/**
 * Get daily post stats for user
 */
router.get('/stats', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();

  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Count videos posted today
  const [postedToday]: any = await pool.execute(
    `SELECT COUNT(*) as count FROM videos 
     WHERE user_id = ? AND status = 'posted' AND posted_at >= ?`,
    [req.user.id, today]
  );

  // Count total videos by status
  const [statusCounts]: any = await pool.execute(
    `SELECT status, COUNT(*) as count FROM videos 
     WHERE user_id = ? GROUP BY status`,
    [req.user.id]
  );

  const stats: Record<string, number> = {
    pending: 0,
    scheduled: 0,
    posted: 0,
    failed: 0,
  };

  statusCounts.forEach((row: any) => {
    stats[row.status] = row.count;
  });

  res.json({
    postedToday: postedToday[0]?.count || 0,
    dailyLimit: DAILY_VIDEO_LIMIT,
    remainingToday: Math.max(0, DAILY_VIDEO_LIMIT - (postedToday[0]?.count || 0)),
    canPostToday: (postedToday[0]?.count || 0) < DAILY_VIDEO_LIMIT,
    ...stats,
    total: Object.values(stats).reduce((a, b) => a + b, 0),
  });
}));

/**
 * Fetch videos from a source channel
 */
router.post('/channel/:channelId/fetch', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();

  // Get the source channel
  const [channels]: any = await pool.execute(
    'SELECT * FROM source_channels WHERE id = ? AND user_id = ?',
    [req.params.channelId, req.user.id]
  );

  if (!channels || channels.length === 0) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const channel = channels[0];

  try {
    // Fetch videos from YouTube
    const videos = await youtubeService.getChannelVideos(channel.channel_id);

    let addedCount = 0;
    let skippedCount = 0;

    for (const video of videos) {
      const videoId = video.id;
      const snippet = video.snippet;
      const contentDetails = video.contentDetails;
      const statistics = video.statistics;

      if (!videoId || !snippet) {
        skippedCount++;
        continue;
      }

      // Check if video already exists
      const [existing]: any = await pool.execute(
        'SELECT id FROM videos WHERE video_id = ? AND user_id = ?',
        [videoId, req.user.id]
      );

      if (existing.length > 0) {
        skippedCount++;
        continue;
      }

      // Get thumbnail URL (prefer high quality)
      const thumbnailUrl =
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url ||
        '';

      // Parse duration
      const duration = contentDetails?.duration
        ? youtubeService.parseDuration(contentDetails.duration)
        : 0;

      // Insert video into database
      await pool.execute(
        `INSERT INTO videos (
          user_id, 
          source_channel_id, 
          video_id, 
          title, 
          description, 
          thumbnail_url,
          duration,
          status,
          view_count,
          like_count,
          comment_count,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          req.user.id,
          req.params.channelId,
          videoId,
          snippet.title || 'Untitled',
          snippet.description || '',
          thumbnailUrl,
          duration,
          'pending',
          parseInt(statistics?.viewCount || '0', 10),
          parseInt(statistics?.likeCount || '0', 10),
          parseInt(statistics?.commentCount || '0', 10),
        ]
      );

      addedCount++;
    }

    // Update last fetched timestamp on source channel
    await pool.execute('UPDATE source_channels SET last_fetched = NOW() WHERE id = ?', [
      req.params.channelId,
    ]);

    res.json({
      message: 'Videos fetched successfully',
      added: addedCount,
      skipped: skippedCount,
      total: videos.length,
    });
  } catch (error: any) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      error: 'Failed to fetch videos',
      details: error.message,
    });
  }
}));

/**
 * Update video metadata
 */
router.put('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { title, description, tags, destination_channel_id, status, scheduled_at } = req.body;
  const pool = await getPool();

  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];

  if (title !== undefined) {
    updates.push('title = ?');
    values.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (tags !== undefined) {
    updates.push('tags = ?');
    values.push(Array.isArray(tags) ? tags.join(',') : tags);
  }
  if (destination_channel_id !== undefined) {
    updates.push('destination_channel_id = ?');
    values.push(destination_channel_id || null);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    values.push(status);
  }
  if (scheduled_at !== undefined) {
    updates.push('scheduled_at = ?');
    values.push(scheduled_at ? new Date(scheduled_at) : null);
  }

  updates.push('updated_at = NOW()');

  if (updates.length === 1) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(req.params.id, req.user.id);

  await pool.execute(
    `UPDATE videos SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  );

  // Fetch and return updated video
  const [updatedVideos]: any = await pool.execute(
    'SELECT * FROM videos WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  res.json({
    message: 'Video updated',
    video: updatedVideos[0] || null,
  });
}));

/**
 * Schedule a video for posting
 */
router.post('/:id/schedule', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { scheduled_at } = req.body;

  if (!scheduled_at) {
    return res.status(400).json({ error: 'scheduled_at is required' });
  }

  const scheduledDate = new Date(scheduled_at);
  if (scheduledDate <= new Date()) {
    return res.status(400).json({ error: 'Scheduled time must be in the future' });
  }

  const pool = await getPool();

  // Check if video exists and belongs to user
  const [videos]: any = await pool.execute(
    'SELECT * FROM videos WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (videos.length === 0) {
    return res.status(404).json({ error: 'Video not found' });
  }

  // Update video to scheduled status
  await pool.execute(
    `UPDATE videos SET 
      status = 'scheduled', 
      scheduled_at = ?,
      updated_at = NOW()
    WHERE id = ? AND user_id = ?`,
    [scheduledDate, req.params.id, req.user.id]
  );

  res.json({
    message: 'Video scheduled successfully',
    scheduled_at: scheduledDate,
  });
}));

/**
 * Post video to destination channel
 */
router.post('/:id/post', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();

  // Check daily limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [postedToday]: any = await pool.execute(
    `SELECT COUNT(*) as count FROM videos 
     WHERE user_id = ? AND status = 'posted' AND posted_at >= ?`,
    [req.user.id, today]
  );

  const postedCount = postedToday[0]?.count || 0;

  if (postedCount >= DAILY_VIDEO_LIMIT) {
    return res.status(429).json({
      error: 'Daily limit reached',
      message: `You can only post ${DAILY_VIDEO_LIMIT} videos per day`,
      postedToday: postedCount,
      dailyLimit: DAILY_VIDEO_LIMIT,
    });
  }

  // Get the video
  const [videos]: any = await pool.execute(
    'SELECT * FROM videos WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (videos.length === 0) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const video = videos[0];

  // Check if already posted
  if (video.status === 'posted') {
    return res.status(400).json({ error: 'Video has already been posted' });
  }

  // Get user's YouTube tokens and destination channel
  const [users]: any = await pool.execute(
    `SELECT 
      youtube_access_token, 
      youtube_refresh_token, 
      youtube_token_expiry,
      target_channel_id,
      target_channel_name
    FROM users WHERE id = ?`,
    [req.user.id]
  );

  const user = users[0];

  if (!user?.youtube_access_token) {
    return res.status(400).json({
      error: 'YouTube authorization required',
      requiresAuth: true,
      message: 'Go to Settings to authorize YouTube upload',
    });
  }

  if (!user?.target_channel_id) {
    return res.status(400).json({
      error: 'No destination channel configured',
      message: 'Go to Settings to select a destination channel',
    });
  }

  try {
    // Decrypt access token
    const encryptionKey = process.env.ENCRYPTION_KEY || '0'.repeat(64);
    const [iv, encrypted] = user.youtube_access_token.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey, 'hex'),
      Buffer.from(iv, 'hex')
    );
    let accessTokenBuffer = decipher.update(Buffer.from(encrypted, 'hex'));
    accessTokenBuffer = Buffer.concat([accessTokenBuffer, decipher.final()]);
    let currentAccessToken = accessTokenBuffer.toString();

    // Check if token is expired and refresh if needed
    if (user.youtube_token_expiry && new Date(user.youtube_token_expiry) < new Date()) {
      console.log('Access token expired, refreshing...');

      // Decrypt refresh token
      const [refreshIv, refreshEncrypted] = user.youtube_refresh_token.split(':');
      const refreshDecipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey, 'hex'),
        Buffer.from(refreshIv, 'hex')
      );
      let refreshTokenBuffer = refreshDecipher.update(Buffer.from(refreshEncrypted, 'hex'));
      refreshTokenBuffer = Buffer.concat([refreshTokenBuffer, refreshDecipher.final()]);
      const refreshToken = refreshTokenBuffer.toString();

      // Refresh the token
      const newTokens = await youtubeUploadService.refreshAccessToken(refreshToken);
      currentAccessToken = newTokens.accessToken || currentAccessToken;

      // Store new access token (encrypted)
      const newIv = crypto.randomBytes(16);
      const newCipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey, 'hex'),
        newIv
      );
      let newEncrypted: Buffer = newCipher.update(Buffer.from(currentAccessToken));
      newEncrypted = Buffer.concat([newEncrypted, newCipher.final()]);
      const newEncryptedAccessToken = newIv.toString('hex') + ':' + newEncrypted.toString('hex');

      await pool.execute(
        'UPDATE users SET youtube_access_token = ?, youtube_token_expiry = ? WHERE id = ?',
        [
          newEncryptedAccessToken,
          new Date(newTokens.expiryDate || Date.now() + 3600000),
          req.user.id,
        ]
      );

      console.log('Access token refreshed successfully');
    }

    // Download video from source
    console.log(`Downloading video: ${video.video_id}`);
    const videoPath = await youtubeUploadService.downloadVideo(video.video_id, '/tmp');

    // Upload to destination channel
    console.log(`Uploading to destination channel: ${user.target_channel_id}`);
    const uploadedVideoId = await youtubeUploadService.uploadVideoToYouTube(
      videoPath,
      video.title,
      video.description || '',
      video.tags?.split(',') || [],
      currentAccessToken,
      'public' // Start as public
    );

    // Update video status in database
    await pool.execute(
      `UPDATE videos SET 
        status = 'posted', 
        destination_channel_id = ?,
        posted_at = NOW(),
        updated_at = NOW()
      WHERE id = ?`,
      [user.target_channel_id, req.params.id]
    );

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      uploadedVideoId,
      destinationChannel: user.target_channel_name,
      postedToday: postedCount + 1,
      remainingToday: DAILY_VIDEO_LIMIT - postedCount - 1,
    });
  } catch (error: any) {
    console.error('Error posting video:', error);

    // Mark video as failed
    await pool.execute(
      `UPDATE videos SET status = 'failed', updated_at = NOW() WHERE id = ?`,
      [req.params.id]
    );

    res.status(500).json({
      error: 'Failed to post video',
      details: error.message,
    });
  }
}));

/**
 * Retry a failed video
 */
router.post('/:id/retry', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();

  // Get the video
  const [videos]: any = await pool.execute(
    'SELECT * FROM videos WHERE id = ? AND user_id = ? AND status = ?',
    [req.params.id, req.user.id, 'failed']
  );

  if (videos.length === 0) {
    return res.status(404).json({ error: 'Failed video not found' });
  }

  // Reset status to pending
  await pool.execute(
    `UPDATE videos SET status = 'pending', updated_at = NOW() WHERE id = ?`,
    [req.params.id]
  );

  res.json({ message: 'Video reset to pending. You can now try posting again.' });
}));

/**
 * Delete a video
 */
router.delete('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();

  // Check if video exists
  const [videos]: any = await pool.execute(
    'SELECT * FROM videos WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (videos.length === 0) {
    return res.status(404).json({ error: 'Video not found' });
  }

  await pool.execute('DELETE FROM videos WHERE id = ? AND user_id = ?', [
    req.params.id,
    req.user.id,
  ]);

  res.json({ message: 'Video deleted' });
}));

/**
 * Bulk delete videos
 */
router.post('/bulk-delete', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { videoIds } = req.body;

  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    return res.status(400).json({ error: 'videoIds array is required' });
  }

  const pool = await getPool();

  // Create placeholders for IN clause
  const placeholders = videoIds.map(() => '?').join(',');

  const [result]: any = await pool.execute(
    `DELETE FROM videos WHERE id IN (${placeholders}) AND user_id = ?`,
    [...videoIds, req.user.id]
  );

  res.json({
    message: 'Videos deleted',
    deletedCount: result.affectedRows,
  });
}));

export default router;