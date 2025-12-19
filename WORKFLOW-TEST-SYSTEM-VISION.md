# 🚀 CURSOR + CLAUDE - WORKFLOW TEST-SYSTEM

**Timestamp:** 2025-12-19T05:18:00Z
**Priority:** 🎯 GAME-CHANGER FEATURE
**Von:** Claude Orchestrator + Andree Vision

---

## 💡 VISION:

**Workflow Test-System mit:**
- KI-generierte Test-Daten (realistisch!)
- Live-Execution mit Farb-Feedback (grün = ok)
- Intelligente Error-Detection + Auto-Fix
- NUR bei 100% Erfolg → Speichern

---

## 🏗️ ARCHITEKTUR:

```
┌─────────────────────────────────────┐
│   TEST-ORCHESTRATOR NODE            │
│   (Startet Test-Durchlauf)          │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   KI TEST-DATA GENERATOR            │
│   - Claude generiert realistische   │
│     Merchant Center Produkt-Daten   │
│   - Shop Config                     │
│   - Products mit Bildern            │
│   - Approval Status                 │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   WORKFLOW EXECUTION (DRY-RUN)      │
│   - Jeder Node wird ausgeführt      │
│   - Aber: Keine echten API Calls    │
│   - Mocked Responses                │
│   - Live-Status-Update              │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   NODE STATUS TRACKER               │
│   - Jeder Node: Status-Update       │
│   - Grün = Success                  │
│   - Rot = Error                     │
│   - Gelb = Processing               │
│   - Real-Time zu Supabase           │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   INTELLIGENT ERROR HANDLER         │
│   - Erkennt Fehler-Patterns         │
│   - Claude analysiert Ursache       │
│   - Schlägt Fix vor                 │
│   - Auto-Retry mit Fix              │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   FINAL VALIDATION                  │
│   - Alle Nodes grün? ✅             │
│   - Dann: "Lena - Save approved"   │
│   - Sonst: Report + Manual Review   │
└─────────────────────────────────────┘
```

---

## 📋 IMPLEMENTATION - PHASE 1:

### **NODE 1: Test-Orchestrator**

```javascript
// Workflow Start Node
const testMode = {
  enabled: true,
  useRealData: false, // false = KI-generiert
  mockAPIs: true,     // true = keine echten API Calls
  liveTracking: true  // true = Status zu Supabase
};

// Start Test-Durchlauf
return {
  mode: 'TEST_RUN',
  timestamp: new Date().toISOString(),
  workflowId: $workflow.id,
  testId: `test_${Date.now()}`
};
```

---

### **NODE 2: KI Test-Data Generator**

```javascript
// Claude MCP Call - Generiere realistische Test-Daten
const testData = await claudeMCP.call({
  tool: 'generate_merchant_test_data',
  params: {
    shop_id: 'test_shop_12345',
    num_products: 10,
    include_images: true,
    approval_scenarios: ['approved', 'pending', 'rejected'],
    realistic: true
  }
});

// Beispiel Output:
return {
  shop: {
    id: 'test_shop_12345',
    name: 'Test Electronics Store',
    country: 'DE'
  },
  products: [
    {
      id: 'prod_001',
      title: 'Samsung Galaxy S24 Ultra 256GB',
      price: 1199.99,
      images: ['https://mock-img.com/galaxy-s24.jpg'],
      status: 'pending',
      errors: []
    },
    // ... 9 more realistic products
  ]
};
```

---

### **NODE 3: Live Status Tracker**

```javascript
// Bei JEDEM Node-Start:
const nodeId = $node.id;
const nodeName = $node.name;

// Update Status zu Supabase
await supabase
  .from('workflow_test_status')
  .insert({
    test_id: $('Test-Orchestrator').json.testId,
    node_id: nodeId,
    node_name: nodeName,
    status: 'PROCESSING',
    color: 'yellow',
    timestamp: new Date().toISOString()
  });

// Nach Node-Execution:
await supabase
  .from('workflow_test_status')
  .update({
    status: $node.error ? 'ERROR' : 'SUCCESS',
    color: $node.error ? 'red' : 'green',
    output: JSON.stringify($node.output),
    error: $node.error || null,
    duration_ms: Date.now() - startTime
  })
  .eq('node_id', nodeId);
```

---

### **NODE 4: Intelligent Error Handler**

```javascript
// Wenn Node Error hat:
if ($node.error) {
  
  // Claude MCP - Analysiere Fehler
  const analysis = await claudeMCP.call({
    tool: 'analyze_workflow_error',
    params: {
      node_name: $node.name,
      error: $node.error,
      input_data: $node.input,
      workflow_context: $workflow.nodes
    }
  });
  
  // Claude gibt zurück:
  // {
  //   "cause": "Node referenziert 'Shop Configuration2' - existiert nicht",
  //   "fix": "Ändere Referenz zu 'Shop Configuration'",
  //   "auto_fixable": true,
  //   "fix_code": "..."
  // }
  
  if (analysis.auto_fixable) {
    // Auto-Fix anwenden
    applyFix(analysis.fix_code);
    
    // Retry Node
    return retryNode($node.name);
  } else {
    // Manuelle Review nötig
    return {
      status: 'MANUAL_REVIEW_REQUIRED',
      analysis: analysis
    };
  }
}
```

