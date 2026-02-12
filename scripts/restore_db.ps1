Param(
    [string]$Input,
    [switch]$Clean
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
            Set-Item -Path "env:$key" -Value $value
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

$ComposeEnvFile = $null
if (Test-Path ".env.prod") {
    Load-EnvFile ".env.prod"
    $ComposeEnvFile = ".env.prod"
} elseif (Test-Path ".env") {
    Load-EnvFile ".env"
    $ComposeEnvFile = ".env"
} elseif (Test-Path ".env.example") {
    Load-EnvFile ".env.example"
    $ComposeEnvFile = ".env.example"
}

function Invoke-Compose {
    param([Parameter(ValueFromRemainingArguments = $true)] $Args)
    if ($ComposeEnvFile) {
        docker compose --env-file $ComposeEnvFile @Args
    } else {
        docker compose @Args
    }
}

Require-Env "POSTGRES_USER"
Require-Env "POSTGRES_DB"

if (-not $Input) {
    throw "Missing required parameter: -Input"
}
if (-not (Test-Path $Input)) {
    throw "Input file not found: $Input"
}

Write-Step "Checking database readiness"
Invoke-Compose exec -T db pg_isready -U $env:POSTGRES_USER -d $env:POSTGRES_DB | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Postgres is not ready."
}

$containerId = (Invoke-Compose ps -q db).Trim()
if (-not $containerId) {
    throw "Could not find db container id."
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ext = [IO.Path]::GetExtension($Input).TrimStart(".").ToLowerInvariant()
if (-not $ext) {
    $ext = "dump"
}
$tmpPath = "/tmp/nutribuddy_restore_$timestamp.$ext"

Write-Step "Copying dump into container"
docker cp "$Input" "${containerId}:$tmpPath"
if ($LASTEXITCODE -ne 0) {
    throw "Failed to copy dump into container."
}

if ($ext -eq "sql") {
    if ($Clean) {
        Write-Host "Warning: -Clean is ignored for .sql dumps (use a clean database)."
    }
    Write-Step "Restoring plain SQL dump"
    Invoke-Compose exec -T db psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -v ON_ERROR_STOP=1 -f $tmpPath
    if ($LASTEXITCODE -ne 0) {
        throw "Restore failed."
    }
} else {
    Write-Step "Restoring custom dump"
    $restoreArgs = @(
        "pg_restore",
        "-U", $env:POSTGRES_USER,
        "-d", $env:POSTGRES_DB,
        "--no-owner",
        "--no-acl"
    )
    if ($Clean) {
        $restoreArgs += @("--clean", "--if-exists")
    }
    $restoreArgs += $tmpPath
    Invoke-Compose exec -T db @restoreArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Restore failed."
    }
}

Invoke-Compose exec -T db rm -f $tmpPath | Out-Null

Write-Step "Done"
