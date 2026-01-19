import express from 'express';
import dotenv from 'dotenv';
import { createPool } from './config/database';
import { corsMiddleware } from './middleware/cors';
import { authLimiter, generalLimiter } from './middleware/rateLimiter';
import { loggerMiddleware } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import { startVideoFetcherJob } from './jobs/videoFetcherJob';
import { startVideoPublisherJob } from './jobs/videoPublisherJob';
import authRoutes from './routes/auth';
import youtubeAuthRoutes from './routes/youtube-auth';
import channelsRoutes from './routes/channels';
import destinationChannelsRoutes from './routes/destination-channels';
import videosRoutes from './routes/videos';
import schedulesRoutes from './routes/schedules';
import settingsRoutes from './routes/settings';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(corsMiddleware);
app.use(loggerMiddleware);
app.use(generalLimiter);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/youtube', youtubeAuthRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/destination-channels', destinationChannelsRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    await createPool();
    startVideoFetcherJob();
    startVideoPublisherJob();

    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;