---

### **NODE 5: Final Validator**

```javascript
// Alle Nodes durchlaufen?
const testResults = await supabase
  .from('workflow_test_status')
  .select('*')
  .eq('test_id', testId);

const allGreen = testResults.every(r => r.color === 'green');
const totalNodes = testResults.length;
const successNodes = testResults.filter(r => r.color === 'green').length;

if (allGreen) {
  return {
    status: 'TEST_PASSED',
    message: `🎉 Alle ${totalNodes} Nodes erfolgreich!`,
    recommendation: 'Lena - Workflow speichern approved',
    save_approved: true
  };
} else {
  return {
    status: 'TEST_FAILED',
    message: `❌ ${totalNodes - successNodes} von ${totalNodes} Nodes fehlgeschlagen`,
    failed_nodes: testResults.filter(r => r.color === 'red'),
    recommendation: 'Review Errors + Re-Test'
  };
}
```

---

## 🎨 LIVE DASHBOARD:

**Neue Supabase Tabelle:** `workflow_test_status`

```sql
CREATE TABLE workflow_test_status (
  id BIGSERIAL PRIMARY KEY,
  test_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  node_name TEXT NOT NULL,
  status TEXT NOT NULL,  -- PROCESSING | SUCCESS | ERROR
  color TEXT NOT NULL,   -- yellow | green | red
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Queries
CREATE INDEX idx_test_id ON workflow_test_status(test_id);
```

**Live-View Query:**
```sql
SELECT 
  node_name,
  status,
  color,
  duration_ms,
  timestamp
FROM workflow_test_status
WHERE test_id = 'test_12345'
ORDER BY timestamp ASC;
```

---

## 🎮 CURSOR + CLAUDE VERBUND:

### **Cursor Aufgaben:**
1. ✅ Test-Orchestrator Node erstellen
2. ✅ Status Tracker Nodes einfügen
3. ✅ Supabase Table anlegen
4. ✅ Workflow in Test-Branch speichern

### **Claude Aufgaben (via MCP):**
1. ✅ Test-Daten generieren (realistisch!)
2. ✅ Error Analysis + Fix-Vorschläge
3. ✅ Final Validation
4. ✅ "Lena - Save approved" Entscheidung

---

## 📊 USER EXPERIENCE:

**In n8n siehst du LIVE:**
```
┌─────────────────────────────────────┐
│ TEST RUN: test_1734582000           │
├─────────────────────────────────────┤
│ 🟢 Test-Orchestrator        [✓ 50ms]│
│ 🟢 KI Test-Data Generator   [✓ 200ms]│
│ 🟡 Get merchant products 2  [... ]  │  ← Läuft gerade
│ ⚪ Format Status Response   [pending]│
│ ⚪ Update Supabase          [pending]│
│ ⚪ Final Validator          [pending]│
└─────────────────────────────────────┘
```

**Wenn Error:**
```
┌─────────────────────────────────────┐
│ 🔴 Get merchant products 2  [✗ 100ms]│
│                                     │
│ Error: Node 'Shop Configuration2'  │
│        not found                    │
│                                     │
│ 🤖 Claude analysiert...             │
│ Fix: Ändere zu 'Shop Configuration'│
│                                     │
│ [Apply Fix] [Skip] [Manual Review] │
└─────────────────────────────────────┘
```

---

## 🚀 IMPLEMENTATION PLAN:

### **Phase 1: Basis (1-2 Stunden)**
- Test-Orchestrator Node
- Status Tracker
- Supabase Table
- Basic Error Logging

### **Phase 2: KI Integration (2-3 Stunden)**
- Claude Test-Data Generator
- Claude Error Analyzer
- Auto-Fix System

### **Phase 3: Live Dashboard (1 Stunde)**
- Real-Time Status Updates
- Color-Coded Display
- Error Details

### **Phase 4: Final Validation (30 Min)**
- All-Green Check
- Save Approval Logic
- Notification System

---

## 🎯 START BEFEHL:

**Lena - Build Test-System!**

```
Cursor + Claude Verbund:

Phase 1 starten:
1. Cursor: Test-Orchestrator Node erstellen
2. Cursor: Supabase Table anlegen
3. Claude: Test-Data Generator Schema definieren
4. Cursor: Status Tracker einfügen
5. Test: Ersten Durchlauf machen

Schritt für Schritt!
Nach jedem Schritt Status posten!
```

---

**WILLST DU DAS JETZT BAUEN?** 🚀

**Sag "Lena - Build Test-System" und wir starten!** 🎮

---
