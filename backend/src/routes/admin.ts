import { Router, Request, Response } from 'express';
import { getPool } from '../config/database';
import { adminMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/users', adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const pool = await getPool();
  const [users]: any = await pool.execute(
    'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(users);
}));

router.get('/users/:id', adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const pool = await getPool();
  const [users]: any = await pool.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
  res.json(users[0] || null);
}));

router.patch('/users/:id', adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { role, is_active } = req.body;
  const pool = await getPool();

  await pool.execute('UPDATE users SET role = ?, is_active = ? WHERE id = ?', [
    role,
    is_active,
    req.params.id,
  ]);

  res.json({ message: 'User updated' });
}));

router.delete('/users/:id', adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const pool = await getPool();
  await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: 'User deleted' });
}));

router.get('/stats', adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const pool = await getPool();

  const [userCount]: any = await pool.execute('SELECT COUNT(*) as count FROM users');
  const [videoCount]: any = await pool.execute('SELECT COUNT(*) as count FROM videos');
  const [postedCount]: any = await pool.execute("SELECT COUNT(*) as count FROM videos WHERE status = 'posted'");

  res.json({
    totalUsers: userCount[0].count,
    totalVideos: videoCount[0].count,
    postedVideos: postedCount[0].count,
  });
}));

export default router;
