# start-local.ps1
# Starts infrastructure in Docker, but runs Hermes AI apps locally using npx concurrently on Windows.

# Set strict error action
$ErrorActionPreference = "Stop"

# Function to kill processes on a port
function Kill-Port {
    param([int]$port)
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

# Check for Python venv
$venvPath = Join-Path "apps\content-authoring-service" "venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "⚠️ Python virtual environment not found at apps\content-authoring-service\venv!" -ForegroundColor Red
    Write-Host "Please create it and install requirements:" -ForegroundColor Yellow
    Write-Host "  cd apps\content-authoring-service" -ForegroundColor Yellow
    Write-Host "  python -m venv venv" -ForegroundColor Yellow
    Write-Host "  .\venv\Scripts\activate" -ForegroundColor Yellow
    Write-Host "  pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Ensure shared network exists
$null = docker network create hermes-net 2>$null

if (-not $skipLangfuse) {
    Write-Host "🚀 Starting Langfuse Observability Stack..." -ForegroundColor Cyan
    docker-compose -f docker-compose.langfuse.yml up -d
}

Write-Host "🚀 Starting Hermes AI Infrastructure inside Docker Compose..." -ForegroundColor Green
docker-compose up -d postgres_cms postgres_authoring zookeeper kafka

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

Write-Host "📦 Installing local dependencies..." -ForegroundColor Gray
Push-Location apps/content-management-engine; pnpm install; Pop-Location
Push-Location apps/site-templates/nextjs-blog; pnpm install; Pop-Location
Push-Location apps/site-templates/astro-portfolio; pnpm install; Pop-Location

Write-Host ""
Write-Host "✨ Infrastructure is running! Starting local applications..." -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor DarkGray
Write-Host "💻 Engine Admin:    http://localhost:3000/admin" -ForegroundColor Cyan
Write-Host "✍️  Authoring:       http://localhost:8000/health" -ForegroundColor Cyan
Write-Host "📄 Next.js Blog:    http://localhost:3001" -ForegroundColor Cyan
Write-Host "🎨 Astro Portfolio: http://localhost:3002" -ForegroundColor Cyan
if (-not $skipLangfuse) {
    Write-Host "📊 Langfuse UI:     http://localhost:3003" -ForegroundColor Cyan
}
Write-Host "--------------------------------------------------" -ForegroundColor DarkGray
Write-Host "Press Ctrl+C to stop all services." -ForegroundColor Yellow
Write-Host ""

try {
    # Start all apps concurrently using npx concurrently
    # On Windows, we use npx cross-env to set PORT for Next.js compatibility
    npx concurrently -k -p "[{name}]" `
      -n "CMS,AI,Blog,Astro" `
      -c "bgBlue.bold,bgMagenta.bold,bgGreen.bold,bgYellow.bold" `
      "cd apps/content-management-engine && pnpm dev" `
      "cd apps/content-authoring-service && .\venv\Scripts\uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload" `
      "cd apps/site-templates/nextjs-blog && npx cross-env PORT=3001 pnpm dev" `
      "cd apps/site-templates/astro-portfolio && pnpm dev --port 3002"
}
finally {
    Write-Host ""
    Write-Host "🛑 Shutting down Docker infrastructure..." -ForegroundColor Red
    docker-compose stop postgres_cms postgres_authoring zookeeper kafka
    docker-compose -f docker-compose.langfuse.yml stop 2>$null
    Write-Host "✅ Done." -ForegroundColor Green
}
