<#
  Nivara installer — Windows (PowerShell).
    .\setup.ps1            full install + DB migrate
    .\setup.ps1 --seed     also load the test corpus
    .\setup.ps1 --reset    drop & recreate the DB

  If PowerShell blocks the script ("running scripts is disabled"), run once:
    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ...or launch it directly:
    powershell -ExecutionPolicy Bypass -File .\setup.ps1
#>
$ErrorActionPreference = "Stop"

# Always run from the directory this script lives in (the project root).
Set-Location -Path $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "✗ Node.js is not installed or not on your PATH." -ForegroundColor Red
  Write-Host "  Install Node 20+:  winget install OpenJS.NodeJS.LTS   (or https://nodejs.org)"
  exit 1
}

node scripts/setup.mjs @args
exit $LASTEXITCODE
