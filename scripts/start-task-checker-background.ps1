# Start Task Checker im Hintergrund
# Läuft kontinuierlich, prüft alle 60 Sekunden

$scriptPath = Join-Path $PSScriptRoot "task-checker.js"
$logFile = Join-Path $PSScriptRoot ".." "task-checker.log"

Write-Host "Task Checker wird im Hintergrund gestartet..."
Write-Host "Log File: $logFile"
Write-Host ""

# Starte Node.js Prozess im Hintergrund
Start-Process -WindowStyle Hidden -FilePath "node" -ArgumentList $scriptPath -RedirectStandardOutput $logFile -RedirectStandardError $logFile

Write-Host "Task Checker gestartet!"
Write-Host "Pruefe Log: Get-Content $logFile -Tail 20"
Write-Host ""
Write-Host "Zum Beenden: Get-Process node | Where-Object {`$_.CommandLine -like '*task-checker.js*'} | Stop-Process"
