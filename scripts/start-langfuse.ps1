# start-langfuse.ps1
# Starts the Langfuse Observability Stack independently (Windows).

Write-Host "🚀 Starting Langfuse Observability Stack..." -ForegroundColor Cyan
docker compose -f docker-compose.langfuse.yml up -d

Write-Host ""
Write-Host "✨ Langfuse is running!" -ForegroundColor Green
Write-Host "--------------------------------------------------"
Write-Host "📊 Langfuse UI:     http://localhost:3003"
Write-Host "--------------------------------------------------"
