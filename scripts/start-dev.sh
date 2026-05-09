#!/bin/bash

# start-dev.sh
# Starts all services required for Hermes CMS local development and testing.

set -e

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    [ -n "$AI_PID" ] && kill $AI_PID 2>/dev/null
    [ -n "$CMS_PID" ] && kill $CMS_PID 2>/dev/null
    docker-compose stop
    echo "✅ Done."
}

trap cleanup INT TERM

echo "🚀 Starting infrastructure (Postgres, Kafka)..."
docker-compose up -d

# Wait for Postgres to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Setup Environment Variables if missing
echo "📝 Checking environment variables..."
if [ ! -f apps/cms/.env ]; then
    echo "Creating apps/cms/.env from example..."
    cp apps/cms/.env.example apps/cms/.env
    echo "⚠️  Please update apps/cms/.env with your OPENAI_API_KEY"
fi

if [ ! -f apps/ai-agent-service/.env ]; then
    echo "Creating apps/ai-agent-service/.env from example..."
    cp apps/ai-agent-service/.env.example apps/ai-agent-service/.env
    echo "⚠️  Please update apps/ai-agent-service/.env with your OPENAI_API_KEY"
fi

# Start AI Service
echo "🤖 Starting AI Agent Service..."
cd apps/ai-agent-service
if [ ! -d venv ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
fi
# Export env vars from .env file for uvicorn
export $(grep -v '^#' .env | xargs)
./venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload &
AI_PID=$!
cd ../..

# Start CMS
echo "📦 Starting Payload CMS..."
cd apps/cms
if [ ! -d node_modules ]; then
    echo "Installing Node.js dependencies..."
    pnpm install
fi
pnpm dev &
CMS_PID=$!
cd ../..

echo ""
echo "✨ All services are starting up!"
echo "--------------------------------------------------"
echo "💻 CMS Admin:       http://localhost:3000/admin"
echo "🤖 AI Service:      http://localhost:8000/health"
echo "📊 Kafka UI:        http://localhost:9092 (broker)"
echo "🗄️  CMS Postgres:   localhost:5432"
echo "🗄️  AI Postgres:    localhost:5433"
echo "--------------------------------------------------"
echo "Press Ctrl+C to stop all services."

# Wait for background processes
wait $AI_PID $CMS_PID
