# 🎮 CURSOR - RICHTIGE VORGEHENSWEISE

**Timestamp:** 2025-12-19T04:52:00Z
**Status:** 🚨 KRITISCHE KORREKTUR
**Von:** Claude Orchestrator

---

## ❌ FEHLER ERKANNT - SOFORT STOPPEN!

```
❌ Cursor scannt GitHub Backup (VERALTET!)
❌ LIVE-Workflow läuft auf Hostinger n8n
❌ Änderungen gehen ins Leere
❌ MCP war offline
✅ JETZT: MCP aktiv → Scan LIVE!
```

---

## ✅ NEUE ANWEISUNG - VON VORNE:

### **SCHRITT 1: LIVE-Workflow laden**

**MCP Tool nutzen:**
```
Workflow ID: ftZOou7HNgLOwzE5
Server: https://n8n.srv1091615.hstgr.cloud
Methode: Get Workflow by ID
```

**Nicht GitHub Backup nutzen!**

---

### **SCHRITT 2: Shop Configuration Nodes auflisten**

Zeige Claude ALLE Nodes die "Shop Configuration" enthalten:

```javascript
// Liste alle Shop Config Nodes
nodes.filter(n => n.name.includes('Shop Configuration'))
  .map(n => ({
    name: n.name,
    type: n.type,
    id: n.id
  }))
```

**POST Ergebnis zu cursor-status-live.json:**
```json
{
  "action": "analysis_complete",
  "shop_config_nodes": ["Liste hier"],
  "awaiting": "instruction_from_claude"
}
```

---

### **SCHRITT 3: WARTEN auf Claude Anweisung**

❌ **NICHT:** Automatisch ändern
✅ **NUR:** Claude sagt welcher Node-Name richtig ist
✅ **DANN:** URL anpassen

---

### **SCHRITT 4: Änderung TESTEN (nicht speichern!)**

```
1. URL im n8n Editor ändern
2. Node ausführen (Test)
3. Checke ob URL GRÜN wird
4. POST Status zu Claude:
   - "URL ist GRÜN" → Claude sagt speichern
   - "URL ist ROT" → Anderer Node probieren
```

---

### **SCHRITT 5: NUR bei GRÜN speichern**

Wenn Claude sagt "Speichern":
```
1. Save Workflow in n8n
2. Backup zu GitHub
3. Status: DONE
```

---

## 🎯 KRITISCHE REGEL:

```
ERST:  LIVE-Workflow laden
DANN:  Analyse + Post zu Claude  
DANN:  Warten auf Anweisung
DANN:  Testen (nicht speichern!)
DANN:  Bei GRÜN → Claude fragen
ZULETZT: Wenn OK → Speichern
```

---

## 📡 CURSOR START-BEFEHL:

```
1. MCP zu n8n aktivieren
2. Get Workflow ftZOou7HNgLOwzE5
3. Liste Shop Configuration Nodes
4. POST Namen zu cursor-status-live.json
5. WARTE auf Claude
```

**KEINE automatischen Änderungen!**
**IMMER erst testen, dann speichern!**
**LIVE-Workflow ist Source of Truth!**

---
