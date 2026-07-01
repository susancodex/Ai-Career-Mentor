#!/bin/bash
# fast run the project

echo "Starting AI Service..."
cd ai_service
GOOGLE_API_KEY="dummy_key_for_testing" AI_SERVICE_SHARED_SECRET="dev-shared-secret-change-in-prod" uv run uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
PID_AI=$!
cd ..

echo "Starting Backend..."
cd backend
DJANGO_SETTINGS_MODULE=config.settings.dev AI_SERVICE_URL=http://localhost:8001 AI_SERVICE_SHARED_SECRET=dev-shared-secret-change-in-prod DEBUG=True DJANGO_ALLOW_ASYNC_UNSAFE=true uv run python manage.py runserver 0.0.0.0:8000 &
PID_BACKEND=$!
cd ..

echo "Starting Frontend..."
cd frontend
PORT=5001 BASE_PATH=/ VITE_CLOUDINARY_UPLOAD_PRESET=resume_upload pnpm dev &
PID_FRONTEND=$!
cd ..

echo "All services started! Press Ctrl+C to stop them all."

# Trap Ctrl+C (SIGINT) and kill all background processes
trap "echo 'Stopping services...'; kill $PID_AI $PID_BACKEND $PID_FRONTEND; exit" SIGINT

wait
