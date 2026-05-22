#!/bin/bash

# start-local.sh
# Starts infrastructure in Docker, but runs Hermes AI apps locally using npx concurrently.

set -e

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down Docker infrastructure..."
    docker compose stop postgres_cms postgres_authoring zookeeper kafka
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

# Check for Python venv
if [ ! -d apps/content-authoring-service/venv ]; then
    echo "⚠️  Python virtual environment not found at apps/content-authoring-service/venv!"
    echo "Please create it and install requirements:"
    echo "  cd apps/content-authoring-service"
    echo "  python -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
fi

echo "🚀 Starting Hermes AI Infrastructure inside Docker Compose..."
docker compose up -d postgres_cms postgres_authoring zookeeper kafka

echo "📦 Installing local dependencies..."
(cd apps/content-management-engine && pnpm install)
(cd apps/site-templates/nextjs-blog && pnpm install)
(cd apps/site-templates/astro-portfolio && pnpm install)

echo ""
echo "✨ Infrastructure is running! Starting local applications..."
echo "--------------------------------------------------"
echo "💻 Engine Admin:    http://localhost:3000/admin"
echo "✍️  Authoring:       http://localhost:8000/health"
echo "📄 Next.js Blog:    http://localhost:3001"
echo "🎨 Astro Portfolio: http://localhost:3002"
echo "--------------------------------------------------"
echo "Press Ctrl+C to stop all services."
echo ""

# Start all apps concurrently
# -k: kill all other processes if one exits
# -p: use prefixed output
npx concurrently -k -p "[{name}]" \
  -n "CMS,AI,Blog,Astro" \
  -c "bgBlue.bold,bgMagenta.bold,bgGreen.bold,bgYellow.bold" \
  "cd apps/content-management-engine && pnpm dev" \
  "cd apps/content-authoring-service && ./venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload" \
  "cd apps/site-templates/nextjs-blog && PORT=3001 pnpm dev" \
  "cd apps/site-templates/astro-portfolio && pnpm dev --port 3002"
