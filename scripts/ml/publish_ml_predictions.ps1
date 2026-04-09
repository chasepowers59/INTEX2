[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ApiBaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$AdminEmail,

    [Parameter(Mandatory = $true)]
    [string]$AdminPassword,

    [Parameter(Mandatory = $true)]
    [string]$SqlServer,

    [Parameter(Mandatory = $true)]
    [string]$SqlDatabase,

    [Parameter(Mandatory = $true)]
    [string]$SqlUser,

    [Parameter(Mandatory = $true)]
    [string]$SqlPassword,

    [string]$PythonExe = "python",

    [string]$OdbcDriver = "ODBC Driver 17 for SQL Server",

    [int]$NotebookTimeoutSec = 3600,

    [string]$BackupTableName = ("MlPredictions_Backup_" + (Get-Date -Format "yyyyMMdd_HHmmss")),

    [string[]]$PredictionTypes = @(
        "donor_lapse_90d",
        "donor_upgrade_next_amount",
        "next_channel_source",
        "post_donation_value",
        "safehouse_incident_next_month",
        "resident_incident_30d",
        "resident_reintegration_readiness"
    ),

    [switch]$SkipNotebookExecution
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

<#
Example:

pwsh -File .\scripts\ml\publish_ml_predictions.ps1 `
  -ApiBaseUrl "https://<your-api>.azurewebsites.net" `
  -AdminEmail "<admin-email>" `
  -AdminPassword "<admin-password>" `
  -SqlServer "<server>.database.windows.net" `
  -SqlDatabase "<database>" `
  -SqlUser "<sql-user>" `
  -SqlPassword "<sql-password>"

Use -SkipNotebookExecution if you already regenerated the files under
output\ml-predictions\ and only want backup + import + verification.
#>

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-CommandExists {
    param([string]$CommandName)

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "Required command '$CommandName' was not found on PATH."
    }
}

function Invoke-CheckedCommand {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$FailureMessage
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

function Invoke-SqlText {
    param([string]$Query)

    $args = @(
        "-S", "tcp:$SqlServer,1433",
        "-d", $SqlDatabase,
        "-U", $SqlUser,
        "-P", $SqlPassword,
        "-b",
        "-N",
        "-C",
        "-Q", $Query
    )

    Invoke-CheckedCommand -FilePath "sqlcmd" -Arguments $args -FailureMessage "sqlcmd failed."
}

function Get-RepoRoot {
    $scriptDir = Split-Path -Parent $PSCommandPath
    return (Resolve-Path (Join-Path $scriptDir "..\..")).Path
}

function Get-NotebookPaths {
    param([string]$RepoRoot)

    return @(
        (Join-Path $RepoRoot "ml-pipelines\donor-lapse-risk.ipynb"),
        (Join-Path $RepoRoot "ml-pipelines\donor-upgrade-propensity.ipynb"),
        (Join-Path $RepoRoot "ml-pipelines\next-best-campaign.ipynb"),
        (Join-Path $RepoRoot "ml-pipelines\social-post-donation-referrals.ipynb"),
        (Join-Path $RepoRoot "ml-pipelines\safehouse-capacity-forecast.ipynb"),
        (Join-Path $RepoRoot "ml-pipelines\resident-risk-and-readiness.ipynb")
    )
}

function Test-ArrayJsonFile {
    param([string]$Path)

    $raw = Get-Content $Path -Raw
    return $raw.TrimStart().StartsWith("[")
}

function Get-ValidatedExports {
    param(
        [string]$OutputDir,
        [string[]]$ExpectedPredictionTypes
    )

    $files = Get-ChildItem -Path $OutputDir -Filter *.json -File | Sort-Object Name
    if ($files.Count -eq 0) {
        throw "No JSON files found in $OutputDir."
    }

    $manifest = New-Object System.Collections.Generic.List[object]

    foreach ($file in $files) {
        $raw = Get-Content $file.FullName -Raw
        if (-not $raw.TrimStart().StartsWith("[")) {
            throw "Refusing to import $($file.Name): file is not a JSON array."
        }

        $items = $raw | ConvertFrom-Json
        $rowCount = ($items | Measure-Object).Count
        if ($rowCount -le 1) {
            throw "Refusing to import $($file.Name): file contains $rowCount row(s). This looks like a smoke file, not a real batch."
        }

        $predictionTypesInFile = @($items | ForEach-Object { [string]$_.predictionType } | Sort-Object -Unique)
        if ($predictionTypesInFile.Count -ne 1) {
            throw "Refusing to import $($file.Name): file contains multiple prediction types: $($predictionTypesInFile -join ', ')."
        }

        $entityTypesInFile = @($items | ForEach-Object { [string]$_.entityType } | Sort-Object -Unique)
        if ($entityTypesInFile.Count -ne 1) {
            throw "Refusing to import $($file.Name): file contains multiple entity types: $($entityTypesInFile -join ', ')."
        }

        $predictionType = $predictionTypesInFile[0]
        if ($predictionType -notin $ExpectedPredictionTypes) {
            continue
        }

        $manifest.Add([PSCustomObject]@{
            File = $file.FullName
            FileName = $file.Name
            PredictionType = $predictionType
            EntityType = $entityTypesInFile[0]
            Rows = $rowCount
        })
    }

    $missing = @($ExpectedPredictionTypes | Where-Object { $_ -notin $manifest.PredictionType })
    if ($missing.Count -gt 0) {
        throw "Missing expected prediction export(s): $($missing -join ', ')."
    }

    return @($manifest | Sort-Object PredictionType)
}

function Get-ApiToken {
    param([string]$LoginUrl)

    $body = @{
        email = $AdminEmail
        password = $AdminPassword
    } | ConvertTo-Json

    $login = Invoke-RestMethod -Method Post -Uri $LoginUrl -ContentType "application/json" -Body $body
    if (-not $login.accessToken) {
        throw "Login succeeded but accessToken was missing from the response."
    }

    return [string]$login.accessToken
}

function Import-PredictionBatch {
    param(
        [string]$ImportUrl,
        [string]$BearerToken,
        [pscustomobject]$Batch
    )

    $headers = @{ Authorization = "Bearer $BearerToken" }
    $body = Get-Content $Batch.File -Raw

    Write-Host ("Importing {0} from {1} with {2} rows..." -f $Batch.PredictionType, $Batch.FileName, $Batch.Rows) -ForegroundColor Yellow
    $response = Invoke-RestMethod -Method Post -Uri $ImportUrl -Headers $headers -ContentType "application/json" -Body $body
    return $response
}

if ($BackupTableName -notmatch "^[A-Za-z_][A-Za-z0-9_]*$") {
    throw "BackupTableName must be a valid SQL identifier using letters, numbers, and underscores only."
}

$ApiBaseUrl = $ApiBaseUrl.TrimEnd("/")
$repoRoot = Get-RepoRoot
$outputDir = Join-Path $repoRoot "output\ml-predictions"
$executedNotebookDir = Join-Path $repoRoot "tmp\executed-notebooks"
$loginUrl = "$ApiBaseUrl/api/auth/login"
$importUrl = "$ApiBaseUrl/api/ml/import?replace=true"
$coverageUrl = "$ApiBaseUrl/api/ml/coverage"
$odbcConnectionString = "Driver={$OdbcDriver};Server=tcp:$SqlServer,1433;Database=$SqlDatabase;Uid=$SqlUser;Pwd=$SqlPassword;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=120;"

Assert-CommandExists -CommandName "sqlcmd"
Assert-CommandExists -CommandName $PythonExe

Write-Step "Repo root"
Write-Host $repoRoot

Write-Step "Current ML row counts"
Invoke-SqlText @"
SELECT PredictionType, COUNT(*) AS PredictionRows
FROM dbo.MlPredictions
GROUP BY PredictionType
ORDER BY PredictionType;
"@

Write-Step "Backing up dbo.MlPredictions to dbo.$BackupTableName"
Invoke-SqlText @"
IF OBJECT_ID(N'dbo.$BackupTableName', N'U') IS NOT NULL
    THROW 50000, 'Backup table dbo.$BackupTableName already exists.', 1;

SELECT *
INTO dbo.$BackupTableName
FROM dbo.MlPredictions;

SELECT COUNT(*) AS BackupCount
FROM dbo.$BackupTableName;
"@

if (-not $SkipNotebookExecution) {
    Write-Step "Executing notebooks against the configured database"
    New-Item -ItemType Directory -Force -Path $executedNotebookDir | Out-Null
    $env:INTEX_ODBC = $odbcConnectionString

    Write-Host "Regenerating notebooks from scripts\\ml\\generate_is455_notebooks.py" -ForegroundColor Yellow
    Invoke-CheckedCommand -FilePath $PythonExe -Arguments @(
        (Join-Path $repoRoot "scripts\ml\generate_is455_notebooks.py")
    ) -FailureMessage "Notebook generation failed."

    foreach ($notebook in (Get-NotebookPaths -RepoRoot $repoRoot)) {
        if (-not (Test-Path $notebook)) {
            throw "Notebook not found: $notebook"
        }

        Write-Host "Executing $notebook" -ForegroundColor Yellow
        Invoke-CheckedCommand -FilePath $PythonExe -Arguments @(
            "-m", "jupyter", "nbconvert",
            "--to", "notebook",
            "--execute", $notebook,
            "--output-dir", $executedNotebookDir,
            "--ExecutePreprocessor.timeout=$NotebookTimeoutSec"
        ) -FailureMessage "Notebook execution failed: $notebook"
    }
}
else {
    Write-Step "Skipping notebook execution"
    Write-Host "Using existing files under $outputDir" -ForegroundColor Yellow
}

Write-Step "Validating exported prediction files"
$exports = Get-ValidatedExports -OutputDir $outputDir -ExpectedPredictionTypes $PredictionTypes
$exports | Format-Table PredictionType, EntityType, Rows, FileName -AutoSize

Write-Step "Logging into the API"
$token = Get-ApiToken -LoginUrl $loginUrl

Write-Step "Importing batches with replace=true"
foreach ($batch in $exports) {
    $result = Import-PredictionBatch -ImportUrl $importUrl -BearerToken $token -Batch $batch
    Write-Host ("Inserted {0} row(s) for {1}" -f $result.inserted, $result.predictionType) -ForegroundColor Green
}

Write-Step "Verifying API coverage"
$coverage = Invoke-RestMethod -Method Get -Uri $coverageUrl -Headers @{ Authorization = "Bearer $token" }
$coverage.expected |
    Select-Object predictionType, entityType, rowCount, latestCreatedAtUtc |
    Format-Table -AutoSize

Write-Step "Finished"
Write-Host "ML predictions were backed up, refreshed, imported, and verified." -ForegroundColor Green
