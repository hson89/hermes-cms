#!/bin/bash

# Hermes AI - Payload & Next.js Environment Cleanup Utility
# This script clears zombie processes, removes build artifacts, and regenerates mapping files.

set -e

echo "🧹 Starting Hermes AI Admin UI Cleanup..."

# 1. Kill zombie node processes related to Payload/Next
echo "🛑 Terminating stale Node processes..."
# Using pkill with pattern matching for Payload/Next/Turbopack
pkill -f "next-dev" || true
pkill -f "payload generate" || true
pkill -f "turbopack" || true

# 2. Clean temporary build artifacts
echo "🗑️ Removing build caches and temporary files..."
rm -rf apps/cms/.next
rm -rf apps/cms/node_modules/.cache

# 3. Regenerate Payload Import Map
echo "🗺️ Regenerating Payload importMap..."
cd apps/cms
pnpm payload generate:importmap

# 4. Regenerate Types (optional but recommended)
echo "🧬 Regenerating Payload types..."
pnpm payload generate:types

echo "✅ Cleanup complete. You can now run ./scripts/start-dev.sh"
