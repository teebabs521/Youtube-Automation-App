import { Router, Request, Response } from 'express';
import { getPool } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const pool = await getPool();
  const [schedules]: any = await pool.execute('SELECT * FROM schedules WHERE user_id = ?', [
    req.user.id,
  ]);
  res.json(schedules);
}));

router.post('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { schedule_type, schedule_time, max_videos_per_day, timezone } = req.body;
  const pool = await getPool();

  const result: any = await pool.execute(
    'INSERT INTO schedules (user_id, schedule_type, schedule_time, max_videos_per_day, timezone, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
    [req.user.id, schedule_type, schedule_time, max_videos_per_day, timezone, true]
  );

  res.status(201).json({ id: result.insertId });
}));

router.put('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { schedule_type, schedule_time, max_videos_per_day, is_active } = req.body;
  const pool = await getPool();

  await pool.execute(
    'UPDATE schedules SET schedule_type = ?, schedule_time = ?, max_videos_per_day = ?, is_active = ? WHERE id = ? AND user_id = ?',
    [schedule_type, schedule_time, max_videos_per_day, is_active, req.params.id, req.user.id]
  );

  res.json({ message: 'Schedule updated' });
}));

router.delete('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const pool = await getPool();
  await pool.execute('DELETE FROM schedules WHERE id = ? AND user_id = ?', [
    req.params.id,
    req.user.id,
  ]);
  res.json({ message: 'Schedule deleted' });
}));

export default router;
