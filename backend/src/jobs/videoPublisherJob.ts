import cron from 'node-cron';
import { getPool } from '../config/database';
import { YouTubeUploadService } from '../services/youtubeUploadService';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const youtubeUploadService = new YouTubeUploadService();

// Daily limit per user
const DAILY_VIDEO_LIMIT = 2;

export function startVideoPublisherJob() {
  const schedule = process.env.CRON_PUBLISH_VIDEOS || '*/30 * * * *'; // Default: every 30 minutes

  console.log(`[CRON] Video publisher job scheduled: ${schedule}`);

  cron.schedule(schedule, async () => {
    console.log('[CRON] Starting video publisher job...');

    try {
      const pool = await getPool();

      // Get all active schedules
      const [schedules]: any = await pool.execute(
        'SELECT * FROM schedules WHERE is_active = true'
      );

      console.log(`[CRON] Found ${schedules.length} active schedules`);

      for (const schedule of schedules) {
        try {
          // Check how many videos already posted today for this user
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const [postedToday]: any = await pool.execute(
            `SELECT COUNT(*) as count FROM videos 
             WHERE user_id = ? AND status = 'posted' AND posted_at >= ?`,
            [schedule.user_id, today]
          );

          const postedCount = postedToday[0]?.count || 0;
          const remainingSlots = Math.max(0, DAILY_VIDEO_LIMIT - postedCount);

          if (remainingSlots === 0) {
            console.log(`[CRON] User ${schedule.user_id}: Daily limit reached (${DAILY_VIDEO_LIMIT}/${DAILY_VIDEO_LIMIT})`);
            continue;
          }

          console.log(`[CRON] User ${schedule.user_id}: ${postedCount}/${DAILY_VIDEO_LIMIT} posted today, ${remainingSlots} slots remaining`);

          // Get scheduled videos that are due
          const [videos]: any = await pool.execute(
            `SELECT * FROM videos 
             WHERE user_id = ? AND status = 'scheduled' AND scheduled_at <= NOW() 
             ORDER BY scheduled_at ASC
             LIMIT ?`,
            [schedule.user_id, remainingSlots]
          );

          if (videos.length === 0) {
            console.log(`[CRON] User ${schedule.user_id}: No scheduled videos due`);
            continue;
          }

          console.log(`[CRON] User ${schedule.user_id}: Found ${videos.length} videos to publish`);

          // Get user's YouTube tokens
          const [users]: any = await pool.execute(
            `SELECT youtube_access_token, youtube_refresh_token, youtube_token_expiry, 
                    target_channel_id, target_channel_name
             FROM users WHERE id = ?`,
            [schedule.user_id]
          );

          const user = users[0];

          if (!user?.youtube_access_token) {
            console.log(`[CRON] User ${schedule.user_id}: No YouTube authorization`);
            continue;
          }

          if (!user?.target_channel_id) {
            console.log(`[CRON] User ${schedule.user_id}: No destination channel configured`);
            continue;
          }

          // Decrypt access token
          const encryptionKey = process.env.ENCRYPTION_KEY || '0'.repeat(64);
          let accessToken: string;

          try {
            const [iv, encrypted] = user.youtube_access_token.split(':');
            const decipher = crypto.createDecipheriv(
              'aes-256-cbc',
              Buffer.from(encryptionKey, 'hex'),
              Buffer.from(iv, 'hex')
            );
            let accessTokenBuffer = decipher.update(Buffer.from(encrypted, 'hex'));
            accessTokenBuffer = Buffer.concat([accessTokenBuffer, decipher.final()]);
            accessToken = accessTokenBuffer.toString();
          } catch (decryptError) {
            console.error(`[CRON] User ${schedule.user_id}: Failed to decrypt access token`);
            continue;
          }

          // Check if token is expired and refresh if needed
          if (user.youtube_token_expiry && new Date(user.youtube_token_expiry) < new Date()) {
            console.log(`[CRON] User ${schedule.user_id}: Refreshing expired token...`);

            try {
              const [refreshIv, refreshEncrypted] = user.youtube_refresh_token.split(':');
              const refreshDecipher = crypto.createDecipheriv(
                'aes-256-cbc',
                Buffer.from(encryptionKey, 'hex'),
                Buffer.from(refreshIv, 'hex')
              );
              let refreshTokenBuffer = refreshDecipher.update(Buffer.from(refreshEncrypted, 'hex'));
              refreshTokenBuffer = Buffer.concat([refreshTokenBuffer, refreshDecipher.final()]);
              const refreshToken = refreshTokenBuffer.toString();

              const newTokens = await youtubeUploadService.refreshAccessToken(refreshToken);
              accessToken = newTokens.accessToken || accessToken;

              // Store new access token
              const newIv = crypto.randomBytes(16);
              const newCipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), newIv);
              let newEncrypted: Buffer = newCipher.update(Buffer.from(accessToken));
              newEncrypted = Buffer.concat([newEncrypted, newCipher.final()]);
              const newEncryptedAccessToken = newIv.toString('hex') + ':' + newEncrypted.toString('hex');

              await pool.execute(
                'UPDATE users SET youtube_access_token = ?, youtube_token_expiry = ? WHERE id = ?',
                [newEncryptedAccessToken, new Date(newTokens.expiryDate || Date.now() + 3600000), schedule.user_id]
              );

              console.log(`[CRON] User ${schedule.user_id}: Token refreshed successfully`);
            } catch (refreshError) {
              console.error(`[CRON] User ${schedule.user_id}: Failed to refresh token:`, refreshError);
              continue;
            }
          }

          // Process each video
          for (const video of videos) {
            try {
              console.log(`[CRON] Publishing video: ${video.id} - ${video.title}`);

              // Download video
              const videoPath = await youtubeUploadService.downloadVideo(video.video_id, '/tmp');

              // Upload to YouTube
              const uploadedVideoId = await youtubeUploadService.uploadVideoToYouTube(
                videoPath,
                video.title,
                video.description || '',
                video.tags?.split(',') || [],
                accessToken,
                'public' // Start as public
              );

              // Update video status
              await pool.execute(
                `UPDATE videos SET 
                  status = 'posted',
                  destination_channel_id = ?,
                  posted_at = NOW(),
                  updated_at = NOW()
                WHERE id = ?`,
                [user.target_channel_id, video.id]
              );

              console.log(`[CRON] Video ${video.id} published successfully. YouTube ID: ${uploadedVideoId}`);
            } catch (videoError) {
              console.error(`[CRON] Failed to publish video ${video.id}:`, videoError);

              // Mark as failed
              await pool.execute(
                `UPDATE videos SET status = 'failed', updated_at = NOW() WHERE id = ?`,
                [video.id]
              );
            }
          }
        } catch (scheduleError) {
          console.error(`[CRON] Failed to process schedule ${schedule.id}:`, scheduleError);
        }
      }

      console.log('[CRON] Video publisher job completed');
    } catch (error) {
      console.error('[CRON] Video publisher job failed:', error);
    }
  });
}