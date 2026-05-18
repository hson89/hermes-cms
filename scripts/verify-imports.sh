#!/bin/bash
# scripts/verify-imports.sh - Validates Payload importMap.js resolution

set -euo pipefail

IMPORT_MAP="apps/content-management-engine/src/app/(payload)/admin/importMap.js"

if [ ! -f "$IMPORT_MAP" ]; then
  echo "❌ importMap.js not found!"
  exit 1
fi

echo "🔍 Verifying relative imports in $IMPORT_MAP..."

# Scan for all imported paths and check if they actually resolve on disk
grep "from '" "$IMPORT_MAP" | sed -E "s/.*from '(.*)'/\1/" | while read -r line; do
  if [[ "$line" == .* ]]; then
    # Calculate absolute path relative to the importMap directory
    target_dir="apps/content-management-engine/src/app/(payload)/admin"
    resolved_path=$(realpath -q "$target_dir/$line" || echo "FAILED")
    
    if [ "$resolved_path" == "FAILED" ] || { [ ! -e "$resolved_path" ] && [ ! -e "${resolved_path}.ts" ] && [ ! -e "${resolved_path}.tsx" ]; }; then
      echo "🚨 Broken import found: '$line' does not resolve on disk!"
      echo "💡 Run 'pnpm payload generate:importmap' or adjust baseDir."
      exit 1
    fi
  fi
done

echo "✨ All importMap.js relative paths are valid!"
