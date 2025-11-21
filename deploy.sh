#!/usr/bin/env bash
set -euo pipefail

# Deployment script for Jenkins
# This script handles frontend build, backend migrations, and admin user setup

echo "Starting deployment..."

# Frontend build (if not already done)
if [ -d "frontend" ]; then
    echo "Building frontend..."
    cd frontend
    npm ci
    npm run build
    cd ..
fi

# Backend setup
if [ -d "backend" ]; then
    echo "Setting up backend..."
    cd backend
    
    # Set Python path
    export PYTHONPATH=./
    
    # Run migrations
    echo "Running migrations..."
    python manage.py migrate --noinput
    
    # Create/update admin user
    echo "Creating/updating admin user..."
    python manage.py create_admin_user
    
    # Collect static files
    echo "Collecting static files..."
    python manage.py collectstatic --noinput
    
    cd ..
fi

echo "Deployment setup complete!"

