import { Router, Request, Response } from 'express';
import { getPool } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Get all user schedules
router.get('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();
  const [schedules]: any = await pool.execute(
    'SELECT * FROM schedules WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );

  res.json(schedules || []);
}));

// Get single schedule
router.get('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();
  const [schedules]: any = await pool.execute(
    'SELECT * FROM schedules WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (!schedules || schedules.length === 0) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  res.json(schedules[0]);
}));

// Create new schedule
router.post('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { schedule_type, schedule_time, schedule_days, max_videos_per_day, timezone, is_active } = req.body;

  // Validation
  if (!schedule_type || !schedule_time) {
    return res.status(400).json({ error: 'schedule_type and schedule_time are required' });
  }

  if (!['daily', 'weekly', 'custom'].includes(schedule_type)) {
    return res.status(400).json({ error: 'Invalid schedule_type. Must be daily, weekly, or custom' });
  }

  const pool = await getPool();
  
  const result: any = await pool.execute(
    'INSERT INTO schedules (user_id, schedule_type, schedule_time, schedule_days, max_videos_per_day, timezone, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
    [
      req.user.id,
      schedule_type,
      schedule_time,
      schedule_days || null,
      max_videos_per_day || 3,
      timezone || 'UTC',
      is_active !== false ? 1 : 0
    ]
  );

  res.status(201).json({
    id: result[0].insertId,
    schedule_type,
    schedule_time,
    schedule_days,
    max_videos_per_day: max_videos_per_day || 3,
    timezone: timezone || 'UTC',
    is_active: is_active !== false
  });
}));

// Update schedule
router.put('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { schedule_type, schedule_time, schedule_days, max_videos_per_day, timezone, is_active } = req.body;

  const pool = await getPool();
  
  // Check if schedule exists
  const [schedules]: any = await pool.execute(
    'SELECT * FROM schedules WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (!schedules || schedules.length === 0) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  // Build update query
  const updates: string[] = [];
  const values: any[] = [];

  if (schedule_type) {
    updates.push('schedule_type = ?');
    values.push(schedule_type);
  }

  if (schedule_time) {
    updates.push('schedule_time = ?');
    values.push(schedule_time);
  }

  if (schedule_days !== undefined) {
    updates.push('schedule_days = ?');
    values.push(schedule_days);
  }

  if (max_videos_per_day) {
    updates.push('max_videos_per_day = ?');
    values.push(max_videos_per_day);
  }

  if (timezone) {
    updates.push('timezone = ?');
    values.push(timezone);
  }

  if (is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(is_active ? 1 : 0);
  }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(req.params.id);
    values.push(req.user.id);

    const query = `UPDATE schedules SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
    await pool.execute(query, values);
  }

  // Return updated schedule
  const [updated]: any = await pool.execute(
    'SELECT * FROM schedules WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  res.json(updated[0]);
}));

// Delete schedule
router.delete('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();
  
  const result: any = await pool.execute(
    'DELETE FROM schedules WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (result[0].affectedRows === 0) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  res.json({ message: 'Schedule deleted successfully' });
}));

// Toggle schedule active status
router.patch('/:id/toggle', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const pool = await getPool();
  
  const [schedules]: any = await pool.execute(
    'SELECT is_active FROM schedules WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (!schedules || schedules.length === 0) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  const newStatus = !schedules[0].is_active;
  
  await pool.execute(
    'UPDATE schedules SET is_active = ?, updated_at = NOW() WHERE id = ?',
    [newStatus ? 1 : 0, req.params.id]
  );

  res.json({ is_active: newStatus });
}));

export default router;