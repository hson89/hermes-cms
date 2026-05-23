# s:\Dev\hermes-cms\scripts\safe-kill.ps1
# Safe Process Manager for Hermes AI Dev Env on Windows

$ErrorActionPreference = "Stop"

Write-Host "🛡️ Safely terminating stale Hermes AI development processes..." -ForegroundColor Cyan

# Port check for Next.js (3000), AI (8000)
$targetPorts = @(3000, 8000)

foreach ($port in $targetPorts) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $pid = $conn.OwningProcess
            if ($pid -and $pid -ne 0) {
                Write-Host "📍 Found process using port $port (PID: $pid). Terminating..." -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# Target specific Next.js and Payload sub-processes by name
$targetPatterns = @(
    "next-router-worker",
    "next-dev",
    "next-render",
    "turbopack",
    "uvicorn"
)

foreach ($pattern in $targetPatterns) {
    Write-Host "🔍 Checking for process matching: $pattern" -ForegroundColor Gray
    $processes = Get-Process | Where-Object { $_.Name -like "*$pattern*" -or $_.Description -like "*$pattern*" }
    foreach ($proc in $processes) {
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

Write-Host "✅ Safe process cleanup complete!" -ForegroundColor Green
