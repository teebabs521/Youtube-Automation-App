import cron from 'node-cron';
import { getPool } from '../config/database';
import { YouTubeService } from '../services/youtubeService';
import dotenv from 'dotenv';

dotenv.config();

const youtubeService = new YouTubeService();

export function startVideoFetcherJob() {
  const schedule = process.env.CRON_FETCH_VIDEOS || '0 0 * * *'; // Default: midnight daily

  console.log(`[CRON] Video fetcher job scheduled: ${schedule}`);

  cron.schedule(schedule, async () => {
    console.log('[CRON] Starting video fetcher job...');

    try {
      const pool = await getPool();
      const [channels]: any = await pool.execute('SELECT * FROM source_channels');

      console.log(`[CRON] Found ${channels.length} source channels to fetch`);

      for (const channel of channels) {
        try {
          console.log(`[CRON] Fetching videos for channel: ${channel.channel_id}`);

          const videos = await youtubeService.getChannelVideos(channel.channel_id);

          let addedCount = 0;
          let skippedCount = 0;

          for (const video of videos) {
            // video.id is the video ID (from videos.list response)
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
              [videoId, channel.user_id]
            );

            if (existing.length > 0) {
              skippedCount++;
              continue;
            }

            // Get thumbnail URL
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
                channel.user_id,
                channel.id,
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

          // Update last fetched timestamp
          await pool.execute('UPDATE source_channels SET last_fetched = NOW() WHERE id = ?', [
            channel.id,
          ]);

          console.log(
            `[CRON] Channel ${channel.channel_id}: Added ${addedCount}, Skipped ${skippedCount}`
          );
        } catch (error) {
          console.error(
            `[CRON] Failed to fetch videos for channel ${channel.channel_id}:`,
            error
          );
        }
      }

      console.log('[CRON] Video fetcher job completed');
    } catch (error) {
      console.error('[CRON] Video fetcher job failed:', error);
    }
  });
}