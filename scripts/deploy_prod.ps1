Param(
    [string]$DbDump,
    [switch]$Clean,
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path "$PSScriptRoot\.."
Set-Location $RepoRoot

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

if (-not (Test-Path ".env.prod")) {
    throw "Missing .env.prod. Copy .env.prod.example and set values."
}

function Invoke-Compose {
    param([Parameter(ValueFromRemainingArguments = $true)] $Args)
    docker compose --env-file .env.prod -f docker-compose.prod.yml @Args
}

$env:COMPOSE_FILE = "docker-compose.prod.yml"

Write-Step "Starting containers"
if ($NoBuild) {
    Invoke-Compose up -d
} else {
    Invoke-Compose up -d --build
}

if ($DbDump) {
    Write-Step "Restoring database dump"
    if ($Clean) {
        & "$PSScriptRoot\restore_db.ps1" -Input $DbDump -Clean
    } else {
        & "$PSScriptRoot\restore_db.ps1" -Input $DbDump
    }
}

Write-Step "Running migrations"
Invoke-Compose exec -T web python manage.py migrate

Write-Step "Done"
Write-Host "Tip: create admin with:"
Write-Host "  docker compose --env-file .env.prod -f docker-compose.prod.yml exec web python manage.py createsuperuser"
