param(
  [string]$ProjectRef = "kduvctyuknbefpdhmklq",
  [string]$PoolerHost = "aws-0-ap-northeast-1.pooler.supabase.com",
  [switch]$PrepareOnly
)

$ErrorActionPreference = "Stop"
if ($ProjectRef -notmatch '^[a-z0-9]{20}$' -or $PoolerHost -notmatch '^[a-z0-9.-]+\.pooler\.supabase\.com$') {
  throw "Invalid Supabase project or pooler host."
}
$backendPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$privateFile = Join-Path $backendPath ".env.hosted"
if (-not (Test-Path -LiteralPath $privateFile)) { throw "The private backend/.env.hosted draft is missing." }
$nodePath = (Get-Command node -ErrorAction Stop).Source
$previousDatabase = [Environment]::GetEnvironmentVariable("DATABASE_URL", "Process")
$previousProvider = [Environment]::GetEnvironmentVariable("KEEPER_DB_PROVIDER", "Process")
$passwordBuffer = [IntPtr]::Zero
$securePassword = $null

Write-Host "Supabase already has your database. This creates Keeper's private schema and tables."
Write-Host "Enter the existing DATABASE password, not your Supabase dashboard login password."
try {
  $securePassword = Read-Host "Supabase database password (hidden)" -AsSecureString
  if ($securePassword.Length -eq 0) { throw "No password entered. Nothing was changed." }
  $passwordBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordBuffer)
  $encodedPassword = [Uri]::EscapeDataString($plainPassword)
  $connectionUri = "postgresql://postgres.${ProjectRef}:" + $encodedPassword + "@${PoolerHost}:5432/postgres?schema=keeper&connection_limit=3&sslmode=require"
  $connectionLine = 'DATABASE_URL="' + $connectionUri + '"'
  $lines = [IO.File]::ReadAllLines($privateFile)
  $foundDatabaseLine = $false
  $updated = foreach ($line in $lines) {
    if ($line -match '^DATABASE_URL=') { $foundDatabaseLine = $true; $connectionLine }
    elseif ($line -match '^SUPABASE_DB_PASSWORD=') { 'SUPABASE_DB_PASSWORD=""' }
    else { $line }
  }
  if (-not $foundDatabaseLine) { $updated = @($updated) + $connectionLine }
  [IO.File]::WriteAllLines($privateFile, [string[]]$updated, [Text.UTF8Encoding]::new($false))
  Write-Host "Saved the connection in the git-ignored .env.hosted file. Password was not printed."
  if (-not $PrepareOnly) {
    [Environment]::SetEnvironmentVariable("DATABASE_URL", $connectionUri, "Process")
    [Environment]::SetEnvironmentVariable("KEEPER_DB_PROVIDER", "postgres", "Process")
    & $nodePath (Join-Path $PSScriptRoot "database.mjs") push
    if ($LASTEXITCODE -ne 0) { throw "Database setup did not finish. Check the connection error above; do not share your password or full connection URL." }
    Write-Host "Keeper's hosted schema and tables are ready."
  }
  Write-Host "Your running app still uses its existing local configuration. Hosted sign-in is activated separately."
} finally {
  if ($passwordBuffer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordBuffer) }
  if ($securePassword) { $securePassword.Dispose() }
  $plainPassword = $null
  $encodedPassword = $null
  $connectionUri = $null
  $connectionLine = $null
  $updated = $null
  [Environment]::SetEnvironmentVariable("DATABASE_URL", $previousDatabase, "Process")
  [Environment]::SetEnvironmentVariable("KEEPER_DB_PROVIDER", $previousProvider, "Process")
}
