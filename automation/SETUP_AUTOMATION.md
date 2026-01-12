# 🔄 PERSISTENT AUTOMATION SETUP

**Zweck:** `fix-workflow-auto.js` läuft automatisch täglich (alle 6 Stunden)

---

## 📋 OPTION A: CRON JOB (EMPFOHLEN)

### **Schritt 1: Script ausführbar machen**

```bash
cd /home/claude/n8n_main_repository/automation
chmod +x fix-workflow-with-github-status.js
chmod +x setup-cron-job.sh
```

### **Schritt 2: Cron Job einrichten**

```bash
./setup-cron-job.sh
```

**ODER manuell:**

```bash
crontab -e
```

**Füge hinzu:**
```
0 */6 * * * cd /home/claude/n8n_main_repository/automation && node fix-workflow-with-github-status.js >> /var/log/workflow-fix.log 2>&1
```

### **Schritt 3: Cron Job prüfen**

```bash
crontab -l | grep fix-workflow
```

### **Schritt 4: Logs prüfen**

```bash
tail -f /var/log/workflow-fix.log
```

---

## 📋 OPTION B: N8N TRIGGER

### **Schritt 1: Workflow importieren**

1. Öffne n8n: `https://n8n.srv1091615.hstgr.cloud`
2. Importiere: `automation/n8n-daily-validation-workflow.json`
3. Passe Pfade an:
   - `Execute Fix Script`: `/home/claude/fix-workflow-auto.js`
   - `Push to GitHub`: `/home/claude/n8n_main_repository`

### **Schritt 2: Credentials setzen**

- Git Credentials (für Push)
- Execute Command Permissions

### **Schritt 3: Workflow aktivieren**

- Klicke auf "Active" Toggle
- Workflow läuft jetzt automatisch alle 6 Stunden

---

## ✅ VERIFICATION

### **Status prüfen:**

```bash
# Cron Job Status
crontab -l

# Letzte Ausführung
cat /var/log/workflow-fix.log | tail -50

# GitHub Status
cat workflow-fix-status.json
```

### **GitHub Status File:**

- `workflow-fix-status.json` wird nach jeder Ausführung aktualisiert
- Wird automatisch zu GitHub gepusht
- Enthält: timestamp, status, output, error

---

## 🔧 TROUBLESHOOTING

### **Cron Job läuft nicht:**

```bash
# Prüfe Cron Service
sudo systemctl status cron

# Prüfe Cron Logs
grep CRON /var/log/syslog | tail -20

# Teste Script manuell
cd /home/claude/n8n_main_repository/automation
node fix-workflow-with-github-status.js
```

### **Git Push schlägt fehl:**

- Prüfe Git Credentials
- Prüfe Repository Permissions
- Prüfe Network Connection

---

## 📊 SCHEDULE

**Aktuell:** Alle 6 Stunden
- 00:00
- 06:00
- 12:00
- 18:00

**Ändern:**
- Edit `setup-cron-job.sh` oder `crontab -e`
- Format: `0 */6 * * *` = alle 6 Stunden

---

**Status:** ✅ Setup Scripts erstellt - bereit zum Ausführen!


