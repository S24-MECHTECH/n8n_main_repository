# 📊 MECHTECH WORKFLOW - KOMPLETTER ANALYSE-REPORT

**Workflow:** `***MECHTECH_MERCHANT_CENTER_ADMIN`  
**ID:** `ftZOou7HNgLOwzE5`  
**Gesamt Nodes:** 133  
**Datum:** 2025-12-20

---

## 🔀 ROUTE BY PRIORITY - VOLLSTÄNDIGE ANALYSE

### **Node-Details:**
- **Node ID:** `106ca99d-46c0-481a-943b-6cb0fe0b75be`
- **Type:** `n8n-nodes-base.switch`
- **Type Version:** 3.2
- **Position:** [896, 3632]
- **onError:** `continueErrorOutput`
- **alwaysOutputData:** `true`
- **retryOnFail:** `true`

### **Switch-Regeln (7 Outputs):**

#### **Output 1: Adult Flags**
- **Condition:** `={{ $json.output.priority }}` **equals** `adult_flags`
- **Target Node:** `Prepare Products Loop`
- **Output Key:** `Adult Flags`

#### **Output 2: Images**
- **Condition:** `={{ $json.output.priority }}` **equals** `images`
- **Target Node:** `Prepare Images Loop`
- **Output Key:** `Images`

#### **Output 3: Text**
- **Condition:** `={{ $json.output.priority }}` **equals** `text`
- **Target Node:** `Prepare Text Loop`
- **Output Key:** `Text`

#### **Output 4: Merchant Quality**
- **Condition:** `={{ $json.output.priority }}` **equals** `merchant_quality`
- **Target Node:** `Prepare Merchant Quality Loop`
- **Output Key:** `Merchant Quality`

#### **Output 5: Multi Country**
- **Condition:** `={{ $json.output.priority }}` **equals** `multi_country`
- **Target Node:** `Prepare Multi Country Loop`
- **Output Key:** `Multi Country`

#### **Output 6: Multi GTN/EAN**
- **Condition:** `={{ $json.output.priority }}` **equals** `multi_gtn_ean`
- **Target Node:** `Prepare GTN/EAN_Loop`
- **Output Key:** `Multi GTN/EAN`

#### **Output 7: Händlerqualität**
- **Condition:** `={{ $json.output.priority }}` **equals** `Händlerqualität`
- **Target Node:** `Handle Invalid Priority`
- **Output Key:** `Händlerqualität`

### **Fallback Output:**
- **Fallback Output:** `extra` (wenn keine Bedingung zutrifft)
- **Rename Fallback:** `Fallback`

### **Connection-Status:**
- ✅ **7 Main Outputs** verbunden (in Connections-Sektion gefunden)
  - Output 1 → `Prepare Products Loop`
  - Output 2 → `Prepare Images Loop`
  - Output 3 → `Prepare Text Loop`
  - Output 4 → `Prepare Merchant Quality Loop`
  - Output 5 → `Prepare Multi Country Loop`
  - Output 6 → `Prepare GTN/EAN_Loop`
  - Output 7 → `Handle Invalid Priority`
- ❌ **Keine Error-Verbindung** vorhanden
- ⚠️ **onError:** `continueErrorOutput` (sollte Error-Verbindung haben!)

---

## 🏪 SHOP CONFIGURATION - S24/DDC FLOWS

### **Shop Configuration2 Node:**
- **Type:** `n8n-nodes-base.set`
- **Zweck:** Shop-Konfiguration bereitstellen

### **Shop 1 (S24 FLOW?):**
- **Name:** `Siliconedolls24`
- **ID:** `5339977843`
- **URL:** `www.siliconedolls24.com` (vermutlich)

### **Shop 2 (DDC FLOW?):**
- **Name:** `DreamDoll`
- **ID:** `124485833`
- **URL:** `www.dreamdoll.de` (vermutlich)

### **S24 FLOW Nodes (Shop 1):**
**Hinweis:** S24 FLOW Nodes verwenden `shop1_id` (5339977843) oder "Siliconedolls24"

**Typische Nodes:**
- `Get Merchant Products` (URL mit shop1_id)
- `Update Product Adult Flag` (PATCH mit shop1_id)
- `Update Product Images` (PATCH mit shop1_id)
- `Update Product Text` (PATCH mit shop1_id)
- Alle Nodes die `{{ $('Shop Configuration2').item.json.shop1_id }}` verwenden

### **DDC FLOW Nodes (Shop 2):**
**Hinweis:** DDC FLOW Nodes verwenden `shop2_id` (124485833) oder "DreamDoll"

**Typische Nodes:**
- `Get Merchant Products Shop2` (URL mit shop2_id)
- Nodes die `{{ $('Shop Configuration2').item.json.shop2_id }}` verwenden

