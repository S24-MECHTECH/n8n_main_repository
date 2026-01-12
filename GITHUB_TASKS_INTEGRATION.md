# 🔗 GITHUB TASKS INTEGRATION

**Datum:** 2025-01-13  
**Status:** ✅ IMPLEMENTIERT

---

## ✅ IMPLEMENTIERT

**Task Checker prüft jetzt GitHub Tasks von Claude alle 30 Sekunden!**

---

## 🔄 WORKFLOW

1. **Git Pull** - Holt neueste Änderungen vom GitHub Repository
2. **Prüfe Dateien** - Sucht nach GitHub Tasks in verschiedenen Pfaden:
   - `.github/claude-tasks.json`
   - `claude-outputs/github-tasks.json`
   - `.github/github-tasks.json`
   - `github-tasks.json`
3. **Merge Tasks** - Fügt neue GitHub Tasks zu lokalen Tasks hinzu
4. **Ausführung** - Führt PENDING Tasks aus

---

## 📋 GITHUB TASKS FORMAT

**Option 1: Array Format**
```json
[
  {
    "id": "github-task-1",
    "status": "PENDING",
    "type": "deploy-connections",
    "command": "node scripts/auto-deploy-connections.js",
    "created": "2025-01-13T10:00:00Z"
  }
]
```

**Option 2: Object Format**
```json
{
  "tasks": [
    {
      "id": "github-task-1",
      "status": "PENDING",
      "type": "deploy-connections",
      "command": "node scripts/auto-deploy-connections.js",
      "created": "2025-01-13T10:00:00Z"
    }
  ]
}
```

---

## 🔧 KONFIGURATION

**Environment Variables:**
- `GITHUB_REPO` - Repository (Default: `S24-MECHTECH/n8n_main_repository`)
- `GITHUB_BRANCH` - Branch (Default: `main`)

**Check Interval:**
- ✅ 30 Sekunden (für schnelle GitHub Task-Abholung)

---

## 📊 METADATA

Tasks werden mit `source: 'github'` markiert:
```json
{
  "id": "github-task-1",
  "source": "github",
  "status": "PENDING",
  ...
}
```

---

## ✅ STATUS

- ✅ GitHub Tasks Check implementiert
- ✅ Git Pull Integration
- ✅ Multi-Path Datei-Suche
- ✅ Task Merging
- ✅ Alle 30 Sekunden Prüfung

---

**Status:** ✅ READY - GitHub Tasks werden automatisch geprüft und ausgeführt!
