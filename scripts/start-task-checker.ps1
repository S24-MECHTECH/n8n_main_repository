# Start Task Checker im Hintergrund
# Usage: .\start-task-checker.ps1

$scriptPath = Join-Path $PSScriptRoot "task-checker.js"
$nodePath = "node"

Write-Host "Task Checker wird gestartet..."
Write-Host "Druecke Ctrl+C zum Beenden"
Write-Host ""

Start-Process -NoNewWindow -FilePath $nodePath -ArgumentList $scriptPath
