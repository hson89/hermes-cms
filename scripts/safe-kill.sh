#!/bin/bash
# scripts/safe-kill.sh - Safe Process Manager for Hermes AI Dev Env

set -euo pipefail

echo "🛡️ Safely terminating stale Hermes AI development processes..."

# Port check for Next.js (3000), AI (8000)
TARGET_PORTS=(3000 8000)

for PORT in "${TARGET_PORTS[@]}"; do
  PID=$(lsof -t -i:"$PORT" 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo "📍 Found process using port $PORT (PID: $PID). Terminating..."
    kill -15 "$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null || true
  fi
done

# Target specific Next.js and Payload sub-processes by name
TARGET_PATTERNS=(
  "next-router-worker"
  "next-dev"
  "next-render"
  "payload generate"
  "payload serve"
  "turbopack"
  "uvicorn"
)

for PATTERN in "${TARGET_PATTERNS[@]}"; do
  echo "🔍 Checking for process matching: $PATTERN"
  # Find PIDs matching the pattern, but carefully exclude VSCode/agent processes
  pids=$(pgrep -f "$PATTERN" 2>/dev/null || true)
  for pid in $pids; do
    cmd=$(ps -p "$pid" -o args= 2>/dev/null || true)
    if [[ "$cmd" == *".antigravity"* || "$cmd" == *"mcp-remote"* ]]; then
      echo "⚠️ Skipping protected Agent session process (PID: $pid)"
    else
      echo "💀 Terminating stale process (PID: $pid): $cmd"
      kill -15 "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
    fi
  done
done

echo "✅ Safe process cleanup complete!"
