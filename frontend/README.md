# Frontend App - YouTube AutoPost

React 18 + TypeScript + Redux frontend for YouTube automation.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your Google Client ID and API URL
npm start
```

App runs on `http://localhost:3000`

## Structure

```
src/
├── store/                     Redux store + 6 slices
├── components/                Layout components
├── pages/                     Page components (Login, Dashboard, Admin)
├── services/api.ts            Axios HTTP client
├── hooks/redux.ts             Custom Redux hooks
├── styles/                    CSS files (5)
├── App.tsx                    Root component
└── index.tsx                  Entry point
```

## Pages

- **LoginPage** - Google OAuth login
- **DashboardPage** - Main user dashboard
- **AdminPage** - Admin panel (admin only)

## State Management

Redux with 6 slices:
- `auth` - User authentication
- `channels` - Channel list
- `videos` - Video data
- `schedules` - Schedule data
- `admin` - Admin data
- `ui` - UI state (theme, modals)

## Components

- **PrivateRoute** - Protected routes
- **Header** - Navigation header
- **Sidebar** - Side navigation

## Styling

- CSS3 with YouTube dark theme
- Light mode support
- Responsive design
- CSS variables for theming

## Features

- ✅ Google OAuth login
- ✅ Protected routes
- ✅ Dark/light mode
- ✅ Responsive design
- ✅ Redux state management
- ✅ Axios with interceptors
- ✅ Auto-logout on auth error

## Environment Variables

```
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=your_client_id
```

See `.env.example`

## Scripts

```bash
npm start          # Development server
npm run build      # Production build
npm test           # Run tests (if configured)
npm run eject      # Eject from create-react-app
```

## Dependencies

- React 18 - UI library
- TypeScript - Type safety
- Redux Toolkit - State management
- React Router - Routing
- Axios - HTTP client
- React OAuth - Google login

See `package.json` for full list.

## Customization

### Colors

Edit `src/styles/App.css` CSS variables:
```css
--primary: #ff0000;           /* YouTube red */
--secondary: #282828;
--background: #121212;
--surface: #1e1e1e;
```

### Themes

Themes defined in `src/styles/App.css`:
- Dark mode (default)
- Light mode (toggle in header)

### Routes

Edit `src/App.tsx` to add/modify routes.

## Troubleshooting

**Blank page:**
- Check browser console (F12)
- Verify `.env` configuration
- Check backend is running

**Login fails:**
- Verify `REACT_APP_GOOGLE_CLIENT_ID` in `.env`
- Check Google OAuth configuration
- Verify redirect URI

**API errors:**
- Check backend is running on port 5000
- Verify `REACT_APP_API_BASE_URL` in `.env`
- Check network tab in DevTools (F12)

## Documentation

See `../README.md` for full project documentation.