### **Analyse-Status:**
⚠️ **S24/DDC sind keine separaten "5-Node-Flows"** - sie sind Shop-Konfigurationen die von verschiedenen Nodes verwendet werden.

Die **5 Nodes** könnten sein:
1. Shop Configuration2
2. Get Merchant Products (Shop 1) / Get Merchant Products Shop2 (Shop 2)
3. Analyze Products / Analyze Products2
4. Gemini Daily Decision
5. Route by Priority

---

## 🔴 ERROR HANDLER - ANALYSE

### **Gefundene Error Handler Nodes:**

#### **1. AI Error Handler**
- **Node ID:** (nicht gefunden in aktueller Suche)
- **Type:** `n8n-nodes-base.code`
- **Position:** (vermutlich bei Route Command)
- **Zweck:** Fehler von Route Command & Format Status Response verarbeiten
- **Inputs:** ❓ (wird über Error-Port verbunden)
- **Output:** → `Retry Queue` → `Expression Repair`

#### **2. Gemini Error Handler Adult Flags**
- **Node ID:** `a62e627d-e7aa-4978-b777-6e6f3a9b1438`
- **Type:** `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
- **Inputs:** ❌ **KEINE** (Problem!)
- **Output:** → `Switch Action Handler Adult Flags`
- **Warum keine Inputs:** Error Handler werden **NUR über Error-Ports** verbunden, nicht über Main-Connections!

#### **3. Gemini Error Handler Images**
- **Node ID:** `3d047746-9904-4724-9330-5409910f1b7b`
- **Type:** `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
- **Inputs:** ❌ **KEINE** (Problem!)
- **Output:** → `Switch Action Handler Images`

#### **4. Gemini Error Handler Text**
- **Type:** `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
- **Inputs:** ❌ **KEINE**
- **Output:** → `Switch Action Handler Text`

#### **5. Gemini Error Handler Merchant Quality**
- **Node ID:** `ad6c4700-81af-4c46-ad03-f00907fc2715`
- **Type:** `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
- **Inputs:** ❌ **KEINE**
- **Output:** → `Switch Action Handler Merchant Quality`

#### **6. Gemini Error Handler Multi Country**
- **Node ID:** (nicht gefunden)
- **Type:** `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
- **Inputs:** ❌ **KEINE**
- **Output:** → `Switch Action Handler Multi Country`

#### **7. Error Handler_Multi_Country**
- **Node ID:** `eddc6736-cbf9-46e2-89b0-42c6f8f9252a`
- **Type:** `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
- **Inputs:** ❌ **KEINE**

#### **8. Gemini Error Handler GTN/EAN**
- **Type:** `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
- **Inputs:** ❌ **KEINE**
- **Output:** → `Switch Action Handler GTN/EAN`

### **WARUM HABEN ERROR HANDLER KEINE INPUTS?**

**Antwort:** Error Handler haben **KEINE Main-Input-Verbindungen**, weil sie **NUR über Error-Ports** verbunden werden!

**So funktioniert es:**
1. Ein Node hat `onError: continueErrorOutput`
2. Bei Fehler: Daten gehen zum **Error-Port** (nicht Main-Port!)
3. Error-Port wird zu Error Handler verbunden
4. Error Handler verarbeitet den Fehler
5. Error Handler gibt Output über **Main-Port** aus

**Das ist KORREKT so!** ⚠️ Aber: Error Handler brauchen **Error-Verbindungen** von den Nodes die Fehler produzieren können!

**Problem:** Viele Nodes haben `onError: continueErrorOutput`, aber **KEINE Error-Verbindung** zu Error Handlers!

---

## 📋 ZUSAMMENFASSUNG DER PROBLEME

### **Route by Priority:**
- ✅ 7 Outputs konfiguriert (nicht 10!)
- ✅ Alle Outputs haben Connections
- ⚠️ **Keine Error-Verbindung** vorhanden (sollte haben!)

### **Error Handler:**
- ❌ **Viele Error Handler haben KEINE Error-Verbindungen** von den Nodes
- ✅ Error Handler haben Outputs (funktionieren wenn aufgerufen)
- ⚠️ **Problem:** Nodes mit `onError: continueErrorOutput` haben keine Error-Verbindungen!

### **S24/DDC Flows:**
- ⚠️ Keine separaten "5-Node-Flows" gefunden
- ✅ Shop Configuration existiert (Shop 1 = Siliconedolls24, Shop 2 = DreamDoll)
- ✅ Nodes verwenden shop1_id oder shop2_id je nach Shop

---

## 🔧 EMPFOHLENE FIXES

1. **Route by Priority:** Error-Verbindung hinzufügen
2. **Error Handler:** Error-Verbindungen von allen Nodes mit `onError: continueErrorOutput` hinzufügen
3. **S24/DDC Flows:** Dokumentation welche Nodes zu welchem Shop gehören

---

**Report Ende**
