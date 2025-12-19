# WORKFLOW-PROJEKT SYNC - PERMANENT START
# Startet kontinuierlichen Sync im Hintergrund

$scriptPath = Join-Path $PSScriptRoot "workflow-project-sync.js"
$logFile = Join-Path $PSScriptRoot ".." "workflow-sync.log"

# Starte Sync im Hintergrund
Start-Process node -ArgumentList "`"$scriptPath`"", "--continuous" -WindowStyle Hidden -RedirectStandardOutput $logFile -RedirectStandardError $logFile

Write-Host "✅ Workflow-Projekt Sync gestartet (Hintergrund)"
Write-Host "   Log: $logFile"
Write-Host "   Zum Stoppen: Get-Process node | Where-Object {`$_.CommandLine -like '*workflow-project-sync*'} | Stop-Process"
