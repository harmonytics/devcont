# Django + Next.js Fullstack Starter

A production-ready fullstack template featuring Django REST Framework backend with Celery, Allauth authentication, and Next.js frontend.

## Features

**Backend:**
- Django 5.2+ with Django REST Framework
- Custom User model with email-based authentication
- django-allauth for authentication (email/password + social login ready)
- dj-rest-auth for API authentication endpoints
- Celery + Redis for background task processing
- django-celery-beat for periodic tasks
- PostgreSQL 17 with pgvector extension
- Argon2 password hashing
- Split settings (base/local/production/test)
- CORS configured for Next.js frontend

**Frontend:**
- Next.js 15 with React 19
- TypeScript
- Tailwind CSS

## Quick Start

```bash
# Backend setup
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py createsuperuser
uv run python manage.py runserver 0.0.0.0:8000

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

## API Endpoints

### Authentication (dj-rest-auth)
- `POST /api/auth/login/` - Login
- `POST /api/auth/logout/` - Logout
- `POST /api/auth/password/reset/` - Password reset
- `POST /api/auth/password/change/` - Change password
- `GET /api/auth/user/` - Get current user

### Registration
- `POST /api/auth/registration/` - Register new user
- `POST /api/auth/registration/verify-email/` - Verify email

### API
- `GET /api/health/` - Health check (public)
- `GET /api/users/me/` - Current user info (authenticated)
- `POST /api/auth/token/` - Get auth token

### Admin
- `/admin/` - Django admin panel

## Celery Tasks

Background tasks are handled by Celery with Redis as the broker.

### Running Celery Workers

**Option 1: Using Docker Compose (recommended)**
```bash
# Start Celery services alongside the app
docker compose --profile celery up -d
```

**Option 2: Running locally**
```bash
# Worker (processes tasks)
cd backend
uv run celery -A config.celery_app worker -l info

# Beat (schedules periodic tasks) - in another terminal
uv run celery -A config.celery_app beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### Creating Tasks

Add tasks to any app's `tasks.py`:

```python
from celery import shared_task

@shared_task
def my_task(arg1, arg2):
    # Task logic here
    return result
```

Call tasks asynchronously:

```python
from myapp.tasks import my_task

# Queue the task
my_task.delay(arg1, arg2)

# Or with options
my_task.apply_async(args=[arg1, arg2], countdown=60)
```

### Periodic Tasks

Configure periodic tasks in Django admin under "Periodic Tasks" or programmatically:

```python
from django_celery_beat.models import PeriodicTask, IntervalSchedule

schedule, _ = IntervalSchedule.objects.get_or_create(
    every=10,
    period=IntervalSchedule.MINUTES,
)

PeriodicTask.objects.create(
    interval=schedule,
    name='My periodic task',
    task='myapp.tasks.my_task',
)
```

## Project Structure

```
backend/
├── config/                 # Project configuration
│   ├── settings/
│   │   ├── base.py        # Common settings
│   │   ├── local.py       # Development settings
│   │   ├── production.py  # Production settings
│   │   └── test.py        # Test settings
│   ├── celery_app.py      # Celery configuration
│   ├── urls.py            # URL routing
│   └── wsgi.py            # WSGI application
├── users/                  # Custom user model
│   ├── models.py          # User model (email-based)
│   ├── admin.py           # User admin
│   └── serializers.py     # User serializers
├── api/                    # API application
│   ├── views.py           # API views
│   ├── urls.py            # API routes
│   └── tasks.py           # Celery tasks
├── static/                 # Static files
├── templates/              # Django templates
├── media/                  # User uploads
└── manage.py

frontend/
├── app/                    # Next.js app directory
├── components/             # React components
└── package.json
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DJANGO_SETTINGS_MODULE` | `config.settings.local` | Settings module |
| `DJANGO_DEBUG` | `True` | Debug mode |
| `DJANGO_SECRET_KEY` | dev key | Secret key (set in production!) |
| `DATABASE_URL` | postgres://... | Database connection |
| `REDIS_URL` | redis://redis:6379/0 | Redis connection |
| `CELERY_BROKER_URL` | redis://redis:6379/0 | Celery broker |

## URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/
- API Auth: http://localhost:8000/api/auth/

## Development Tips

### Creating a Superuser
```bash
cd backend
uv run python manage.py createsuperuser
```

### Running Tests
```bash
cd backend
uv run pytest
```

### Code Formatting
```bash
cd backend
uv run ruff check .
uv run ruff format .
```

### Type Checking
```bash
cd backend
uv run mypy .
```
