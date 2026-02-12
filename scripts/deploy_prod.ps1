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

function Load-EnvFile {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        return
    }
    Get-Content -Path $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            return
        }
        if ($line -notmatch "^(?<key>[A-Za-z_][A-Za-z0-9_]*)=(?<value>.*)$") {
            return
        }
        $key = $Matches.key
        $value = $Matches.value
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        } elseif ($value.StartsWith("'") -and $value.EndsWith("'")) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if (-not (Test-Path "env:$key")) {
            $env:$key = $value
        }
    }
}

function Require-Env {
    param([string]$Name)
    $value = [System.Environment]::GetEnvironmentVariable($Name)
    if (-not $value) {
        throw "Missing env var: $Name"
    }
}

if (-not (Test-Path ".env.prod")) {
    throw "Missing .env.prod. Copy .env.prod.example and set values."
}

Load-EnvFile ".env.prod"
Require-Env "POSTGRES_USER"
Require-Env "POSTGRES_DB"

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

Write-Step "Waiting for database"
$maxAttempts = 30
$delaySeconds = 2
$dbReady = $false
for ($i = 1; $i -le $maxAttempts; $i++) {
    Invoke-Compose exec -T db pg_isready -U $env:POSTGRES_USER -d $env:POSTGRES_DB | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $dbReady = $true
        break
    }
    Start-Sleep -Seconds $delaySeconds
}
if (-not $dbReady) {
    throw "Postgres is not ready after $($maxAttempts * $delaySeconds) seconds."
}

Write-Step "Running migrations"
Invoke-Compose exec -T web python manage.py migrate

Write-Step "Done"
Write-Host "Tip: create admin with:"
Write-Host "  docker compose --env-file .env.prod -f docker-compose.prod.yml exec web python manage.py createsuperuser"
