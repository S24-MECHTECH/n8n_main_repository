# AUTO-FIX WORKFLOW RUNNER
# PowerShell Script das alles automatisch ausführt

Write-Host "`n" -NoNewline
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "🔧 AUTO-FIX WORKFLOW - AUTOMATISCHER RUNNER" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "`n"

# Prüfe ob API Key als Parameter übergeben wurde
$apiKey = $args[0]

if (-not $apiKey) {
    # Versuche aus Umgebungsvariable zu lesen
    $apiKey = $env:N8N_API_KEY
}

if (-not $apiKey) {
    Write-Host "⚠️  N8N_API_KEY nicht gefunden!" -ForegroundColor Yellow
    Write-Host "`n"
    Write-Host "Bitte API Key angeben:" -ForegroundColor Yellow
    Write-Host "   .\run-auto-fix.ps1 YOUR_API_KEY" -ForegroundColor Cyan
    Write-Host "`n"
    Write-Host "Oder als Umgebungsvariable setzen:" -ForegroundColor Yellow
    Write-Host "   `$env:N8N_API_KEY = 'YOUR_API_KEY'" -ForegroundColor Cyan
    Write-Host "   .\run-auto-fix.ps1" -ForegroundColor Cyan
    Write-Host "`n"
    exit 1
}

Write-Host "✅ API Key gefunden: $($apiKey.Substring(0,20))..." -ForegroundColor Green
Write-Host "`n"

# Setze Umgebungsvariable
$env:N8N_API_KEY = $apiKey

# Führe Auto-Fix aus
Write-Host "🚀 Führe Auto-Fix aus...`n" -ForegroundColor Cyan
node scripts/auto-fix-workflow.js $apiKey

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n"
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host "✅ AUTO-FIX ERFOLGREICH ABGESCHLOSSEN!" -ForegroundColor Green
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host "`n"
    Write-Host "💡 Nächste Schritte:" -ForegroundColor Yellow
    Write-Host "   1. Öffnen Sie n8n und prüfen Sie den Workflow" -ForegroundColor White
    Write-Host "   2. Testen Sie den Workflow" -ForegroundColor White
    Write-Host "   3. Bei Bedarf: npm run analyze für detaillierte Analyse" -ForegroundColor White
    Write-Host "`n"
} else {
    Write-Host "`n"
    Write-Host "❌ Auto-Fix fehlgeschlagen!" -ForegroundColor Red
    Write-Host "   Prüfen Sie die Fehlermeldung oben" -ForegroundColor Yellow
    Write-Host "`n"
    exit 1
}
