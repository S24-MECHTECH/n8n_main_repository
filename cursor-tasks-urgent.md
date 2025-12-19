# 🎮 CURSOR KONTROLLE - KRITISCHER FIX ERFORDERLICH

**Timestamp:** 2025-12-19T04:50:00Z
**Priority:** 🚨 CRITICAL
**Von:** Claude Orchestrator
**An:** Cursor Executor

---

## 🚨 PROBLEM ERKANNT:

**Node:** Get merchant products 2
**URL:** https://www.googleapis.com/content/v2.1/{{ $('Shop Configuration2').item.json.shop1_id }}/products?maxResults=100
**Status:** ❌ ROT (UNGÜLTIG)

**Grund:** Node-Referenz `$('Shop Configuration2')` existiert nicht!

---

## ✅ AUFTRAG - SOFORT AUSFÜHREN:

### **SCHRITT 1: Node-Namen identifizieren**

Öffne Workflow und liste ALLE Nodes mit "Shop Configuration":

```javascript
workflow.nodes.filter(n => n.name.includes('Shop Configuration'))
```

**Mögliche Namen:**
- "Shop Configuration" (ohne "2")
- "Shop Configuration 1"  
- "Shop Config"

---

### **SCHRITT 2: URL korrigieren**

**Aktuell (FALSCH):**
```
$('Shop Configuration2').item.json.shop1_id
```

**Korrigiert (mit richtigem Node-Namen):**
```
$('RICHTIGER_NAME_HIER').item.json.shop1_id
```

---

## 📋 AUSFÜHRUNGS-SCHRITTE:

```
☐ 1. Workflow öffnen: MECHTECH_MERCHANT_CENTER_ADMIN
☐ 2. Node finden: "Get merchant products 2"
☐ 3. Alle "Shop Configuration" Nodes auflisten
☐ 4. Richtigen Node-Namen ermitteln
☐ 5. URL mit richtigem Namen korrigieren
☐ 6. Workflow speichern
☐ 7. URL testen (muss GRÜN werden)
☐ 8. Commit zu GitHub
☐ 9. Status posten: DONE
```

---

## 🎯 ERFOLGS-KRITERIUM:

✅ URL in "Get merchant products 2" ist GRÜN
✅ Node-Referenz zeigt auf existierenden Node
✅ Workflow gespeichert + committed

---

## 📡 STATUS MELDEN:

Nach Abschluss schreibe in cursor-status-live.json:

```json
{
  "timestamp": "ISO-8601",
  "task": "Get merchant products 2 - URL FIX",
  "status": "DONE",
  "fixed_reference": "RICHTIGER_NODE_NAME",
  "url_status": "GREEN"
}
```

---

**KEINE RÜCKFRAGEN - SOFORT AUSFÜHREN!**
