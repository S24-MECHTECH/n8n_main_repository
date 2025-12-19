# 🤖 CURSOR AUTO-TASK-SYSTEM

**Datum:** 2025-01-13  
**Zweck:** Automatische Task-Ausführung ohne User-Interaktion

---

## 🎯 KONZEPT

**Selbstständiges Task-Management:**
- Prüft `cursor-tasks.json` alle 30 Sekunden
- Prüft GitHub Tasks von Claude
- Führt PENDING Tasks automatisch aus
- Markiert Tasks als DONE/ERROR
- Läuft kontinuierlich im Hintergrund

---

## 📋 TASK-FORMAT

**Datei:** `/claude-outputs/cursor-tasks.json`

```json
{
  "tasks": [
    {
      "id": "task-1",
      "status": "PENDING",
      "type": "deploy-connections",
      "command": "node scripts/auto-deploy-connections.js",
      "created": "2025-01-13T10:00:00Z",
      "completed": null,
      "error": null
    },
    {
      "id": "task-2",
      "status": "PENDING",
      "type": "update-gemini-handlers",
      "command": "node scripts/update-gemini-json-handlers.js",
      "created": "2025-01-13T10:01:00Z",
      "completed": null,
      "error": null
    }
  ],
  "metadata": {
    "lastCheck": "2025-01-13T10:02:00Z",
    "activeTasks": 2,
    "completedTasks": 0
  }
}
```

---

## 🔧 TASK CHECKER

**Script:** `scripts/task-checker.js`

**Funktionen:**
1. Lädt `cursor-tasks.json`
2. Findet PENDING Tasks
3. Führt Command aus (via child_process)
4. Markiert als DONE/ERROR
5. Speichert zurück
6. Wiederholt alle 30 Sekunden (GitHub Tasks von Claude)

---

## 📋 TASK TYPES

### 1. deploy-connections
- **Command:** `node scripts/auto-deploy-connections.js`
- **Beschreibung:** Deployed Connections zu n8n

### 2. update-gemini-handlers
- **Command:** `node scripts/update-gemini-json-handlers.js`
- **Beschreibung:** Aktualisiert Gemini Error Handler

### 3. deploy-nodes
- **Command:** `node scripts/auto-deploy-nodes.js`
- **Beschreibung:** Deployed Nodes zu n8n

### 4. custom
- **Command:** [User-defined]
- **Beschreibung:** Beliebiger Command

---

## 🚀 USAGE

### Start Task Checker:
```powershell
node scripts/task-checker.js
```

### Task hinzufügen:
```json
{
  "id": "task-3",
  "status": "PENDING",
  "type": "deploy-connections",
  "command": "node scripts/auto-deploy-connections.js"
}
```

---

## ✅ STATUS

- ⏳ Task Checker Script ausstehend
- ⏳ cursor-tasks.json Template ausstehend
- ⏳ Background Mode ausstehend

---

**Status:** 📋 DOKUMENTIERT, ⏳ IMPLEMENTIERUNG AUSSTEHEND
