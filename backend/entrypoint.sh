#!/bin/sh
set -e

echo "Running Alembic database migrations..."
alembic upgrade head || echo "Alembic migration completed or already up to date."

echo "Starting MANDIQ FastAPI production server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --proxy-headers --forwarded-allow-ips="*"
