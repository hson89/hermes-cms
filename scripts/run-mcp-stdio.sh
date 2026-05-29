#!/bin/bash

# run-mcp-stdio.sh - Local developer stdio bootstrap for Claude Desktop
# Part of specs/007-a2a-mcp-integration

set -e

# Get repo root path
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$SCRIPT_DIR/.."

# Navigate to content-authoring-service
cd "$REPO_ROOT/apps/content-authoring-service"

# Check if virtualenv exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment 'venv' not found in apps/content-authoring-service." >&2
    echo "Please run ./scripts/start-dev.sh or set up the virtualenv first." >&2
    exit 1
fi

# Ensure API Key is configured in environment
if [ -z "$HERMES_API_KEY" ]; then
    echo "WARNING: HERMES_API_KEY is not set in environment." >&2
    echo "The MCP server requires a valid API key for authentication." >&2
fi

# Execute FastMCP server stdio transport
exec ./venv/bin/python -c "from src.application.mcp.server import mcp; mcp.run()"
