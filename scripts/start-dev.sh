#!/bin/bash

# start-dev.sh
# Starts all services required for Hermes AI local development and testing in Docker.

set -e

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    docker compose stop
    echo "✅ Done."
}

trap cleanup INT TERM

# Function to kill process on a port
kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port)
    if [ -n "$pids" ]; then
        echo "⚠️  Port $port is in use by local host processes. Cleaning up (killing PIDs: $pids)..."
        kill -9 $pids 2>/dev/null || true
    fi
}

echo "🧹 Cleaning up any conflicting local port processes..."
kill_port 3000
kill_port 3001
kill_port 3002
kill_port 8000

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

echo "🚀 Starting Hermes AI Stack inside Docker Compose..."
docker compose up -d --build

echo ""
echo "✨ All services are running!"
echo "--------------------------------------------------"
echo "💻 Engine Admin:    http://localhost:3000/admin"
echo "✍️  Authoring:       http://localhost:8000/health"
echo "📄 Next.js Blog:    http://localhost:3001"
echo "🎨 Astro Portfolio: http://localhost:3002"
echo "📊 Kafka UI:        http://localhost:9092 (broker)"
echo "🗄️  Engine DB:      localhost:5432"
echo "🗄️  Authoring DB:   localhost:5433"
echo "--------------------------------------------------"
echo "Press Ctrl+C to stop all services."
echo "📋 Showing live logs from CMS engine and site templates..."
echo ""

# Tail the logs of our web/node-based apps
docker compose logs -f content_management_engine nextjs_blog astro_portfolio
