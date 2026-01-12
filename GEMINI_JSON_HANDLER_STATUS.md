# 🚀 GEMINI ERROR HANDLER - JSON INPUT/OUTPUT (n8n 2.0)

**Datum:** 2025-01-13  
**Update:** n8n 2.0 kompatibel - JSON-basiertes Error Handling

---

## ✅ KONFIGURATION

### Gemini Error Handler Nodes aktualisiert für JSON:

1. **Gemini Error Handler Adult Flags**
2. **Gemini Error Handler Images**
3. **Gemini Error Handler Text**
4. **Gemini Error Handler Merchant Quality**
5. **Gemini Error Handler Multi Country**
6. **Gemini Error Handler GTN/EAN**

---

## 📋 JSON INPUT FORMAT

```json
{
  "error": {
    "code": 429,
    "message": "Rate limit exceeded"
  },
  "product": {
    "sku": "ABC123",
    "title": "Product Title",
    "action": "adult_flags"
  },
  "attempt": 1,
  "context": "retry_loop"
}
```

---

## 📋 JSON OUTPUT FORMAT

```json
{
  "action": "RETRY" | "AUTO_FIX" | "REROUTE" | "SKIP" | "ALERT",
  "fix_applied": "Beschreibung des Fixes",
  "product_fixed": {
    "sku": "ABC123",
    "title": "Fixed Title",
    ...
  },
  "confidence": 85,
  "next_step": "retry_update" | "update_product" | "retry_queue" | "skip" | "alert",
  "reason": "Warum diese Aktion?"
}
```

---

## 🎯 DECISION REGELN

- **Code 429 (Rate Limit)** → `action: "RETRY"`, `next_step: "retry_update"`
- **Code 400 (Bad Request)** → `action: "AUTO_FIX"` wenn reparierbar, sonst `"REROUTE"`
- **Code 500 (Server Error)** → `action: "RETRY"`, max 3x attempts
- **Code 404 (Not Found)** → `action: "SKIP"`
- **Unknown/Other** → `action: "ALERT"`

---

## 📋 SYSTEM PROMPT

Jeder Gemini Error Handler hat einen System Prompt der:
1. JSON Input parsing erklärt
2. Decision Regeln definiert
3. Auto-Fix Beispiele gibt
4. JSON Output Format spezifiziert
5. **WICHTIG:** Nur valid JSON zurückgeben, kein zusätzlicher Text!

---

## 🔗 NÄCHSTE SCHRITTE

1. ✅ **Gemini Nodes konfiguriert** (System Prompt)
2. ⏳ **Code Node VOR Gemini:** Format Input zu JSON
3. ⏳ **Code Node NACH Gemini:** Parse JSON Output
4. ⏳ **Route basierend auf action:** Zu entsprechenden Nodes
5. ⏳ **Test mit Sample Error Data**

---

## 🔧 IMPLEMENTATION TIP

**VOR Gemini Node (Code Node):**
```javascript
// Format Input für Gemini
const inputData = {
  error: $json.error || { 
    code: $json.statusCode || 500, 
    message: $json.error?.message || "Unknown error" 
  },
  product: $json.product || $json,
  attempt: $json.attempt || 1,
  context: $json.context || "error_handler"
};

return { json: inputData };
```

**NACH Gemini Node (Code Node):**
```javascript
// Parse Gemini JSON Output
const geminiResponse = $json.response || $json.content || $json;
let parsed;

try {
  // Versuche JSON zu parsen (falls String)
  parsed = typeof geminiResponse === 'string' 
    ? JSON.parse(geminiResponse) 
    : geminiResponse;
} catch (e) {
  // Fallback falls kein JSON
  parsed = {
    action: "ALERT",
    reason: "Gemini Response konnte nicht geparst werden",
    confidence: 0
  };
}

return { json: parsed };
```

---

**Status:** ✅ Nodes konfiguriert, ⏳ Code Nodes & Routing ausstehend
