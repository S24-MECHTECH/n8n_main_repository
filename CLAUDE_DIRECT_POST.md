# 📤 CLAUDE DIRECT POST - AKTIVIEREN!

## NACH JEDEM SCHRITT: POST ZU CLAUDE!

Nach **JEDEM** wichtigen Schritt wird automatisch ein POST Request an Claude gesendet.

---

## FORMAT:

```json
{
  "to": "claude",
  "timestamp": "2025-12-19T02:16:10.681Z",
  "action": "was du machst",
  "status": "RUNNING|DONE|ERROR",
  "details": {
    "task": "Beschreibung",
    "result": "Was passiert ist",
    "workflow_hash": "MD5",
    "changes": "Was geändert"
  }
}
```

---

## STATUS WERTE:

- **RUNNING**: Task wurde gestartet
- **DONE**: Task erfolgreich abgeschlossen
- **ERROR**: Fehler aufgetreten

---

## CLAUDE ANTWORTET SOFORT:

- ✅ **Gut oder falsch?** - Claude bestätigt ob Schritt korrekt war
- ✅ **Weitermachen oder stoppen?** - Claude entscheidet nächste Aktion
- ✅ **Nächster Schritt?** - Claude gibt Anweisungen

---

## INTEGRIERT IN:

### 1. `workflow-lockdown-backup.js`
- POST bei Start (RUNNING)
- POST bei Erfolg (DONE)
- POST bei Fehler (ERROR)

### 2. `update-workflow-direct.js`
- POST bei Start (RUNNING)
- POST bei Erfolg (DONE)
- POST bei Fehler (ERROR)

---

## MANUELLE NUTZUNG:

```bash
# Status RUNNING
node scripts/claude-direct-post.js backup RUNNING "Starting backup" "Backup initiated" "No changes yet"

# Status DONE
node scripts/claude-direct-post.js backup DONE "Backup completed" "147 files pushed" "Checksum updated"

# Status ERROR
node scripts/claude-direct-post.js backup ERROR "Backup failed" "Git push failed" "Network error"
```

---

## ENDPOINT:

Standard: `https://n8n.srv1091615.hstgr.cloud/webhook/claude-direct-post`

Kann via Umgebungsvariable geändert werden:
```bash
$env:CLAUDE_ENDPOINT="https://your-endpoint.com/webhook"
```

---

## WORKFLOW HASH:

Automatisch berechnet (MD5) aus:
- `workflows/MERCHANT_CENTER_ADMIN_ftZOou7HNgLOwzE5.json`

---

## BEISPIEL RESPONSE VON CLAUDE:

```json
{
  "status": "approved",
  "action": "continue",
  "next_step": "Run monitoring check",
  "feedback": "Backup successful, checksum matches. Proceed with monitoring."
}
```

---

## READY - JETZT!

✅ System aktiviert
✅ Automatische POSTs nach jedem Schritt
✅ Claude gibt sofort Feedback
✅ Entscheidungen werden automatisch getroffen
