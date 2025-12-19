# 🚀 AUTO DEPLOY INSTRUCTIONS

**Nach JEDEM Node-Update:**

## PROZESS:

### 1. Node-Code fertig? ✅
- Code in `auto-deploy-nodes.js` unter `nodeCodes` aktualisieren
- Beispiel:
```javascript
const nodeCodes = {
  'AI Error Handler': `// NEUER CODE HIER`,
  'Retry Queue': `// NEUER CODE HIER`,
  'Expression Repair': `// NEUER CODE HIER`
};
```

### 2. DIREKT zu n8n via API pushen 🚀
```bash
cd C:\Users\Andree\n8n_main_repository\scripts
node auto-deploy-nodes.js
```

**Oder im Script:**
```javascript
const updatePayload = {
  name: workflow.name,
  nodes: nodes,  // Nodes mit aktualisiertem Code
  connections: connections,
  settings: cleanSettings
};

await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
```

### 3. Fertig - LIVE in n8n! ✅
- Script updated automatisch
- Workflow wird gespeichert
- Nodes sind LIVE

### 4. KEIN Manual-Zeug! ✅
- Kein Copy-Paste im Browser
- Kein manuelles SAVE
- Alles automatisch

---

## WENN GEHT → GEIL! ✅

Wenn Deployment erfolgreich:
```
✅ AUTO DEPLOYMENT ERFOLGREICH
   ✅ X Node(s) deployed
   ✅ KEIN Manual-Zeug nötig!
```

---

## WENN NICHT → ERROR REPORT ❌

Wenn Deployment fehlschlägt:
```
❌ FEHLER: [Error Message]
📊 REPORT: ❌ DEPLOYMENT FEHLGESCHLAGEN
```

**Dann:**
1. Error Message analysieren
2. API-Key prüfen
3. Workflow-ID prüfen
4. Node-Namen prüfen

---

## VERWENDUNG:

**Nach Code-Änderung:**
1. Code in `nodeCodes` aktualisieren
2. `node auto-deploy-nodes.js` ausführen
3. Fertig! ✅

**Kein Browser, kein Manual, kein Copy-Paste!**
