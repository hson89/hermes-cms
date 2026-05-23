#!/bin/bash

# start-langfuse.sh
# Starts the Langfuse Observability Stack independently.

set -e

# Ensure shared network exists
docker network create hermes-net 2>/dev/null || true

echo "🚀 Starting Langfuse Observability Stack..."
docker compose -f docker-compose.langfuse.yml up -d

if [ -d apps/content-authoring-service/venv ]; then
    echo "⏳ Waiting for Langfuse to be fully ready..."
    for i in {1..30}; do
        if curl -s http://localhost:3003/api/public/health >/dev/null || curl -s http://localhost:3003/ >/dev/null; then
            echo "✅ Langfuse is ready!"
            echo "📝 Populating/updating Langfuse prompt templates..."
            (cd apps/content-authoring-service && ./venv/bin/python src/domain/content_drafting/populate_prompts.py) || echo "⚠️  Failed to populate Langfuse prompts. Skipping..."
            break
        fi
        sleep 2
    done
fi

echo ""
echo "✨ Langfuse is running!"
echo "--------------------------------------------------"
echo "📊 Langfuse UI:     http://localhost:3003"
echo "--------------------------------------------------"
