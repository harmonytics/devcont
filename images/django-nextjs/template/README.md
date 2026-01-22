# Django + Next.js Starter

Fullstack development template with Django REST Framework backend and Next.js frontend.

## Quick Start

```bash
# Backend
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py runserver

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Stack

**Backend:**
- Django 5.1
- Django REST Framework
- PostgreSQL
- uv (Python package manager)

**Frontend:**
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS

## URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/
