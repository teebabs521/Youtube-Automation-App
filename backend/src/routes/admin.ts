import { Router, Request, Response } from 'express';
import { getPool } from '../config/database';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// ============================================
// ALLOWED EMAILS MANAGEMENT (Admin Only)
// ============================================

/**
 * Get all allowed emails
 */
router.get('/allowed-emails', authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const pool = await getPool();

  const [emails]: any = await pool.execute(`
    SELECT 
      ae.id,
      ae.email,
      ae.notes,
      ae.is_active,
      ae.created_at,
      ae.updated_at,
      u.name as added_by_name,
      (SELECT COUNT(*) FROM users WHERE email = ae.email) as has_account
    FROM allowed_emails ae
    LEFT JOIN users u ON ae.added_by = u.id
    ORDER BY ae.created_at DESC
  `);

  res.json(emails);
}));

/**
 * Add an allowed email
 */
router.post('/allowed-emails', authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { email, notes } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const pool = await getPool();

  // Check if email already exists
  const [existing]: any = await pool.execute(
    'SELECT id FROM allowed_emails WHERE email = ?',
    [email.toLowerCase()]
  );

  if (existing.length > 0) {
    return res.status(409).json({ error: 'Email already exists in whitelist' });
  }

  // Add email
  const [result]: any = await pool.execute(
    'INSERT INTO allowed_emails (email, notes, added_by, created_at) VALUES (?, ?, ?, NOW())',
    [email.toLowerCase(), notes || null, req.user?.id]
  );

  res.status(201).json({
    message: 'Email added to whitelist',
    id: result.insertId,
    email: email.toLowerCase(),
  });
}));

/**
 * Update an allowed email
 */
router.put('/allowed-emails/:id', authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, notes, is_active } = req.body;

  const pool = await getPool();

  // Check if exists
  const [existing]: any = await pool.execute(
    'SELECT * FROM allowed_emails WHERE id = ?',
    [id]
  );

  if (existing.length === 0) {
    return res.status(404).json({ error: 'Email not found' });
  }

  // Build update query
  const updates: string[] = [];
  const values: any[] = [];

  if (email !== undefined) {
    updates.push('email = ?');
    values.push(email.toLowerCase());
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    values.push(notes);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(is_active);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push('updated_at = NOW()');
  values.push(id);

  await pool.execute(
    `UPDATE allowed_emails SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  res.json({ message: 'Email updated successfully' });
}));

/**
 * Delete an allowed email
 */
router.delete('/allowed-emails/:id', authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const pool = await getPool();

  // Check if exists
  const [existing]: any = await pool.execute(
    'SELECT * FROM allowed_emails WHERE id = ?',
    [id]
  );

  if (existing.length === 0) {
    return res.status(404).json({ error: 'Email not found' });
  }

  await pool.execute('DELETE FROM allowed_emails WHERE id = ?', [id]);

  res.json({ message: 'Email removed from whitelist' });
}));

/**
 * Toggle email active status
 */
router.patch('/allowed-emails/:id/toggle', authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const pool = await getPool();

  const [existing]: any = await pool.execute(
    'SELECT * FROM allowed_emails WHERE id = ?',
    [id]
  );

  if (existing.length === 0) {
    return res.status(404).json({ error: 'Email not found' });
  }

  const newStatus = !existing[0].is_active;

  await pool.execute(
    'UPDATE allowed_emails SET is_active = ?, updated_at = NOW() WHERE id = ?',
    [newStatus, id]
  );

  res.json({
    message: `Email ${newStatus ? 'activated' : 'deactivated'} successfully`,
    is_active: newStatus,
  });
}));

// ============================================
// OTHER ADMIN ROUTES
// ============================================

/**
 * Get all users
 */
router.get('/users', authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const pool = await getPool();

  const [users]: any = await pool.execute(`
    SELECT 
      id, email, name, picture, role, 
      target_channel_id, target_channel_name,
      created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `);

  res.json(users);
}));

/**
 * Get dashboard stats
 */
router.get('/stats', authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const pool = await getPool();

  const [userCount]: any = await pool.execute('SELECT COUNT(*) as count FROM users');
  const [videoCount]: any = await pool.execute('SELECT COUNT(*) as count FROM videos');
  const [channelCount]: any = await pool.execute('SELECT COUNT(*) as count FROM source_channels');
  const [allowedEmailCount]: any = await pool.execute('SELECT COUNT(*) as count FROM allowed_emails WHERE is_active = TRUE');

  const [videosByStatus]: any = await pool.execute(`
    SELECT status, COUNT(*) as count FROM videos GROUP BY status
  `);

  res.json({
    users: userCount[0].count,
    videos: videoCount[0].count,
    channels: channelCount[0].count,
    allowedEmails: allowedEmailCount[0].count,
    videosByStatus: videosByStatus.reduce((acc: any, row: any) => {
      acc[row.status] = row.count;
      return acc;
    }, {}),
  });
}));

/**
 * Delete a user
 */
router.delete('/users/:id', authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (req.user?.id === parseInt(id)) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const pool = await getPool();

  // Delete user's data
  await pool.execute('DELETE FROM videos WHERE user_id = ?', [id]);
  await pool.execute('DELETE FROM source_channels WHERE user_id = ?', [id]);
  await pool.execute('DELETE FROM schedules WHERE user_id = ?', [id]);
  await pool.execute('DELETE FROM users WHERE id = ?', [id]);

  res.json({ message: 'User and all associated data deleted' });
}));

export default router;