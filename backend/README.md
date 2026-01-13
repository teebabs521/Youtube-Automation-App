# Backend API - YouTube AutoPost

Express.js + TypeScript backend for YouTube automation.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

Server runs on `http://localhost:5000`

## Structure

```
src/
├── config/database.ts         MySQL connection
├── middleware/                Auth, CORS, errors, logging, rate limiting
├── utils/                     Encryption, validation
├── services/                  OAuth, YouTube API
├── routes/                    API endpoints (auth, channels, videos, schedules, admin)
├── jobs/                      Cron jobs (video fetching, posting)
└── server.ts                  Main Express app
```

## API Routes

- `/api/auth/*` - Authentication
- `/api/channels/*` - Channel management
- `/api/videos/*` - Video operations
- `/api/schedules/*` - Schedule management
- `/api/admin/*` - Admin operations
- `/health` - Health check

## Environment Variables

See `.env.example` for all required variables.

## Database

Create MySQL database:
```sql
CREATE DATABASE youtube_autopost;
```

Connection details in `.env`

## Scripts

```bash
npm run dev      # Development with hot reload
npm run build    # Compile TypeScript
npm start        # Run compiled code
npm test         # Run tests (if configured)
```

## Dependencies

- Express.js - Web framework
- MySQL2 - Database driver
- TypeScript - Type safety
- JWT - Authentication
- Google APIs - YouTube & OAuth
- Node-cron - Job scheduling
- Bcryptjs - Password hashing
- Helmet - Security headers

See `package.json` for full list.

## Features

- ✅ Google OAuth 2.0
- ✅ JWT authentication
- ✅ Rate limiting
- ✅ Error handling
- ✅ Request logging
- ✅ CORS support
- ✅ Data encryption
- ✅ Cron jobs

## Troubleshooting

**Database connection failed:**
- Ensure MySQL is running
- Check database name in `.env`
- Verify credentials

**Port 5000 in use:**
- Change PORT in `.env`
- Or kill process: `lsof -ti:5000 | xargs kill -9`

**API errors:**
- Check `npm run dev` logs
- Verify `.env` configuration
- Check API key validity

## Documentation

See `../README.md` for full project documentation.
