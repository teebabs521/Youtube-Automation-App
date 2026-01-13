import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool: mysql.Pool;

export async function createPool(): Promise<mysql.Pool> {
  try {
    pool = mysql.createPool({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '3306'),
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || 'youtube_autopost',
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      multipleStatements: true,
    });

    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    console.log('✓ Database connected');
    return pool;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
}

export async function getPool(): Promise<mysql.Pool> {
  if (!pool) {
    return createPool();
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    console.log('✓ Database closed');
  }
}