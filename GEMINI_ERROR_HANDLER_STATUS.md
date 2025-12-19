# 🚀 GEMINI ERROR HANDLER - STATUS

**Datum:** 2025-01-13  
**Strategie:** Zentrales Gemini Error Handling für alle 6 Stränge

---

## ✅ ERFOLGREICH ERSTELLT

### 6 Gemini Error Handler Nodes:

1. **Gemini Error Handler Adult Flags**
   - ID: `gemini-error-adult-1766027265946`
   - Type: `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
   - Status: ✅ Erstellt

2. **Gemini Error Handler Images**
   - ID: `gemini-error-images-1766027265947`
   - Type: `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
   - Status: ✅ Erstellt

3. **Gemini Error Handler Text**
   - ID: `gemini-error-text-1766027265947`
   - Type: `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
   - Status: ✅ Erstellt

4. **Gemini Error Handler Merchant Quality**
   - ID: `gemini-error-quality-1766027265948`
   - Type: `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
   - Status: ✅ Erstellt

5. **Gemini Error Handler Multi Country**
   - ID: `gemini-error-country-1766027265948`
   - Type: `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
   - Status: ✅ Erstellt

6. **Gemini Error Handler GTN/EAN**
   - ID: `gemini-error-gtnean-1766027265949`
   - Type: `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
   - Status: ✅ Erstellt

---

## 📋 SYSTEM PROMPT (für jeden Node)

```
Du bist ein zentraler Error Handler für Google Merchant Center [STRAND NAME] Updates.

AUFGABE:
1. Fehler analysieren (HTTP Status Codes, Error Messages, Product Data)
2. Produkt reparieren wenn möglich (fehlende Felder, ungültige Daten, Format-Fehler)
3. Intelligente Decision treffen: RETRY / AUTO_FIX / REROUTE / SKIP / ALERT
4. Nächsten Step vorschlagen
5. ALLES detailliert loggen

INPUT:
- error: { code, message, details }
- product: { alle Produktfelder }
- context: { strand: "[STRAND NAME]", attempt, previousActions }

DECISION REGELN:
- Code 429 (Rate Limit) → RETRY mit exponential backoff
- Code 400 (Bad Request) → AUTO_FIX wenn reparierbar, sonst REROUTE zu merchant_quality
- Code 500 (Server Error) → RETRY nach Delay, max 3x
- Code 404 (Not Found) → SKIP (Produkt existiert nicht)
- Unknown/Other → ALERT (manuelle Prüfung nötig)

AUTO_FIX REGELN:
- Fehlende Pflichtfelder → Standardwerte setzen
- Ungültige Formate → Korrigieren (URLs, Zahlen, Datum)
- Zu lange Texte → Kürzen
- Falsche Datentypen → Konvertieren

OUTPUT (JSON):
{
  "action": "RETRY" | "AUTO_FIX" | "REROUTE" | "SKIP" | "ALERT",
  "fix_applied": { "field": "value", ... } | null,
  "product_fixed": { vollständiges repariertes Product } | null,
  "confidence": 0.0-1.0,
  "delay": number (Sekunden für RETRY),
  "next_action": "string (Beschreibung)",
  "reason": "string (Warum diese Aktion?)",
  "log": "string (detailliertes Log)"
}

WICHTIG: Antworte IMMER mit validem JSON!
```

---

## 🔗 CONNECTIONS

### Verbindungen die erstellt werden müssen:

**Für jeden Strang:**

1. **Rate Limiting Node → Gemini Error Handler**
   - Output: `main[0]`
   - Input: `main[0]`

2. **Update Node (Error Output) → Gemini Error Handler**
   - Output: `main[error output]`
   - Input: `main[0]`

3. **Gemini Error Handler → Action Nodes** (basierend auf Output.action)
   - RETRY → Zurück zu Rate Limiting oder Update Node
   - AUTO_FIX → Update Node mit repariertem Product
   - REROUTE → Route zu merchant_quality oder Handle Invalid Priority
   - SKIP → Log Results to Sheets (als skipped)
   - ALERT → Handle Invalid Priority oder Alert Node

---

## 📋 NÄCHSTE SCHRITTE

1. ✅ **Nodes erstellt** (fertig)
2. ⏳ **Connections bauen** (Rate Limiting → Gemini Error Handler)
3. ⏳ **System Prompt konfigurieren** (in jedem Gemini Node)
4. ⏳ **Action Nodes erstellen** (basierend auf Gemini Output)
5. ⏳ **Testen** (mit Sample Error Data)
6. ⏳ **Gemini Responses prüfen** (sollten JSON sein)

---

## 🎯 ZIEL

**Zentrales, intelligentes Error Handling mit Gemini AI:**
- ✅ Fehleranalyse automatisch
- ✅ Produktreparatur wenn möglich
- ✅ Intelligente Decisions (RETRY/FIX/REROUTE/SKIP)
- ✅ Detailliertes Logging
- ✅ Für alle 6 Stränge gleich

---

**Status:** ✅ Nodes erstellt, ⏳ Connections & Konfiguration ausstehend
