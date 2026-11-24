# Smoke test for the Vsluh NSIS installer on a clean Windows machine.
# Covers what automation can verify; microphone, hotkeys, paste and tray still
# need a manual pass on a real desktop session (see the QA checklist in the
# release runbook).
#
# Usage (elevated PowerShell on the test machine):
#   .\scripts\windows-smoke-test.ps1 -InstallerPath ".\Vsluh Setup 1.11.0.exe"
#
# Exit code 0 = all checks passed.

param(
  [Parameter(Mandatory = $true)]
  [string]$InstallerPath
)

$ErrorActionPreference = "Stop"
$productName = "Vsluh"

function Find-InstallDir {
  $candidates = @(
    "$env:LOCALAPPDATA\Programs\$productName",
    "$env:ProgramFiles\$productName",
    "${env:ProgramFiles(x86)}\$productName"
  )
  foreach ($dir in $candidates) {
    if (Test-Path (Join-Path $dir "$productName.exe")) { return $dir }
  }
  return $null
}

function Find-UninstallKey {
  $roots = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
  )
  Get-ItemProperty $roots -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like "$productName*" } |
    Select-Object -First 1
}

$failures = @()
function Check($name, $ok) {
  if ($ok) { Write-Host "PASS: $name" -ForegroundColor Green }
  else { Write-Host "FAIL: $name" -ForegroundColor Red; $script:failures += $name }
}

# 1. Silent install
Write-Host "Installing silently: $InstallerPath"
$install = Start-Process -FilePath $InstallerPath -ArgumentList "/S" -Wait -PassThru
Check "installer exit code is 0 ($($install.ExitCode))" ($install.ExitCode -eq 0)

Start-Sleep -Seconds 3

# 2. Files landed
$installDir = Find-InstallDir
Check "install directory with $productName.exe exists" ($null -ne $installDir)
if ($installDir) {
  Check "main process binary is present" (Test-Path (Join-Path $installDir "$productName.exe"))
}

# 3. Uninstall registry entry
$uninstallKey = Find-UninstallKey
Check "uninstall registry entry exists" ($null -ne $uninstallKey)

# 4. Uninstall silently
if ($uninstallKey -and $uninstallKey.UninstallString) {
  $uninstallExe = $uninstallKey.UninstallString.Trim('"').Split('"')[0]
  Write-Host "Uninstalling silently: $uninstallExe"
  $uninstall = Start-Process -FilePath $uninstallExe -ArgumentList "/S" -Wait -PassThru
  Check "uninstaller exit code is 0 ($($uninstall.ExitCode))" ($uninstall.ExitCode -eq 0)
  Start-Sleep -Seconds 3
  Check "install directory removed" ($null -eq (Find-InstallDir))
  Check "uninstall registry entry removed" ($null -eq (Find-UninstallKey))
} else {
  Check "uninstall registry entry exists (needed to uninstall)" $false
}

Write-Host ""
if ($failures.Count -gt 0) {
  Write-Host "SMOKE TEST FAILED: $($failures -join '; ')" -ForegroundColor Red
  exit 1
}
Write-Host "SMOKE TEST PASSED" -ForegroundColor Green
