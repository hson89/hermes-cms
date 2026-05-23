# s:\Dev\hermes-cms\scripts\start-dev.ps1
# Starts all services required for Hermes AI local development and testing in Docker on Windows.

# Set strict error action
$ErrorActionPreference = "Stop"

# Function to kill processes on a port
function Kill-Port {
    param([int]$port)
    # Using Get-NetTCPConnection to find processes listening on the port
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $pid = $conn.OwningProcess
            if ($pid -and $pid -ne 0) {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "⚠️ Port $port is in use by '$($process.Name)' (PID: $pid). Cleaning up..." -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }
}

Write-Host "🧹 Cleaning up any conflicting local port processes..." -ForegroundColor Gray
Kill-Port 3000
Kill-Port 3001
Kill-Port 3002
Kill-Port 3003
Kill-Port 8000

# Parse arguments
$skipLangfuse = $args -contains "--no-langfuse" -or $args -contains "-NoLangfuse"

# Setup Environment Variables if missing
Write-Host "📝 Checking environment variables..." -ForegroundColor Gray

$engineEnv = Join-Path "apps\content-management-engine" ".env"
$engineEnvExample = Join-Path "apps\content-management-engine" ".env.example"
if (-not (Test-Path $engineEnv)) {
    Write-Host "Creating apps/content-management-engine/.env from example..." -ForegroundColor Cyan
    Copy-Item $engineEnvExample $engineEnv
    Write-Host "⚠️ Please update apps/content-management-engine/.env with your OPENAI_API_KEY" -ForegroundColor Yellow
}

$authoringEnv = Join-Path "apps\content-authoring-service" ".env"
$authoringEnvExample = Join-Path "apps\content-authoring-service" ".env.example"
if (-not (Test-Path $authoringEnv)) {
    Write-Host "Creating apps/content-authoring-service/.env from example..." -ForegroundColor Cyan
    Copy-Item $authoringEnvExample $authoringEnv
    Write-Host "⚠️ Please update apps/content-authoring-service/.env with your API keys" -ForegroundColor Yellow
}

# Ensure shared network exists
$null = docker network create hermes-net 2>$null

if (-not $skipLangfuse) {
    Write-Host "🚀 Starting Langfuse Observability Stack..." -ForegroundColor Cyan
    docker-compose -f docker-compose.langfuse.yml up -d
}

Write-Host "🚀 Starting Hermes AI Stack inside Docker Compose..." -ForegroundColor Green
docker-compose up -d --build

if (-not $skipLangfuse) {
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
            docker-compose exec -T content_authoring_service env LANGFUSE_BASE_URL=http://langfuse-web:3000 python src/domain/content_drafting/populate_prompts.py
        }
        catch {
            Write-Host "⚠️ Failed to populate Langfuse prompts inside container. Skipping..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ Langfuse did not become ready in time. Skipping prompt population." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✨ All services are running!" -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor DarkGray
Write-Host "💻 Engine Admin:    http://localhost:3000/admin" -ForegroundColor Cyan
Write-Host "✍️  Authoring:       http://localhost:8000/health" -ForegroundColor Cyan
Write-Host "📄 Next.js Blog:    http://localhost:3001" -ForegroundColor Cyan
Write-Host "🎨 Astro Portfolio: http://localhost:3002" -ForegroundColor Cyan
if (-not $skipLangfuse) {
    Write-Host "📊 Langfuse UI:     http://localhost:3003" -ForegroundColor Cyan
}
Write-Host "📊 Kafka UI:        http://localhost:9092 (broker)" -ForegroundColor Cyan
Write-Host "🗄️  Engine DB:      localhost:5432" -ForegroundColor Cyan
Write-Host "🗄️  Authoring DB:   localhost:5433" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor DarkGray
Write-Host "Press Ctrl+C to stop all services." -ForegroundColor Yellow
Write-Host "📋 Showing live logs from CMS engine and site templates..." -ForegroundColor Gray
Write-Host ""

try {
    # Tail the logs of our web/node-based apps
    docker-compose logs -f content_management_engine nextjs_blog astro_portfolio
}
finally {
    Write-Host ""
    Write-Host "🛑 Shutting down services..." -ForegroundColor Red
    docker-compose stop
    docker-compose -f docker-compose.langfuse.yml stop 2>$null
    Write-Host "✅ Done." -ForegroundColor Green
}
