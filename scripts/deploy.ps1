Param(
    [string]$CiqualPath = "data/Table Ciqual 2025_FR_2025_11_03.xls",
    [string]$OffPath = "data/openfoodfacts-products.fr.food.min.jsonl.gz",
    [int]$OffCommitEvery = 10000,
    [int]$OffLogEvery = 10000,
    [int]$OffTagLogEvery = 10000,
    [switch]$SkipCiqual,
    [switch]$SkipOff,
    [switch]$SkipTags,
    [switch]$OnlyIfDefault
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

if (Test-Path ".env") {
    Load-EnvFile ".env"
} elseif (Test-Path ".env.example") {
    Load-EnvFile ".env.example"
}

Write-Step "Building and starting containers"
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    throw "docker compose up failed."
}

Write-Step "Waiting for database"
$maxAttempts = 30
$delaySeconds = 2
$dbReady = $false
for ($i = 1; $i -le $maxAttempts; $i++) {
    try {
        docker compose exec -T db pg_isready -U $env:POSTGRES_USER -d $env:POSTGRES_DB | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $dbReady = $true
            break
        }
    } catch {
        $dbReady = $false
    }
    Start-Sleep -Seconds $delaySeconds
}
if (-not $dbReady) {
    throw "Postgres is not ready after $($maxAttempts * $delaySeconds) seconds."
}

Write-Step "Running migrations"
docker compose exec -T web python manage.py migrate --noinput
if ($LASTEXITCODE -ne 0) {
    throw "Migrations failed."
}

if (-not $SkipCiqual) {
    if (-not (Test-Path $CiqualPath)) {
        throw "CIQUAL file not found: $CiqualPath"
    }
    Write-Step "Importing CIQUAL"
    docker compose exec -T web python manage.py import_ciqual --path "$CiqualPath"
    if ($LASTEXITCODE -ne 0) {
        throw "CIQUAL import failed."
    }
}

if (-not $SkipOff) {
    if (-not (Test-Path $OffPath)) {
        throw "Open Food Facts file not found: $OffPath"
    }
    Write-Step "Importing Open Food Facts (minimal)"
    $offArgs = @("python", "manage.py", "import_openfoodfacts_minimal", "--path", $OffPath)
    if ($OffCommitEvery -gt 0) {
        $offArgs += @("--commit-every", $OffCommitEvery)
    }
    if ($OffLogEvery -gt 0) {
        $offArgs += @("--log-every", $OffLogEvery)
    }
    docker compose exec -T web @offArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Open Food Facts import failed."
    }
}

if (-not $SkipTags) {
    Write-Step "Tagging compatibilities (CIQUAL)"
    $ciqualTagArgs = @("python", "manage.py", "tag_compatibilities")
    if ($OnlyIfDefault) {
        $ciqualTagArgs += "--only-if-default"
    }
    docker compose exec -T web @ciqualTagArgs
    if ($LASTEXITCODE -ne 0) {
        throw "CIQUAL tagging failed."
    }

    Write-Step "Tagging compatibilities (Open Food Facts)"
    $offTagArgs = @("python", "manage.py", "tag_openfoodfacts_compatibilities")
    if ($OnlyIfDefault) {
        $offTagArgs += "--only-if-default"
    }
    if ($OffTagLogEvery -gt 0) {
        $offTagArgs += @("--log-every", $OffTagLogEvery)
    }
    docker compose exec -T web @offTagArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Open Food Facts tagging failed."
    }
}

Write-Step "Done"
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:3000"
