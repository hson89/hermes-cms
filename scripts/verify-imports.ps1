# s:\Dev\hermes-cms\scripts\verify-imports.ps1
# Validates Payload importMap.js resolution on Windows

$ErrorActionPreference = "Stop"

$importMap = "apps/content-management-engine/src/app/(payload)/admin/importMap.js"

if (-not (Test-Path $importMap)) {
    Write-Host "❌ importMap.js not found!" -ForegroundColor Red
    exit 1
}

Write-Host "🔍 Verifying relative imports in $importMap..." -ForegroundColor Cyan

# Read file lines
$lines = Get-Content $importMap
$brokenCount = 0

foreach ($line in $lines) {
    # Match lines like: import { ... } from './path' or similar
    if ($line -match "from '([^']+)'") {
        $importPath = $Matches[1]
        
        # We only check relative imports starting with .
        if ($importPath.StartsWith(".")) {
            $targetDir = "apps/content-management-engine/src/app/(payload)/admin"
            $fullPath = Join-Path $targetDir $importPath
            
            # Check combinations: exact path, path.ts, path.tsx, path/index.ts, etc.
            $exists = $false
            if (Test-Path $fullPath) { $exists = $true }
            elseif (Test-Path "$fullPath.ts") { $exists = $true }
            elseif (Test-Path "$fullPath.tsx") { $exists = $true }
            elseif (Test-Path (Join-Path $fullPath "index.ts")) { $exists = $true }
            elseif (Test-Path (Join-Path $fullPath "index.tsx")) { $exists = $true }
            
            if (-not $exists) {
                Write-Host "🚨 Broken import found: '$importPath' does not resolve on disk!" -ForegroundColor Red
                Write-Host "   Attempted path: $fullPath" -ForegroundColor DarkGray
                $brokenCount++
            }
        }
    }
}

if ($brokenCount -gt 0) {
    Write-Host "💡 Run 'pnpm payload generate:importmap' or adjust baseDir." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✨ All importMap.js relative paths are valid!" -ForegroundColor Green
}
