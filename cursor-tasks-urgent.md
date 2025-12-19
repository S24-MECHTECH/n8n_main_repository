# 🎮 CURSOR - WORKFLOW SCAN AUFTRAG

**Timestamp:** 2025-12-19T05:05:00Z
**Priority:** 🚨 URGENT
**Von:** Claude Orchestrator
**An:** Cursor Executor

---

## 📋 AUFTRAG: WORKFLOW ANALYSE

**Workflow hängt bei:** "Format Status Response"
**Aufgabe:** Kompletter Scan + Analyse + Report

---

## ✅ SCHRITT 1: LIVE-WORKFLOW LADEN

```
MCP Tool: Get Workflow by ID
Workflow ID: ftZOou7HNgLOwzE5
Server: https://n8n.srv1091615.hstgr.cloud

Lade KOMPLETTEN Workflow JSON
NICHT GitHub Backup nutzen!
```

---

## ✅ SCHRITT 2: NODE ANALYSE

### **Finde "Format Status Response" Node:**

```javascript
// Im Workflow JSON suchen:
const node = workflow.nodes.find(n => 
  n.name === "Format Status Response" || 
  n.name.includes("Format Status")
);

// Analysiere:
{
  name: node.name,
  type: node.type,
  position: node.position,
  parameters: node.parameters,
  credentials: node.credentials
}
```

### **Checke VORHERIGEN Node:**

```javascript
// Welcher Node kommt DAVOR?
const connections = workflow.connections;
const previousNodes = findPreviousNodes(node.name);

// Was gibt der vorherige Node aus?
previousNodes.forEach(prev => {
  console.log(`${prev.name} → Format Status Response`);
});
```

---

## ✅ SCHRITT 3: PROBLEM IDENTIFIZIEREN

### **Checke auf:**

1. **Endlosschleifen:**
   - `while(true)` im Code?
   - Loop ohne Exit-Condition?

2. **Fehlende Timeouts:**
   - HTTP Requests ohne Timeout?
   - Lange laufende Operations?

3. **Große Datenmengen:**
   - Wie viele Items?
   - Größe des JSON?

4. **Falsche Node-Referenzen:**
   - `$('Node Name')` existiert?
   - Expressions korrekt?

---

## ✅ SCHRITT 4: REPORT ERSTELLEN

### **POST zu cursor-status-live.json:**

```json
{
  "timestamp": "ISO-8601",
  "task": "Workflow Scan Complete",
  "status": "ANALYSIS_READY",
  "findings": {
    "hanging_node": {
      "name": "Format Status Response",
      "type": "NODE_TYPE_HIER",
      "problem": "BESCHREIBUNG",
      "code_snippet": "RELEVANTER_CODE",
      "previous_node": "NODE_DAVOR",
      "data_flow": "WAS_KOMMT_REIN"
    },
    "diagnosis": "VERMUTUNG_WAS_KAPUTT_IST",
    "suggested_fix": "WIE_REPARIEREN"
  }
}
```

### **UND zu GitHub:**

```
File: workflow-analysis-report.md
Branch: fix/route-by-priority-multi-ai

Commit Message: "ANALYSIS: Format Status Response hang diagnosis"
```

---

## 📊 REPORT STRUKTUR:

```markdown
# Workflow Hang Analysis

## Node Details
- Name: Format Status Response
- Type: [Code/Set/Function/HTTP Request]
- Position: [x, y]

## Code/Config
[Kompletter Code oder Parameter]

## Data Flow
- Previous Node: [Name]
- Input Data: [Type und Größe]
- Expected Output: [Was soll rauskommen]

## Problem Diagnosis
[Was ist kaputt]

## Suggested Fix
[Wie reparieren]

## Red URL Issue
- Node: Get merchant products 2
- URL: {{ $('Shop Configuration2')... }}
- Problem: Node 'Shop Configuration2' existiert nicht
- Available Shop Config Nodes: [Liste]
```

---

## 🎯 AUSFÜHRUNGS-CHECKLISTE:

```
☐ 1. MCP Connection aktiv
☐ 2. Live-Workflow geladen (ftZOou7HNgLOwzE5)
☐ 3. "Format Status Response" Node gefunden
☐ 4. Code/Config analysiert
☐ 5. Vorherigen Node identifiziert
☐ 6. Problem diagnostiziert
☐ 7. Fix vorgeschlagen
☐ 8. Shop Configuration Nodes gelistet
☐ 9. Report zu cursor-status-live.json
☐ 10. Report zu GitHub committed
```

---

## 📡 WICHTIG:

**BEIDE Wege nutzen:**
- ✅ cursor-status-live.json (für Echtzeit)
- ✅ GitHub Report (für Dokumentation)

**Kein manuelles Fixen:**
- ❌ NICHT Workflow ändern
- ❌ NICHT speichern
- ✅ NUR scannen + reporten

**Warten auf Claude Anweisung:**
- Report fertig → Status posten
- Claude analysiert Report
- Claude gibt Fix-Anweisung
- DANN erst Änderungen machen

---

## 🚀 START BEFEHL:

**Lena - Workflow scannen!**

1. Live von n8n laden (ftZOou7HNgLOwzE5)
2. "Format Status Response" analysieren
3. Shop Configuration Nodes listen
4. Report erstellen (JSON + Markdown)
5. Posten (cursor-status-live.json + GitHub)
6. Auf meine Anweisung warten

**KEINE Änderungen ohne Freigabe!**

---
