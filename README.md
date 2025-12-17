# 🚀 n8n Main Repository

Zentrale Quelle für alle n8n Workflows, Scripts und Templates für MECHTECH.

## ⚡ QUICK START

### Workflow automatisch reparieren:

```powershell
cd C:\Users\Andree\n8n_main_repository
.\run-auto-fix.ps1 YOUR_API_KEY
```

Siehe [INSTALL.md](INSTALL.md) für detaillierte Anleitung.

## 📋 Inhalt

- **Workflows:** n8n Workflow-Definitionen und Templates
- **Scripts:** Analyse-, Fix- und Monitoring-Scripts
- **Dokumentation:** Umfassende Docs für alle Workflows
- **Templates:** Wiederverwendbare Code-Templates

## 🗂️ Struktur

```
n8n_main_repository/
├── workflows/          # Workflow-Definitionen & Templates
├── scripts/            # JavaScript-Scripts
│   ├── analysis/       # Analyse-Scripts
│   ├── fixes/          # Fix-Scripts
│   ├── monitoring/     # Monitoring-Scripts
│   ├── utils/          # Utility-Scripts
│   └── auto-fix-workflow.js  # ⭐ Haupt-Auto-Fix Script
├── docs/               # Dokumentation
├── config/             # Konfigurationsdateien
└── templates/          # Code-Templates
```

## 🚀 NPM Scripts

```bash
npm run fix        # Auto-Fix ausführen
npm run analyze    # Workflow analysieren
npm run monitor    # Workflow überwachen
npm run watch      # Live-Monitoring
```

## 📚 Dokumentation

- [INSTALL.md](INSTALL.md) - Installation & Setup
- [QUICK_FIX.md](QUICK_FIX.md) - Schnellstart für Fixes
- [docs/guides/](docs/guides/) - Detaillierte Anleitungen

## 🔧 Workflows

### Aktive Workflows:
- **MECHTECH_MERCHANT_CENTER_ADMIN** (ID: `ftZOou7HNgLOwzE5`)
- **MECHTECH_MCP_SERVER_BASIS** (ID: `uok6olNDUiRKpaE8`)

## 📝 Lizenz

MECHTECH Internal Use Only
