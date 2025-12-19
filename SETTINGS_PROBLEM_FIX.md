# 🔧 SETTINGS PROBLEM - FIX

## ⚠️ PROBLEM

**Fehler:** `HTTP 400: "request/body/settings must NOT have additional properties"`

**Ursache:**
- n8n API erlaubt in `settings` **NUR** `executionOrder`
- Alle anderen Properties (z.B. `saveDataErrorExecution`, `saveDataSuccessExecution`, etc.) werden abgelehnt

## ✅ LÖSUNG

### **FIXED CODE:**

```javascript
const updatePayload = {
  name: workflow.name,
  nodes: workflow.nodes,
  connections: workflow.connections
};

// FIXED: Nur executionOrder in settings (falls vorhanden)
// Alle anderen Properties werden entfernt!
if (workflow.settings && workflow.settings.executionOrder) {
  updatePayload.settings = { executionOrder: workflow.settings.executionOrder };
}
```

### **Erlaubte Settings Properties:**
- ✅ `executionOrder` (z.B. "v1")
- ❌ Alles andere wird abgelehnt!

### **Verwendung:**
- In `auto-deploy-connections.js` implementiert
- Wird automatisch angewendet bei jedem Deployment

## 📋 GITHUB + AUTO-DEPLOY WORKFLOW

1. **Connections definieren** → `claude-outputs/connections.json`
2. **Auto-Deploy ausführen** → `scripts/auto-deploy-connections.js`
3. **Workflow aktualisiert** → Settings Problem automatisch gefixt

**Status:** ✅ GEFIXT
