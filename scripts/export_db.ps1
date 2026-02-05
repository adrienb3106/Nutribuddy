Param(
    [string]$Output,
    [ValidateSet("custom", "plain")]
    [string]$Format = "custom"
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

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
if (-not $Output) {
    if ($Format -eq "plain") {
        $Output = "backups\nutribuddy_$timestamp.sql"
    } else {
        $Output = "backups\nutribuddy_$timestamp.dump"
    }
}

$outputDir = Split-Path -Parent $Output
if ($outputDir -and -not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

if ($Format -eq "plain" -and -not $Output.EndsWith(".sql")) {
    Write-Host "Warning: plain format usually uses .sql extension."
}
if ($Format -eq "custom" -and -not $Output.EndsWith(".dump")) {
    Write-Host "Warning: custom format usually uses .dump extension."
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

$tmpExt = if ($Format -eq "plain") { "sql" } else { "dump" }
$tmpPath = "/tmp/nutribuddy_export_$timestamp.$tmpExt"

Write-Step "Exporting database"
$dumpArgs = @(
    "pg_dump",
    "-U", $env:POSTGRES_USER,
    "-d", $env:POSTGRES_DB,
    "--no-owner",
    "--no-acl"
)
if ($Format -eq "plain") {
    $dumpArgs += "-Fp"
} else {
    $dumpArgs += "-Fc"
}
$dumpArgs += @("-f", $tmpPath)

Invoke-Compose exec -T db @dumpArgs
if ($LASTEXITCODE -ne 0) {
    throw "Export failed."
}

docker cp "${containerId}:$tmpPath" "$Output"
if ($LASTEXITCODE -ne 0) {
    throw "Failed to copy dump to host."
}

Invoke-Compose exec -T db rm -f $tmpPath | Out-Null

Write-Step "Done"
Write-Host "Dump file: $Output"
