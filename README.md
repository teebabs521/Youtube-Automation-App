# YouTube AutoPost - Complete Documentation

Full-stack application for automating YouTube video posting across multiple channels.

## Quick Links

- ⭐ **[00_START_HERE.md](00_START_HERE.md)** - Read this first! 
- 🚀 **[QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)** - Detailed setup instructions
- 📁 **[DOWNLOAD_INSTRUCTIONS.txt](DOWNLOAD_INSTRUCTIONS.txt)** - File descriptions

## Features

✅ Google OAuth 2.0 authentication
✅ YouTube Data API v3 integration
✅ Multi-channel video management
✅ Automatic daily video fetching
✅ Schedule-based automatic posting
✅ Admin dashboard & user management
✅ Dark mode support
✅ Responsive design
✅ Rate limiting & security
✅ Data encryption

## Tech Stack

### Backend
- Node.js / Express.js
- TypeScript (strict mode)
- MySQL database
- Google APIs
- JWT authentication
- Node-cron for scheduling

### Frontend
- React 18
- TypeScript
- Redux Toolkit
- React Router v6
- Axios HTTP client
- CSS3 with YouTube theme

## Project Structure

```
outputs/
├── 00_START_HERE.md              ⭐ START HERE
├── README.md                     (this file)
├── QUICK_START_GUIDE.md          Step-by-step guide
├── DOWNLOAD_INSTRUCTIONS.txt     File descriptions
│
├── backend/
│   ├── src/
│   │   ├── config/              Database configuration
│   │   ├── middleware/          Auth, CORS, errors (5 files)
│   │   ├── utils/               Encryption, validation (2 files)
│   │   ├── services/            OAuth, YouTube API (2 files)
│   │   ├── routes/              API endpoints (5 files)
│   │   ├── jobs/                Cron jobs (2 files)
│   │   └── server.ts            Main Express app
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── .gitignore
│   └── README.md
│
└── frontend/
    ├── src/
    │   ├── store/               Redux store + 6 slices
    │   ├── components/          3 component files
    │   ├── pages/               3 page components
    │   ├── services/            API client
    │   ├── hooks/               Redux hooks
    │   ├── styles/              5 CSS files
    │   ├── App.tsx
    │   └── index.tsx
    ├── public/
    │   └── index.html
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── .gitignore
    └── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/google` - Login with Google
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Channels
- `GET /api/channels` - List channels
- `POST /api/channels` - Add channel
- `DELETE /api/channels/:id` - Delete channel
- `POST /api/channels/:id/refresh` - Refresh channel

### Videos
- `GET /api/videos` - List videos
- `PUT /api/videos/:id` - Update video
- `POST /api/videos/:id/post` - Post video
- `DELETE /api/videos/:id` - Delete video
- `POST /api/videos/channel/:id/fetch` - Fetch channel videos

### Schedules
- `GET /api/schedules` - List schedules
- `POST /api/schedules` - Create schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### Admin
- `GET /api/admin/users` - List users
- `GET /api/admin/users/:id` - Get user
- `PATCH /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/stats` - System statistics

## Database Schema

8 main tables:
- `users` - User accounts with roles
- `source_channels` - YouTube source channels
- `videos` - Video metadata
- `schedules` - Posting schedules
- `post_logs` - Posting attempt history
- `audit_logs` - Admin action logs
- `api_quota_usage` - YouTube API quota tracking
- `system_settings` - Application settings

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=5000

DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=youtube_autopost

JWT_SECRET=your_secret_key_min_32_chars
ENCRYPTION_KEY=hex_format_32_bytes

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

YOUTUBE_API_KEY=

CORS_ORIGIN=http://localhost:3000

CRON_FETCH_VIDEOS=0 0 * * *
CRON_PUBLISH_VIDEOS=*/30 * * * *
```

### Frontend (.env)
```
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=
```

## File Manifest

### Backend (18 TypeScript files)
**Config:**
- `config/database.ts` - MySQL connection pool

**Middleware (5 files):**
- `middleware/auth.ts` - JWT verification
- `middleware/cors.ts` - CORS configuration
- `middleware/errorHandler.ts` - Global error handling
- `middleware/logger.ts` - Request logging
- `middleware/rateLimiter.ts` - Rate limiting

**Utils (2 files):**
- `utils/encryption.ts` - AES-256, JWT, bcryptjs
- `utils/validation.ts` - Input validation

**Services (2 files):**
- `services/authService.ts` - Google OAuth
- `services/youtubeService.ts` - YouTube API calls

**Routes (5 files):**
- `routes/auth.ts` - Authentication endpoints
- `routes/channels.ts` - Channel management
- `routes/videos.ts` - Video operations
- `routes/schedules.ts` - Schedule management
- `routes/admin.ts` - Admin operations

**Jobs (2 files):**
- `jobs/videoFetcherJob.ts` - Daily video fetching (cron)
- `jobs/videoPublisherJob.ts` - Scheduled posting (cron)

**Main:**
- `src/server.ts` - Express application

**Config:**
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `.env.example` - Environment template
- `.gitignore` - Git ignore patterns

### Frontend (22 TypeScript/React files)

**Store (7 files):**
- `store/store.ts` - Redux store
- `store/slices/authSlice.ts` - Auth state
- `store/slices/channelsSlice.ts` - Channels state
- `store/slices/videosSlice.ts` - Videos state
- `store/slices/schedulesSlice.ts` - Schedules state
- `store/slices/adminSlice.ts` - Admin state
- `store/slices/uiSlice.ts` - UI state

**Components (3 files):**
- `components/Auth/PrivateRoute.tsx` - Protected routes
- `components/Layout/Header.tsx` - Navigation header
- `components/Layout/Sidebar.tsx` - Side navigation

**Pages (3 files):**
- `pages/LoginPage.tsx` - Google OAuth login
- `pages/DashboardPage.tsx` - User dashboard
- `pages/AdminPage.tsx` - Admin dashboard

**Services:**
- `services/api.ts` - Axios HTTP client

**Hooks:**
- `hooks/redux.ts` - Redux hooks

**Styles (5 CSS files):**
- `styles/App.css` - Global styles
- `styles/Layout.css` - Layout styles
- `styles/Login.css` - Login page
- `styles/Dashboard.css` - Dashboard
- `styles/Admin.css` - Admin panel

**Main:**
- `src/App.tsx` - Root component
- `src/index.tsx` - React entry point
- `public/index.html` - HTML template

**Config:**
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `.env.example` - Environment template
- `.gitignore` - Git ignore patterns

## Code Quality

✅ Full TypeScript with strict mode
✅ Production-ready code
✅ No placeholders or TODOs
✅ Complete error handling
✅ Comprehensive logging
✅ Security best practices
✅ Well-organized structure
✅ Easy to extend
✅ Ready to deploy

## Setup Instructions

**Read 00_START_HERE.md for quick start!**

For detailed instructions, see QUICK_START_GUIDE.md

## Deployment

The application can be deployed to:
- AWS (EC2 + RDS)
- Google Cloud
- DigitalOcean
- Heroku
- cPanel
- Any Node.js hosting

## License

MIT

## Support

All code is documented and production-ready. See the included documentation files for detailed information.

**Start with:** 00_START_HERE.md
