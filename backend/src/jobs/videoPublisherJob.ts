import cron from 'node-cron';
import { getPool } from '../config/database';

export function startVideoPublisherJob() {
  const schedule = process.env.CRON_PUBLISH_VIDEOS || '*/30 * * * *';

  cron.schedule(schedule, async () => {
    console.log('[CRON] Starting video publisher job...');

    try {
      const pool = await getPool();

      const [schedules]: any = await pool.execute('SELECT * FROM schedules WHERE is_active = true');

      for (const schedule of schedules) {
        try {
          const [videos]: any = await pool.execute(
            "SELECT * FROM videos WHERE user_id = ? AND status = 'scheduled' AND scheduled_at <= NOW() LIMIT ?",
            [schedule.user_id, schedule.max_videos_per_day || 5]
          );

          for (const video of videos) {
            try {
              await pool.execute(
                "UPDATE videos SET status = 'posted', posted_at = NOW() WHERE id = ?",
                [video.id]
              );
            } catch (error) {
              console.error(`Failed to post video ${video.id}:`, error);
            }
          }
        } catch (error) {
          console.error(`Failed to process schedule ${schedule.id}:`, error);
        }
      }

      console.log('[CRON] Video publisher job completed');
    } catch (error) {
      console.error('[CRON] Video publisher job failed:', error);
    }
  });
}
