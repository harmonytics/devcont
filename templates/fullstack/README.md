# Fullstack Template

Django REST Framework backend + Next.js frontend with PostgreSQL and Redis.

## Features

- **Backend**: Django 5.2+, DRF, PostgreSQL, Celery-ready
- **Frontend**: Next.js 16+, TypeScript, Tailwind CSS
- **Infrastructure**: Docker Compose with postgres (pgvector) and redis
- **Performance**: Separate volumes for `.venv` and `node_modules`

## Quick Start

```bash
devcont init --template fullstack
devcont up
```

## Services

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Development

```bash
# Backend
cd backend
uv run python manage.py migrate
uv run python manage.py runserver

# Frontend (new terminal)
cd frontend
npm run dev
```

## Environment Variables

Set in `.env` or `docker-compose.yml`:

- `DATABASE_URL`: PostgreSQL connection
- `REDIS_URL`: Redis connection
- `SECRET_KEY`: Django secret (change in production)
- `DEBUG`: Django debug mode (default: True)

## Stack

- Node.js 24
- Python 3.14
- PostgreSQL 16 (pgvector)
- Redis 7
