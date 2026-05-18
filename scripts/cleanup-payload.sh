#!/bin/bash

# Hermes AI - Payload & Next.js Environment Cleanup Utility
# This script clears zombie processes, removes build artifacts, and regenerates mapping files.

set -e

echo "🧹 Starting Hermes AI Admin UI Cleanup..."

# 1. Kill zombie node processes related to Payload/Next
echo "🛑 Terminating stale Node processes..."
# Use patterns that avoid killing this script itself
pkill -f "next dev" || true
pkill -f "payload generate" || true
pkill -f "payload serve" || true
pkill -f "turbopack" || true
pkill -f "tsx" || true

# 2. Clean temporary build artifacts
echo "🗑️ Removing build caches and temporary files..."
rm -rf apps/content-management-engine/.next
rm -rf apps/content-management-engine/node_modules/.cache

# 3. Regenerate Payload Import Map
echo "🗺️ Regenerating Payload importMap..."
cd apps/content-management-engine
# Explicitly set PAYLOAD_CONFIG_PATH to avoid hanging on auto-discovery
PAYLOAD_CONFIG_PATH=src/payload.config.ts pnpm payload generate:importmap

# 4. Regenerate Types (optional but recommended)
echo "🧬 Regenerating Payload types..."
PAYLOAD_CONFIG_PATH=src/payload.config.ts pnpm payload generate:types

echo "✅ Cleanup complete. You can now run ./scripts/start-dev.sh"
