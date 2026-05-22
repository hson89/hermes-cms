#!/bin/bash

# start-langfuse.sh
# Starts the Langfuse Observability Stack independently.

set -e

echo "🚀 Starting Langfuse Observability Stack..."
docker compose -f docker-compose.langfuse.yml up -d

echo ""
echo "✨ Langfuse is running!"
echo "--------------------------------------------------"
echo "📊 Langfuse UI:     http://localhost:3003"
echo "--------------------------------------------------"
