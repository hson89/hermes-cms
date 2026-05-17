#!/bin/bash

# start-dev.sh
# Starts all services required for Hermes AI local development and testing.

set -e

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    [ -n "$CMS_PID" ] && kill $CMS_PID 2>/dev/null
    docker-compose stop
    echo "✅ Done."
}

trap cleanup INT TERM

# Function to kill process on a port
kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port)
    if [ -n "$pids" ]; then
        echo "⚠️  Port $port is in use. Cleaning up (killing PIDs: $pids)..."
        kill -9 $pids 2>/dev/null || true
    fi
}

echo "🧹 Cleaning up existing processes..."
# Kill by port
kill_port 3000
kill_port 8000
# Kill by name just in case
pkill -f "next dev" || true
pkill -f "uvicorn" || true

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

echo "🚀 Starting infrastructure (Postgres, Kafka, AI Service)..."
docker-compose up -d --build

# Wait for Postgres to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

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
echo "💡 UI broken? Run ./scripts/cleanup-payload.sh to reset mapping."

# Wait for background processes
wait $CMS_PID
