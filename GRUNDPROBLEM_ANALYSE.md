# 🔍 GRUNDPROBLEM ANALYSE

**Datum:** 2025-01-13

---

## ✅ WAS FUNKTIONIERT

1. **API Key:** ✅ Funktioniert
   - Wird aus Config-Dateien gelesen
   - `auto-fix-workflow.js` kann Workflows laden

2. **n8n URL:** ✅ Korrekt
   - `https://n8n.srv1091615.hstgr.cloud`

3. **Workflow ID:** ✅ Korrekt
   - `ftZOou7HNgLOwzE5`
   - Workflow wird erfolgreich geladen

4. **GET Requests:** ✅ Funktioniert
   - `/api/v1/workflows` - funktioniert
   - `/api/v1/workflows/{ID}` - funktioniert

---

## ❌ WAS NICHT FUNKTIONIERT

### **PUT Request:** ❌ Fehlgeschlagen

**Fehler:** `HTTP 400: "request/body must NOT have additional properties"`

**Versuchte Payloads:**
1. `{ name, nodes, connections, settings: { executionOrder } }` ❌
2. `{ name, nodes, connections }` ❌ (fehlende required property 'settings')
3. `{ name, nodes, connections, settings: workflow.settings }` ❌ (settings hat zusätzliche Properties)

---

## 🔍 DAS ECHTE PROBLEM

### **n8n API Schema Validation ist sehr strikt!**

Die n8n API akzeptiert beim PUT **NUR** genau die Felder, die im Schema definiert sind.

**Mögliche Ursachen:**
1. `settings` Objekt hat Properties, die nicht erlaubt sind
2. API erwartet anderes Format für `nodes` oder `connections`
3. Version-Mismatch zwischen API und Schema

---

## 💡 LÖSUNG

### Option 1: Settings komplett weglassen (wenn optional)
```javascript
const updatePayload = {
  name: workflow.name,
  nodes: nodes,
  connections: connections
  // KEIN settings!
};
```

### Option 2: Settings nur mit erlaubten Properties
- Prüfe n8n API Dokumentation
- Nur `executionOrder` erlaubt? Oder gar nichts?

### Option 3: Workflow komplett neu laden und nur geänderte Felder senden
- Lade Workflow
- Ändere nur `nodes` und `connections`
- Sende exakt das gleiche `settings` Objekt zurück (ohne Modifikation)

### Option 4: MCP verwenden (wenn verfügbar)
- Nutze n8n-MCP Tools statt direkter API

### Option 5: Browser-UI
- Manuell in n8n UI ändern
- Nodes per Drag&Drop hinzufügen

---

## 🎯 EMPFOHLENE LÖSUNG

**Test 1:** Settings komplett weglassen
```javascript
const updatePayload = {
  name: workflow.name,
  nodes: nodes,
  connections: connections
};
```

**Test 2:** Settings als leeres Objekt
```javascript
const updatePayload = {
  name: workflow.name,
  nodes: nodes,
  connections: connections,
  settings: {}
};
```

**Test 3:** Settings exakt wie im geladenen Workflow
```javascript
const updatePayload = {
  name: workflow.name,
  nodes: nodes,
  connections: connections,
  settings: workflow.settings  // Exakt wie geladen, keine Modifikation
};
```

---

## 📊 STATUS

- ✅ API Key: Funktioniert
- ✅ Workflow ID: Korrekt
- ✅ GET: Funktioniert
- ❌ PUT: Schema Validation Fehler
- ⏸️ **Nächster Schritt:** Test mit minimalem Payload (ohne Settings)

---

**Empfehlung:** Test mit Settings = `workflow.settings` (exakt wie geladen, keine Modifikation)
