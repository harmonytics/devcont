#!/bin/bash
set -e

# Check if workspace is empty (no backend or frontend)
if [ ! -f "/workspace/backend/manage.py" ] && [ ! -f "/workspace/frontend/package.json" ]; then
    echo "Workspace empty, copying Django + Next.js starter template..."

    # Copy template files
    cp -r /app-template/backend/* /workspace/backend/ 2>/dev/null || cp -r /app-template/backend/. /workspace/backend/
    cp -r /app-template/frontend/* /workspace/frontend/ 2>/dev/null || cp -r /app-template/frontend/. /workspace/frontend/

    # Copy root files if any
    cp /app-template/.gitignore /workspace/ 2>/dev/null || true
    cp /app-template/README.md /workspace/ 2>/dev/null || true
    cp /app-template/docker-compose.yml /workspace/ 2>/dev/null || true

    echo "Installing backend dependencies..."
    cd /workspace/backend && uv sync 2>/dev/null || echo "Run 'cd backend && uv sync' manually"

    echo "Installing frontend dependencies..."
    cd /workspace/frontend && npm install 2>/dev/null || echo "Run 'cd frontend && npm install' manually"

    echo ""
    echo "Project ready!"
    echo ""
    echo "Backend (Django + DRF + Celery + Allauth):"
    echo "  cd backend && uv run python manage.py migrate"
    echo "  cd backend && uv run python manage.py createsuperuser"
    echo "  cd backend && uv run python manage.py runserver 0.0.0.0:8000"
    echo ""
    echo "Frontend (Next.js):"
    echo "  cd frontend && npm run dev"
    echo ""
    echo "API Endpoints:"
    echo "  - Health check: http://localhost:8000/api/health/"
    echo "  - Admin: http://localhost:8000/admin/"
    echo "  - Auth: http://localhost:8000/api/auth/"
    echo "  - Registration: http://localhost:8000/api/auth/registration/"
    echo ""
fi

exec "$@"
