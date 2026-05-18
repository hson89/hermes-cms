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
if [ ! -f apps/content-management-engine/.env ]; then
    echo "Creating apps/content-management-engine/.env from example..."
    cp apps/content-management-engine/.env.example apps/content-management-engine/.env
    echo "⚠️  Please update apps/content-management-engine/.env with your OPENAI_API_KEY"
fi

if [ ! -f apps/content-authoring-service/.env ]; then
    echo "Creating apps/content-authoring-service/.env from example..."
    cp apps/content-authoring-service/.env.example apps/content-authoring-service/.env
    echo "⚠️  Please update apps/content-authoring-service/.env with your API keys"
fi

echo "🚀 Starting infrastructure (Postgres, Kafka, Content Authoring Service)..."
docker-compose up -d --build

# Wait for Postgres to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Start CMS
echo "📦 Starting Content Management Engine..."
cd apps/content-management-engine
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
echo "💻 Engine Admin:    http://localhost:3000/admin"
echo "✍️  Authoring:       http://localhost:8000/health"
echo "📊 Kafka UI:        http://localhost:9092 (broker)"
echo "🗄️  Engine DB:      localhost:5432"
echo "🗄️  Authoring DB:   localhost:5433"
echo "--------------------------------------------------"
echo "Press Ctrl+C to stop all services."
echo "💡 UI broken? Run ./scripts/cleanup-payload.sh to reset mapping."

# Wait for background processes
wait $CMS_PID
