# run-mcp-stdio.ps1 - Local developer stdio bootstrap for Claude Desktop
# Part of specs/007-a2a-mcp-integration

$ScriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")

$AuthoringDir = Join-Path $RepoRoot "apps\content-authoring-service"

# Navigate to content-authoring-service
Set-Location $AuthoringDir

# Check if virtualenv exists
if (-not (Test-Path "venv")) {
    Write-Error "Virtual environment 'venv' not found in apps\content-authoring-service."
    Write-Host "Please run .\scripts\start-dev.ps1 or set up the virtualenv first." -ForegroundColor Red
    Exit 1
}

# Ensure API Key is configured in environment
if (-not $env:HERMES_API_KEY) {
    Write-Warning "HERMES_API_KEY is not set in environment."
    Write-Host "The MCP server requires a valid API key for authentication." -ForegroundColor Yellow
}

# Execute FastMCP server stdio transport
& ".\venv\Scripts\python.exe" -c "from src.application.mcp.server import mcp; mcp.run()"
