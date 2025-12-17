# 📦 INSTALLATION & SETUP

## ⚡ Schnellstart

### Option 1: PowerShell Script (Empfohlen für Windows)

```powershell
cd C:\Users\Andree\n8n_main_repository
.\run-auto-fix.ps1 YOUR_API_KEY
```

### Option 2: Direkt mit Node

```powershell
cd C:\Users\Andree\n8n_main_repository
node scripts/auto-fix-workflow.js YOUR_API_KEY
```

### Option 3: Mit Umgebungsvariable

```powershell
cd C:\Users\Andree\n8n_main_repository
$env:N8N_API_KEY = "YOUR_API_KEY"
node scripts/auto-fix-workflow.js
```

## 🔑 API Key erhalten

1. Öffnen Sie n8n: https://n8n.srv1091615.hstgr.cloud
2. Gehen Sie zu: **Settings → API**
3. Erstellen Sie einen neuen API Key (oder nutzen Sie einen existierenden)
4. Kopieren Sie den API Key

## ✅ Was wird repariert?

Das Auto-Fix Script behebt automatisch:

- ✅ **Credentials:** `googleApi` → `googleOAuth2Api` für alle HTTP Request Nodes
- ✅ **Prepare Chain:** Alle Prepare-Nodes werden sequenziell verbunden
- ✅ **Route → Update → Rate Limiting:** Komplette Struktur wird korrigiert
- ✅ **Update Product Adult Flag:** URL Expression & Body werden korrigiert
- ✅ **Prepare GTN/EAN:** Connection zu Rate Limiting wird hergestellt

## 📋 Nach dem Fix

1. ✅ Workflow in n8n öffnen
2. ✅ Verbindungen prüfen
3. ✅ Workflow testen
4. ✅ Bei Problemen: `npm run analyze` ausführen

## 🔧 Workflow ID

- **MECHTECH_MERCHANT_CENTER_ADMIN:** `ftZOou7HNgLOwzE5`
