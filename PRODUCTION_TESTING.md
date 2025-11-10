# Testing Production Setup Locally

## Understanding the Architecture

### **Production (Deployed):**
- **Single URL**: `https://sweng.seongjaeny.com`
- Django serves **BOTH** frontend and backend
- Frontend is built and placed in `backend/static/_app/`
- Django's catch-all route serves React app for all non-API routes
- WhiteNoise serves static files
- When user visits `/community`, Django serves the React app
- React app makes API calls to `/api/community/favorites/` which Django handles

### **Development (Current Setup):**
- **Two URLs**: 
  - Frontend: `http://localhost:5173` (Vite dev server)
  - Backend: `http://127.0.0.1:8000` (Django)
- Vite proxies `/api` requests to Django backend
- This allows hot-reloading during development

## Why You're Seeing Different Things

**When you visit `http://127.0.0.1:8000/community`:**
- You're accessing Django directly
- Django serves the built frontend from `backend/static/_app/`
- This is what production looks like, but the build might be old

**When you visit `http://localhost:5173/community`:**
- You're accessing the Vite dev server
- This is the development setup with hot-reloading
- This is what you should use for development

## How to Test Production Setup Locally

### Step 1: Build the Frontend
```bash
cd /Users/devthakkar/Desktop/housing_transparency/team3-wed-fall25/frontend
npm run build
```

This will:
- Compile TypeScript
- Build React app
- Place files in `backend/static/_app/`
- Copy `index.html` to `backend/templates/index.html`

### Step 2: Run Django (Production Mode)
```bash
cd /Users/devthakkar/Desktop/housing_transparency/team3-wed-fall25/backend
source ../venv/bin/activate
python manage.py collectstatic --noinput  # Collect static files
python manage.py runserver 127.0.0.1:8000
```

### Step 3: Access Like Production
Open: `http://127.0.0.1:8000/community`

This is **exactly** how production works:
- Django serves the React app
- React app makes API calls to `/api/community/favorites/`
- Everything runs through Django on port 8000

## Quick Comparison

| Setup | Frontend URL | Backend URL | Use Case |
|-------|-------------|-------------|----------|
| **Development** | `localhost:5173` | `127.0.0.1:8000` | Coding with hot-reload |
| **Production (Local)** | `127.0.0.1:8000` | `127.0.0.1:8000` | Testing production setup |
| **Production (Deployed)** | `https://sweng.seongjaeny.com` | `https://sweng.seongjaeny.com` | Live site |

## Recommended Workflow

1. **For Development**: Use `http://localhost:5173` (Vite dev server)
   - Hot-reloading
   - Fast iteration
   - Easy debugging

2. **Before Deploying**: Test production setup locally
   ```bash
   cd frontend && npm run build
   cd ../backend && python manage.py collectstatic --noinput
   python manage.py runserver 127.0.0.1:8000
   ```
   Then visit `http://127.0.0.1:8000` to verify everything works

3. **After Deploying**: Visit `https://sweng.seongjaeny.com`
   - CI/CD automatically builds and deploys
   - Same setup as local production test

## Current Status

✅ **Backend**: Running on `http://127.0.0.1:8000`
✅ **Frontend Dev**: Running on `http://localhost:5173`  
✅ **Community Features**: Merged from develop branch

**Use `http://localhost:5173` for development!**

