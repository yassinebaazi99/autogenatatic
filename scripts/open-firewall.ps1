# Open a Windows Firewall inbound rule for the Nivara dev server so
# other machines on the same LAN can reach it. Takes an optional port
# argument; defaults to 3001.
#
#   powershell -ExecutionPolicy Bypass -File scripts/open-firewall.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/open-firewall.ps1 3000
#
# Must be run from an ADMINISTRATOR PowerShell. Regular shells will get
# an "access denied" error when creating the rule.

param(
    [int]$Port = 3001
)

$RuleName = "Nivara dev server (port $Port)"

# Check admin elevation. Only the Administrators group can create
# firewall rules — fail fast with a clear message otherwise.
$isAdmin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host ""
    Write-Host "  ERROR: This script must be run from an Administrator PowerShell." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Close this window, press Win+X → 'Terminal (Admin)'," -ForegroundColor Yellow
    Write-Host "  then cd to the project and re-run:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    powershell -ExecutionPolicy Bypass -File scripts/open-firewall.ps1 $Port" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Remove any existing rule with the same name so re-running is idempotent.
Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue |
    Remove-NetFirewallRule -ErrorAction SilentlyContinue

# Create a fresh inbound rule allowing TCP on the specified port from
# any remote address in the Private profile (home / work network).
# Public profile stays blocked — that's the safer default.
New-NetFirewallRule `
    -DisplayName $RuleName `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $Port `
    -Profile Private `
    -Description "Allows LAN access to the Nivara (Next.js) dev server on port $Port" `
    | Out-Null

Write-Host ""
Write-Host "  Firewall rule created:" -ForegroundColor Green
Write-Host "    Name:    $RuleName"
Write-Host "    Port:    $Port (TCP)"
Write-Host "    Profile: Private (home/work networks only)"
Write-Host ""
Write-Host "  Other machines on the same LAN can now reach the dev server." -ForegroundColor Green
Write-Host "  To see the URLs, run:"
Write-Host ""
Write-Host "    node scripts/lan-urls.mjs $Port" -ForegroundColor Cyan
Write-Host ""
Write-Host "  To remove the rule later:"
Write-Host ""
Write-Host "    Remove-NetFirewallRule -DisplayName '$RuleName'" -ForegroundColor Cyan
Write-Host ""
