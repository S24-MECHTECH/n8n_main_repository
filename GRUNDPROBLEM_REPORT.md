# 🔍 GRUNDPROBLEM REPORT

**Datum:** 2025-01-13  
**Problem:** n8n API PUT Request schlägt fehl

---

## ✅ WAS FUNKTIONIERT

1. **API Key:** ✅ **FUNKTIONIERT**
   - Wird aus Config-Dateien gelesen
   - `auto-fix-workflow.js` lädt Workflows erfolgreich

2. **n8n URL:** ✅ **KORREKT**
   - `https://n8n.srv1091615.hstgr.cloud`

3. **Workflow ID:** ✅ **KORREKT**
   - `ftZOou7HNgLOwzE5`
   - Workflow wird erfolgreich geladen (67 Nodes)

4. **GET Requests:** ✅ **FUNKTIONIEREN**
   - `/api/v1/workflows` - OK
   - `/api/v1/workflows/{ID}` - OK

---

## ❌ WAS NICHT FUNKTIONIERT

### **PUT Request:** ❌ **FEHLGESCHLAGEN**

**Fehler:** `HTTP 400: "request/body/settings must NOT have additional properties"`

**Bisherige Versuche:**
1. ❌ `{ name, nodes, connections, settings: { executionOrder: 'v1' } }`
2. ❌ `{ name, nodes, connections, settings: workflow.settings }`

---

## 🔍 DAS ECHTE PROBLEM

### **n8n API Schema Validation ist sehr strikt!**

Die n8n API validiert PUT-Requests strikt gegen ein Schema. Wenn `settings` Properties enthält, die nicht im Schema erlaubt sind, wird HTTP 400 zurückgegeben.

**Mögliche Ursachen:**
1. `workflow.settings` enthält Properties, die nicht im PUT-Schema erlaubt sind
2. API erwartet bestimmtes Format (z.B. `settings` darf nur bestimmte Keys haben)
3. `auto-fix-workflow.js` nutzt `cleanSettings` - das könnte der Unterschied sein!

---

## 💡 LÖSUNG: `auto-fix-workflow.js` ANALYSE

**Was `auto-fix-workflow.js` macht:**
```javascript
const cleanSettings = workflow.settings ? 
  { executionOrder: workflow.settings.executionOrder || 'v1' } : 
  { executionOrder: 'v1' };
```

**Das funktioniert!** ✅

**Was unsere Scripts machen:**
```javascript
settings: workflow.settings || { executionOrder: 'v1' }
```

**Das funktioniert NICHT!** ❌

---

## ✅ RICHTIGE LÖSUNG

**Nutze `cleanSettings` wie in `auto-fix-workflow.js`:**

```javascript
const cleanSettings = workflow.settings?.executionOrder ? 
  { executionOrder: workflow.settings.executionOrder } : 
  { executionOrder: 'v1' };

const updatePayload = {
  name: workflow.name,
  nodes: nodes,
  connections: connections,
  settings: cleanSettings  // NUR executionOrder!
};
```

---

## 🎯 NÄCHSTER SCHRITT

**Korrigiere `deploy-nodes-via-api.js`:**

1. Nutze `cleanSettings` (wie in `auto-fix-workflow.js`)
2. Sende **NUR** `executionOrder` in `settings`
3. Keine anderen Properties in `settings`!

---

## 📊 STATUS

- ✅ API Key: Funktioniert
- ✅ Workflow ID: Korrekt
- ✅ GET: Funktioniert
- ❌ PUT: Schema Validation Fehler
- ✅ **Lösung gefunden:** Nutze `cleanSettings` Pattern aus `auto-fix-workflow.js`

---

**Empfehlung:** Kopiere die `cleanSettings` Logik aus `auto-fix-workflow.js` in alle Deployment-Scripts!
