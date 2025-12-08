# Copilot Instructions for AI Agents

## Project Overview
- **Monorepo** with `backend/` (Django) and `frontend/` (React + TypeScript + Vite)
- Backend: Modular Django app structure under `backend/apps/` (e.g., `building`, `community`, `dummy`, `user`)
- Frontend: Vite-based React app in `frontend/`

## Key Architectural Patterns
- **Backend**
  - Django project config in `backend/config/`
  - Shared code in `backend/common/` (models, utils, exceptions)
  - Data access via `backend/infrastructures/postgres/`
  - Each app has its own `models.py`, `views.py`, `urls.py`, and `tests.py`
  - Custom middleware in `backend/middlewares/`
  - Data ingestion via `backend/crawlers/` (various crawlers for external data)
- **Frontend**
  - Source code in `frontend/src/`
  - API calls abstracted in `frontend/src/api/`
  - Components and pages organized under `frontend/src/components/` and `frontend/src/pages/`

## Developer Workflows
- **Backend**
  - Run server: `python manage.py runserver` from `backend/`
  - Run tests: `python manage.py test` from `backend/`
  - Migrations: `python manage.py makemigrations` and `python manage.py migrate`
  - Add new Django app: `python manage.py startapp <appname>`
- **Frontend**
  - Start dev server: `npm install` then `npm run dev` from `frontend/`
  - Build: `npm run build`
  - Lint: `npm run lint`

## Project-Specific Conventions
- **Backend**
  - Use `common/models/` for shared model definitions
  - Place all custom exceptions in `common/exceptions/`
  - Use `infrastructures/postgres/` for DB access logic, not directly in app views
  - Crawler scripts are in `crawlers/` and may be run independently
- **Frontend**
  - Use `api/axiosInstance.ts` for all HTTP requests
  - Organize UI by feature in `components/` and `pages/`

## Integration & Communication
- **API**: REST endpoints defined per Django app, registered in `backend/config/urls.py`
- **Frontend-backend**: All API calls go through the abstraction in `frontend/src/api/`

## Examples
- Add a new model: Place in `backend/apps/<app>/models.py`, register in `admin.py`, add to `config/settings.py` if new app
- Add a new API endpoint: Define in `views.py`, add to `urls.py`, expose via `config/urls.py`
- Add a new React page: Create in `frontend/src/pages/`, add route in main app

## References
- See `README.md` in root and `frontend/` for more details
- User story template: `.github/ISSUE_TEMPLATE/user-story.md`

---
For questions about project-specific patterns, check `common/`, `infrastructures/`, and `middlewares/` for backend, and `api/`, `components/`, and `pages/` for frontend.
