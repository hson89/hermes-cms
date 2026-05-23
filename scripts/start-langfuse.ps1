# start-langfuse.ps1
# Starts the Langfuse Observability Stack independently (Windows).

# Ensure shared network exists
$null = docker network create hermes-net 2>$null

Write-Host "🚀 Starting Langfuse Observability Stack..." -ForegroundColor Cyan
docker compose -f docker-compose.langfuse.yml up -d

# Check for Python venv
$venvPath = Join-Path "apps\content-authoring-service" "venv"
if (Test-Path $venvPath) {
    Write-Host "⏳ Waiting for Langfuse to be ready..." -ForegroundColor Gray
    $ready = $false
    for ($i = 1; $i -le 30; $i++) {
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:3003/api/public/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200 -or $resp.StatusCode -eq 302) {
                $ready = $true
                break
            }
        }
        catch {
            try {
                $resp2 = Invoke-WebRequest -Uri "http://localhost:3003/" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($resp2.StatusCode -eq 200 -or $resp2.StatusCode -eq 302) {
                    $ready = $true
                    break
                }
            }
            catch {}
        }
        Start-Sleep -Seconds 2
    }

    if ($ready) {
        Write-Host "✅ Langfuse is ready!" -ForegroundColor Green
        Write-Host "📝 Populating/updating Langfuse prompt templates..." -ForegroundColor Cyan
        try {
            Push-Location apps/content-authoring-service
            $pythonPath = Join-Path "venv" "Scripts\python.exe"
            & $pythonPath src/domain/content_drafting/populate_prompts.py
            Pop-Location
        }
        catch {
            Write-Host "⚠️ Failed to populate Langfuse prompts: $_. Skipping..." -ForegroundColor Yellow
            Pop-Location
        }
    } else {
        Write-Host "⚠️ Langfuse did not become ready in time. Skipping prompt population." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✨ Langfuse is running!" -ForegroundColor Green
Write-Host "--------------------------------------------------"
Write-Host "📊 Langfuse UI:     http://localhost:3003"
Write-Host "--------------------------------------------------"
