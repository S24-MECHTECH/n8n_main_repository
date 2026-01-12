# ✅ TASK CHECKER UPDATE - GITHUB TASKS

**Datum:** 2025-01-13  
**Update:** GitHub Tasks Integration

---

## ✅ IMPLEMENTIERT

**Task Checker prüft jetzt GitHub Tasks von Claude alle 30 Sekunden!**

---

## 🔄 NEUE FUNKTIONEN

### 1. `checkGitHubTasks()`
- Führt `git pull` aus (holt neueste Änderungen)
- Prüft verschiedene Dateipfade nach GitHub Tasks:
  - `.github/claude-tasks.json`
  - `claude-outputs/github-tasks.json`
  - `.github/github-tasks.json`
  - `github-tasks.json`
- Gibt Array von GitHub Tasks zurück

### 2. `mergeTasks(localTasks, githubTasks)`
- Merged lokale Tasks mit GitHub Tasks
- Fügt nur neue Tasks hinzu (die nicht lokal existieren)
- Markiert GitHub Tasks mit `source: 'github'`

### 3. Erweiterte `checkAndExecuteTasks()`
- Prüft zuerst GitHub Tasks
- Merged sie mit lokalen Tasks
- Führt dann PENDING Tasks aus

---

## ⚙️ KONFIGURATION

**Check Interval:** 30 Sekunden (für schnelle GitHub Task-Abholung)

**Environment Variables:**
- `GITHUB_REPO` - Repository (Default: `S24-MECHTECH/n8n_main_repository`)
- `GITHUB_BRANCH` - Branch (Default: `main`)

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

## ✅ STATUS

- ✅ GitHub Tasks Check implementiert
- ✅ Git Pull Integration
- ✅ Multi-Path Datei-Suche
- ✅ Task Merging
- ✅ Alle 30 Sekunden Prüfung
- ✅ Module Exports aktualisiert

---

**Status:** ✅ READY - GitHub Tasks werden automatisch geprüft und ausgeführt!
