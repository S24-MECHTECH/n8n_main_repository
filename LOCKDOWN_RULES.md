# 🔒 WORKFLOW LOCKDOWN - REGELN

## ABSOLUTE REGEL - KEINE AUSNAHMEN!

**GitHub = Source of Truth!**

---

## REGELN FÜR ALLE ÄNDERUNGEN:

### 1. BACKUP zu GitHub (SOFORT)
- Jede Änderung wird **sofort** zu GitHub gepusht
- Keine Änderung bleibt lokal ohne Backup
- Commit Message: `BACKUP: Workflow {ID} - {Timestamp}`

### 2. Status zu cursor-status-live.json
- Jede Änderung aktualisiert den Status
- Status enthält: Checksum, Timestamp, Änderungsstatus

### 3. Checksum berechnen
- SHA256 Checksum für jeden Workflow
- Gespeichert in `.workflow-checksum.json`
- Vergleich vor/nach jeder Änderung

---

## MONITORING SYSTEM:

### Claude prüft ALLE 10 MINUTEN:
- ✅ Ist Workflow geändert?
- ✅ Wenn JA: Alert + Screenshot
- ✅ Wenn NEIN: OK

### Monitoring Script:
```bash
# Einmalige Prüfung
node scripts/workflow-lockdown-monitor.js

# Kontinuierliches Monitoring (alle 10 Min)
node scripts/workflow-lockdown-monitor.js --continuous
```

---

## BACKUP SYSTEM:

### Backup Script:
```bash
# Manuelles Backup
node scripts/workflow-lockdown-backup.js
```

**Was macht es:**
1. Berechnet Checksum
2. Vergleicht mit letzter Checksum
3. Pusht zu GitHub (wenn Änderungen)
4. Aktualisiert Status
5. Speichert neue Checksum

---

## KEINE ÄNDERUNGEN MEHR "WEG MACHEN"!

- ✅ Jede Änderung wird dokumentiert
- ✅ Jede Änderung wird gebackupt
- ✅ Jede Änderung hat eine Checksum
- ✅ GitHub ist die einzige Quelle der Wahrheit

---

## DATEIEN:

- `workflows/MERCHANT_CENTER_ADMIN_ftZOou7HNgLOwzE5.json` - Workflow Definition
- `.workflow-checksum.json` - Gespeicherte Checksum
- `cursor-status-live.json` - Live Status
- `LOCKDOWN_RULES.md` - Diese Regeln

---

## VERSTOß = ALERT!

Wenn eine Änderung ohne Backup/Checksum gemacht wird:
- 🚨 Alert wird ausgelöst
- 📸 Screenshot wird erstellt
- ⚠️ Status wird auf ALERT gesetzt
- 📝 GitHub wird geprüft

---

## VERSTANDEN?

**GitHub = Source of Truth!**
**Keine Änderung ohne Backup!**
**Keine Änderung ohne Checksum!**
