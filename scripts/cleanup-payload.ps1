# s:\Dev\hermes-cms\scripts\cleanup-payload.ps1
# Hermes AI - Payload & Next.js Environment Cleanup Utility for Windows
# This script clears zombie processes, removes build artifacts, and regenerates mapping files.

$ErrorActionPreference = "Stop"

Write-Host "🧹 Starting Hermes AI Admin UI Cleanup..." -ForegroundColor Cyan

# 1. Kill zombie node processes related to Payload/Next
Write-Host "🛑 Terminating stale Node/turbopack/tsx/uvicorn processes..." -ForegroundColor Gray

# Helper to kill process by pattern safely
function Stop-ProcessByNamePattern {
    param([string]$pattern)
    $processes = Get-Process | Where-Object { $_.Name -like "*$pattern*" -or $_.Description -like "*$pattern*" }
    foreach ($proc in $processes) {
        # Check command line if possible to avoid killing ourselves or protected agent sessions
        try {
            $cmd = $proc.CommandLine
            if ($cmd -and ($cmd -like "*.antigravity*" -or $cmd -like "*mcp-remote*")) {
                Write-Host "⚠️ Skipping protected Agent session process ($($proc.Name), PID: $($proc.Id))" -ForegroundColor Yellow
                continue
            }
        } catch {}
        
        Write-Host "💀 Terminating stale process '$($proc.Name)' (PID: $($proc.Id))..." -ForegroundColor DarkGray
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}

Stop-ProcessByNamePattern "next-dev"
Stop-ProcessByNamePattern "next-router-worker"
Stop-ProcessByNamePattern "turbopack"
Stop-ProcessByNamePattern "tsx"
Stop-ProcessByNamePattern "uvicorn"

# 2. Clean temporary build artifacts
Write-Host "🗑️ Removing build caches and temporary files..." -ForegroundColor Gray
$nextCache = Join-Path "apps\content-management-engine" ".next"
$nodeModulesCache = Join-Path "apps\content-management-engine\node_modules" ".cache"

if (Test-Path $nextCache) {
    Remove-Item $nextCache -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path $nodeModulesCache) {
    Remove-Item $nodeModulesCache -Recurse -Force -ErrorAction SilentlyContinue
}

# 3. Regenerate Payload Import Map
Write-Host "🗺️ Regenerating Payload importMap..." -ForegroundColor Gray
Push-Location (Join-Path "apps" "content-management-engine")
try {
    # Set env variable dynamically for this command execution
    $env:PAYLOAD_CONFIG_PATH = "src/payload.config.ts"
    pnpm payload generate:importmap
}
finally {
    $env:PAYLOAD_CONFIG_PATH = $null
    Pop-Location
}

# 4. Regenerate Types (optional but recommended)
Write-Host "🧬 Regenerating Payload types..." -ForegroundColor Gray
Push-Location (Join-Path "apps" "content-management-engine")
try {
    $env:PAYLOAD_CONFIG_PATH = "src/payload.config.ts"
    pnpm payload generate:types
}
finally {
    $env:PAYLOAD_CONFIG_PATH = $null
    Pop-Location
}

Write-Host "✅ Cleanup complete. You can now run .\scripts\start-dev.ps1" -ForegroundColor Green
