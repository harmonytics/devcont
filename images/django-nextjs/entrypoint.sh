#!/bin/bash
set -e

# Check if workspace is empty (no backend or frontend)
if [ ! -d "/workspace/backend/manage.py" ] && [ ! -f "/workspace/frontend/package.json" ]; then
    echo "🚀 Workspace empty, copying Django + Next.js starter template..."

    # Copy template files
    cp -r /app-template/backend/* /workspace/backend/ 2>/dev/null || cp -r /app-template/backend/. /workspace/backend/
    cp -r /app-template/frontend/* /workspace/frontend/ 2>/dev/null || cp -r /app-template/frontend/. /workspace/frontend/

    # Copy root files if any
    cp /app-template/.gitignore /workspace/ 2>/dev/null || true
    cp /app-template/README.md /workspace/ 2>/dev/null || true
    cp /app-template/docker-compose.yml /workspace/ 2>/dev/null || true

    echo "📦 Installing backend dependencies..."
    cd /workspace/backend && uv sync 2>/dev/null || echo "⚠️  Run 'cd backend && uv sync' manually"

    echo "📦 Installing frontend dependencies..."
    cd /workspace/frontend && npm install 2>/dev/null || echo "⚠️  Run 'cd frontend && npm install' manually"

    echo ""
    echo "✅ Project ready!"
    echo ""
    echo "   Backend:  cd backend && uv run python manage.py runserver"
    echo "   Frontend: cd frontend && npm run dev"
    echo ""
fi

exec "$@"
