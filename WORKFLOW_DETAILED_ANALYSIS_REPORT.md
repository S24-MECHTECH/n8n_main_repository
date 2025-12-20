# 📊 MECHTECH WORKFLOW - DETAILLIERTER ANALYSE-REPORT

**Datum:** 2025-12-20T06:16:28.810Z
**Workflow:** ***MECHTECH_MERCHANT_CENTER_ADMIN (ftZOou7HNgLOwzE5)
**Gesamt Nodes:** 133

---

## 🔀 ROUTE BY PRIORITY - ANALYSE

**Node ID:** 106ca99d-46c0-481a-943b-6cb0fe0b75be
**Total Outputs:** 7
**Error Connection:** ❌
**onError:** continueErrorOutput

### Bedingungen:

1. **Adult Flags**
   - Condition: `={{ $json.output.priority }} equals adult_flags`
   - Target: No connection

2. **Images**
   - Condition: `={{ $json.output.priority }} equals images`
   - Target: No connection

3. **Text**
   - Condition: `={{ $json.output.priority }} equals text`
   - Target: No connection

4. **Merchant Quality**
   - Condition: `={{ $json.output.priority }} equals merchant_quality`
   - Target: No connection

5. **Multi Country**
   - Condition: `={{ $json.output.priority }} equals multi_country`
   - Target: No connection

6. **Multi GTN/EAN**
   - Condition: `={{ $json.output.priority }} equals multi_gtn_ean`
   - Target: No connection

7. **Händlerqualität**
   - Condition: `={{ $json.output.priority }} equals Händlerqualität`
   - Target: No connection

---

## 🔴 ERROR HANDLER - ANALYSE

**Anzahl:** 5

### Gemini Error Handler Adult Flags

- **Type:** @n8n/n8n-nodes-langchain.lmChatGoogleGemini
- **Node ID:** a62e627d-e7aa-4978-b777-6e6f3a9b1438
- **Has Inputs:** ❌
- **Warum keine Inputs:** Keine Verbindungen gefunden - möglicherweise nicht verbunden oder fehlende Connections
- **Output Connections:** 0
- **Error Outputs:** 0
- **onError:** none
- **Disabled:** ❌

### Gemini Error Handler Images

- **Type:** @n8n/n8n-nodes-langchain.lmChatGoogleGemini
- **Node ID:** 3d047746-9904-4724-9330-5409910f1b7b
- **Has Inputs:** ❌
- **Warum keine Inputs:** Keine Verbindungen gefunden - möglicherweise nicht verbunden oder fehlende Connections
- **Output Connections:** 0
- **Error Outputs:** 0
- **onError:** none
- **Disabled:** ❌

### Gemini Error Handler Adult Flags1

- **Type:** @n8n/n8n-nodes-langchain.lmChatGoogleGemini
- **Node ID:** fff11989-e610-4ce4-877b-e562ef577b0e
- **Has Inputs:** ❌
- **Warum keine Inputs:** Keine Verbindungen gefunden - möglicherweise nicht verbunden oder fehlende Connections
- **Output Connections:** 0
- **Error Outputs:** 0
- **onError:** none
- **Disabled:** ❌

### Gemini Error Handler Merchant Quality

- **Type:** @n8n/n8n-nodes-langchain.lmChatGoogleGemini
- **Node ID:** ad6c4700-81af-4c46-ad03-f00907fc2715
- **Has Inputs:** ❌
- **Warum keine Inputs:** Keine Verbindungen gefunden - möglicherweise nicht verbunden oder fehlende Connections
- **Output Connections:** 0
- **Error Outputs:** 0
- **onError:** none
- **Disabled:** ❌

### Error Handler_Multi_Country

- **Type:** @n8n/n8n-nodes-langchain.lmChatGoogleGemini
- **Node ID:** eddc6736-cbf9-46e2-89b0-42c6f8f9252a
- **Has Inputs:** ❌
- **Warum keine Inputs:** Keine Verbindungen gefunden - möglicherweise nicht verbunden oder fehlende Connections
- **Output Connections:** 0
- **Error Outputs:** 0
- **onError:** none
- **Disabled:** ❌

---

