import cron from 'node-cron';
import { getPool } from '../config/database';
import { YouTubeService } from '../services/youtubeService';
import dotenv from 'dotenv';

dotenv.config();

const youtubeService = new YouTubeService();

export function startVideoFetcherJob() {
  const schedule = process.env.CRON_FETCH_VIDEOS || '0 0 * * *';

  cron.schedule(schedule, async () => {
    console.log('[CRON] Starting video fetcher job...');

    try {
      const pool = await getPool();
      const [channels]: any = await pool.execute('SELECT * FROM source_channels');

      for (const channel of channels) {
        try {
          const videos = await youtubeService.getChannelVideos(channel.channel_id);

          for (const video of videos) {
            const videoId = video.snippet?.resourceId?.videoId;
            const [existing]: any = await pool.execute('SELECT * FROM videos WHERE video_id = ?', [
              videoId,
            ]);

            if (existing.length === 0) {
              await pool.execute(
                'INSERT INTO videos (user_id, source_channel_id, video_id, title, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [
                  channel.user_id,
                  channel.id,
                  videoId,
                  video.snippet?.title,
                  video.snippet?.description,
                  'pending',
                ]
              );
            }
          }

          await pool.execute('UPDATE source_channels SET last_fetched = NOW() WHERE id = ?', [
            channel.id,
          ]);
        } catch (error) {
          console.error(`Failed to fetch videos for channel ${channel.channel_id}:`, error);
        }
      }

      console.log('[CRON] Video fetcher job completed');
    } catch (error) {
      console.error('[CRON] Video fetcher job failed:', error);
    }
  });
}
