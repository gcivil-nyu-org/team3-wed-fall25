# Local Development Guide

## Quick Start - Run on Localhost

### 1. Backend (Django) - Terminal 1
```bash
cd /Users/devthakkar/Desktop/housing_transparency/team3-wed-fall25/backend
source ../venv/bin/activate
python manage.py runserver 127.0.0.1:8000
```

Backend will be available at: `http://127.0.0.1:8000`

### 2. Frontend (Vite/React) - Terminal 2
```bash
cd /Users/devthakkar/Desktop/housing_transparency/team3-wed-fall25/frontend
npm install  # Only needed first time or after package.json changes
npm run dev
```

Frontend will be available at: `http://localhost:5173` (or the port Vite assigns)

The Vite dev server automatically proxies `/api` requests to `http://127.0.0.1:8000`

## Clear Browser Cache

### Chrome/Edge:
1. Open DevTools (F12 or Cmd+Option+I on Mac)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
   OR
4. Go to Settings > Privacy > Clear browsing data
5. Select "Cached images and files"
6. Time range: "Last hour" or "All time"
7. Click "Clear data"

### Firefox:
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
   OR
4. Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)
5. Select "Cache"
6. Click "Clear Now"

### Safari:
1. Cmd+Option+E (Empty Caches)
2. Or Safari > Preferences > Advanced > Show Develop menu
3. Develop > Empty Caches

### Quick Dev Method (Recommended):
- **Hard Refresh**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- **Disable Cache in DevTools**: 
  - Open DevTools (F12)
  - Go to Network tab
  - Check "Disable cache" checkbox
  - Keep DevTools open while developing

## Your Workflow

### Current Branch: `feat/neighborhood-explorer-deploy`

1. **Make changes to SimplifiedMap.tsx** (or other components)
   - File: `frontend/src/pages/SimplifiedMap.tsx`

2. **Test locally**:
   - Backend running on port 8000
   - Frontend running on port 5173
   - Clear browser cache if seeing old views
   - Test your changes

3. **Commit your changes**:
   ```bash
   git add frontend/src/pages/SimplifiedMap.tsx
   git commit -m "feat: update map component with [your changes]"
   ```

4. **Switch back to develop and merge**:
   ```bash
   git checkout develop
   git pull origin develop
   git merge feat/neighborhood-explorer-deploy
   # Resolve any conflicts if needed
   git push origin develop
   ```

5. **CI/CD will automatically deploy** to the integration server when you push to develop

## Environment Variables

Your `.env` file is already configured:
- `DB_NAME=sweng`
- `DB_USER=team3`
- `DB_PASSWORD=xlatka@123`
- `DB_HOST=sweng.seongjaeny.com`
- `DB_PORT=6432`
- `RUN_ENV=development`

## Troubleshooting

### Seeing old cached views?
1. Hard refresh: Cmd+Shift+R
2. Clear browser cache completely
3. Try incognito/private window
4. Check Network tab in DevTools - verify requests are going to localhost

### Backend not connecting?
- Check backend is running on port 8000
- Verify `.env` file exists and has correct DB credentials
- Check backend terminal for errors

### Frontend not loading?
- Check frontend is running (usually port 5173)
- Verify `npm install` completed successfully
- Check browser console for errors

### API requests failing?
- Verify Vite proxy is working (check Network tab)
- Ensure backend is running
- Check CORS settings in `backend/config/settings.py`

