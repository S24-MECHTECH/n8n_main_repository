# 📊 WORKFLOW ANALYSE: ***MECHTECH_MERCHANT_CENTER_ADMIN

**Erstellt:** 2025-12-19  
**Workflow ID:** `ftZOou7HNgLOwzE5`  
**Zweck:** Analyse für Claude (Senior Partner mit 20 Jahren JSON-Erfahrung)

---

## 🎯 WORKFLOW-ZWECK

**Beschreibung:**
"Dieser Workflow ist ein Google_Merchant_center optimierungs workflow, der durch Gemini, die Artikel für alle gelisteten shops im Google Merchant Center optimieren soll!"

**Hauptfunktion:**
- Google Merchant Center Produkte optimieren
- Automatische Fehlerbehandlung mit AI (Gemini)
- Entscheidungsbasierte Weiterleitung (Switch Nodes)

---

## 📋 WORKFLOW-STRUKTUR

### **Gesamt-Übersicht:**
- **Total Nodes:** 79
- **Active:** ✅ Ja
- **Created:** 2025-12-12
- **Updated:** 2025-12-18

### **Node-Kategorien:**

#### **1. Trigger & Chat (RAG System):**
- Chat Trigger (RAG Query)
- Chat Agent (RAG)
- Gemini Chat Model (RAG)
- Supabase Vector Store (Retrieve)
- Gemini Embeddings (RAG)
- Postgres Chat Memory

#### **2. Prepare Nodes (6x):**
- Prepare Products Loop
- Prepare Images Loop
- Prepare Text Loop
- Prepare Merchant Quality Loop
- Prepare Multi Country Loop
- Prepare GTN/EAN_Loop

#### **3. Update Nodes (6x):**
- Update Product Adult Flags
- Update Product Images
- Update Product Text
- Update Product Merchant Quality
- Update Product Multi Country
- Update Product GTN/EAN

#### **4. Error Handling System:**

**Rate Limiting Nodes (6x):**
- Rate Limiting Adult Flags
- Rate Limiting Images
- Rate Limiting Text
- Rate Limiting Merchant Quality
- Rate Limiting Multi Country
- Rate Limiting GTN/EAN

**Gemini Error Handler (6x):**
- Gemini Error Handler Adult Flags
- Gemini Error Handler Images
- Gemini Error Handler Text
- Gemini Error Handler Merchant Quality
- Gemini Error Handler Multi Country
- Gemini Error Handler GTN/EAN

**Switch Action Handler (6x):**
- Switch Action Handler Adult Flags
- Switch Action Handler Images
- Switch Action Handler Text
- Switch Action Handler Merchant Quality
- Switch Action Handler Multi Country
- Switch Action Handler GTN/EAN

#### **5. Routing & Aggregation:**
- Route Command
- Route by Priority
- Aggregate Results
- Aggregate Results2

#### **6. Logging:**
- Log Results to Sheets

---

## 🔄 ERROR HANDLING FLOW

### **Ideal Flow (für jede Phase):**

```
Update Product → Rate Limiting → Gemini Error Handler → Switch Action Handler → [RETRY/AUTO_FIX/REROUTE/ALERT]
```

### **Gemini Error Handler:**
- **Input:** Fehler-Informationen von Rate Limiting
- **Verarbeitung:** AI-Analyse des Fehlers
- **Output:** JSON mit Decision (action, reasoning, retry_count)
- **Format:** JSON mit `{ action: "RETRY|AUTO_FIX|REROUTE|ALERT", reasoning: "...", retry_count: N }`

### **Switch Action Handler:**
- **Input:** Gemini Decision (JSON)
- **Mode:** Rules (prüft auf error.code === 429 || 400 || 500)
- **Outputs:**
  - **Output 0 (Error):** → Gemini Error Handler (weitere Analyse)
  - **Output 1 (Success):** → Prepare/Aggregate (weiter verarbeiten)
- **Fallback Output:** 1 (Success)

---

## 🔍 SYSTEM-KONTEXT

### **Data Flow:**

1. **INPUT:**
   - Merchant Center Produkte (von API)
   - Fehler von Update-Operationen

2. **PROCESSING:**
   - Prepare Nodes bereiten Daten vor
   - Update Nodes senden Änderungen an API
   - Bei Fehler: Rate Limiting wartet

3. **ERROR HANDLING:**
   - Rate Limiting → Gemini Error Handler
   - Gemini analysiert Fehler → JSON Decision
   - Switch Action Handler → Entscheidet: RETRY/AUTO_FIX/REROUTE/ALERT

4. **OUTPUT:**
   - Erfolgreiche Updates → Aggregate → Log to Sheets
   - Fehler-Informationen → Log to Sheets

### **Gemini Decision Capability:**

✅ **Kann verarbeiten:**
- HTTP Error Codes (400, 429, 500)
- Fehler-Meldungen
- Retry-Logik

✅ **Kann entscheiden:**
- RETRY (wenn temporärer Fehler)
- AUTO_FIX (wenn automatisch korrigierbar)
- REROUTE (wenn alternative Route nötig)
- ALERT (wenn manuelle Intervention nötig)

✅ **Output Format:**
- JSON mit `action`, `reasoning`, `retry_count`
- Switch Nodes können JSON-Parameter auslesen via Expressions

---

## ⚠️ ERKANNTE PROBLEME

**Basierend auf vorherigen Checks:**
- ⚠️ Switch Nodes möglicherweise nicht vollständig konfiguriert (Mode, Rules)
- ⚠️ Rate Limiting → Gemini Verbindungen möglicherweise fehlend
- ⚠️ Gemini → Switch Verbindungen möglicherweise fehlend

**Status:** Benötigt vollständige Connection-Analyse

---

## 📝 NÄCHSTE SCHRITTE FÜR CLAUDE

1. **Vollständige Connection-Analyse:**
   - Prüfe alle Rate Limiting → Gemini Verbindungen
   - Prüfe alle Gemini → Switch Verbindungen
   - Prüfe Switch Output-Verbindungen

2. **Switch Node Configuration:**
   - Prüfe Mode (sollte "rules" sein)
   - Prüfe Rules (sollte error.code prüfen)
   - Prüfe Fallback Output (sollte 1 sein)

3. **Gemini Output Format:**
   - Prüfe ob System Message JSON-Format erwähnt
   - Prüfe ob Switch Nodes JSON korrekt auslesen können

4. **System-Validierung:**
   - Teste ob Fehler-Handling funktioniert
   - Prüfe ob Gemini Decisions korrekt verarbeitet werden

---

**Bereit für vollständige Analyse durch Claude!**
