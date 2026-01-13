# Quick Start Guide - YouTube AutoPost

Complete step-by-step setup for local development.

## Prerequisites Checklist

- [ ] Node.js 18+ installed (https://nodejs.org)
- [ ] MySQL 5.7+ installed (https://www.mysql.com)
- [ ] Google Cloud account (https://console.cloud.google.com)
- [ ] Text editor (VS Code recommended)
- [ ] Terminal/Command Prompt

## Step 1: Google Cloud Setup (5 minutes)

### 1.1 Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click "Select a Project" → "New Project"
3. Enter name: "YouTube AutoPost"
4. Click "Create"
5. Wait for project creation (1-2 minutes)

### 1.2 Enable Required APIs

1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API" → Click it → "Enable"
3. Search for "YouTube Data API v3" → Click it → "Enable"
4. Wait for APIs to be enabled

### 1.3 Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, click "Configure Consent Screen" first
   - Choose "External"
   - Fill in app name: "YouTube AutoPost"
   - Add your email
   - Click "Save & Continue"
   - Skip scopes and test users, click "Save & Continue"
4. Go back to "Credentials", click "Create Credentials" → "OAuth client ID"
5. Select "Web application"
6. Name it: "YouTube AutoPost Web"
7. Under "Authorized redirect URIs", add:
   ```
   http://localhost:3000/auth/callback
   ```
8. Click "Create"
9. **Copy and save:**
   - Client ID
   - Client Secret

### 1.4 Create API Key

1. In "Credentials" page, click "Create Credentials" → "API Key"
2. **Copy and save:** The API Key
3. Close the popup

**Now you have all Google credentials!**

## Step 2: Backend Setup (3 minutes)

### 2.1 Install Dependencies

```bash
cd backend
npm install
```

Wait for npm to finish (1-2 minutes).

### 2.2 Create Environment File

```bash
cp .env.example .env
```

### 2.3 Configure .env

Open `backend/.env` in your text editor and fill in:

```
NODE_ENV=development
PORT=5000

DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=your_mysql_password
DATABASE_NAME=youtube_autopost

JWT_SECRET=your_secret_key_at_least_32_characters_long
ENCRYPTION_KEY=00000000000000000000000000000000

GOOGLE_CLIENT_ID=your_client_id_from_step_1
GOOGLE_CLIENT_SECRET=your_client_secret_from_step_1
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

YOUTUBE_API_KEY=your_api_key_from_step_1

CORS_ORIGIN=http://localhost:3000

CRON_FETCH_VIDEOS=0 0 * * *
CRON_PUBLISH_VIDEOS=*/30 * * * *
```

### 2.4 Create MySQL Database

Open MySQL command line:

```bash
mysql -u root -p
```

Enter your MySQL password, then run:

```sql
CREATE DATABASE youtube_autopost;
EXIT;
```

### 2.5 Start Backend Server

```bash
npm run dev
```

You should see:
```
✓ Database connected
✓ Server running on port 5000
```

**Backend is now running on http://localhost:5000** ✅

**Keep this terminal open!**

## Step 3: Frontend Setup (3 minutes)

### 3.1 Open New Terminal

Open a **new terminal window** in the `frontend` folder.

```bash
cd frontend
```

### 3.2 Install Dependencies

```bash
npm install
```

Wait for npm to finish.

### 3.3 Create Environment File

```bash
cp .env.example .env
```

### 3.4 Configure .env

Open `frontend/.env` and fill in:

```
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=your_client_id_from_step_1
```

### 3.5 Start Frontend Server

```bash
npm start
```

Your browser should automatically open to http://localhost:3000

**Frontend is now running!** ✅

## Step 4: Test the Application

1. You should see the YouTube AutoPost login page
2. Click "Sign in with Google"
3. Select your Google account
4. You'll be logged in and see the dashboard

**You're done!** 🎉

## Folder Structure

After setup, you have:

```
outputs/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── jobs/
│   │   └── server.ts
│   ├── node_modules/           (created by npm install)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                    (created from .env.example)
│   └── .gitignore
│
└── frontend/
    ├── src/
    │   ├── store/
    │   ├── components/
    │   ├── pages/
    │   ├── services/
    │   ├── hooks/
    │   ├── styles/
    │   ├── App.tsx
    │   └── index.tsx
    ├── public/
    ├── node_modules/           (created by npm install)
    ├── package.json
    ├── tsconfig.json
    ├── .env                    (created from .env.example)
    └── .gitignore
```

## Troubleshooting

### Port 5000 Already in Use

```bash
# Find process using port 5000
lsof -ti:5000

# Kill it
kill -9 <PID>

# Or on Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Port 3000 Already in Use

```bash
# Find and kill process
lsof -ti:3000
kill -9 <PID>

# Or change port in frontend/package.json
# Change: "start": "react-scripts start"
# To: "start": "PORT=3001 react-scripts start"
```

### MySQL Connection Failed

```bash
# Check MySQL is running
# macOS:
brew services start mysql

# Windows: Open Services and start MySQL80

# Verify database exists
mysql -u root -p
SHOW DATABASES;
USE youtube_autopost;
```

### Google OAuth Error

1. Verify Client ID in `.env`
2. Verify redirect URI: http://localhost:3000/auth/callback
3. Check "Authorized redirect URIs" in Google Cloud Console
4. Wait 5 minutes for changes to propagate
5. Refresh browser

### Npm Modules Not Found

```bash
# Reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. ✅ Explore the code
2. ✅ Add more features
3. ✅ Customize styling
4. ✅ Deploy to production

## File Descriptions

See DOWNLOAD_INSTRUCTIONS.txt for details about each file.

## Support

- Backend issues: Check `backend/src/` files and error logs
- Frontend issues: Check browser console (F12)
- API issues: Backend server logs (npm run dev terminal)
- Database issues: MySQL command line

## Deployment

When ready to deploy:
1. Update environment variables for production
2. Run `npm run build` in frontend
3. Run `npm run build` in backend
4. Use platform-specific deployment instructions

See README.md for deployment options.

**You're all set!** 🚀
