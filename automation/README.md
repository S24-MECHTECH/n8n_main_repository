# 🔄 WORKFLOW AUTO-FIX AUTOMATION

Automatische Workflow-Validierung und -Reparatur.

## 📋 WAS WIRD GEMACHT

1. **Führt `fix-workflow-auto.js` aus** (alle 6 Stunden)
2. **Prüft Workflow Status**
3. **Repariert bei Fehlern**
4. **Pusht Status zu GitHub**

## 🚀 QUICK START

### Option A: Cron Job (Empfohlen)

```bash
cd automation
chmod +x setup-cron-job.sh
./setup-cron-job.sh
```

### Option B: n8n Workflow

1. Importiere `n8n-daily-validation-workflow.json` in n8n
2. Aktiviere Workflow
3. Fertig!

## 📁 DATEIEN

- `fix-workflow-with-github-status.js` - Wrapper Script
- `setup-cron-job.sh` - Cron Job Setup
- `n8n-daily-validation-workflow.json` - n8n Workflow
- `SETUP_AUTOMATION.md` - Detaillierte Anleitung

## 📊 STATUS

Status wird gespeichert in: `workflow-fix-status.json`

Wird automatisch zu GitHub gepusht nach jeder Ausführung.


