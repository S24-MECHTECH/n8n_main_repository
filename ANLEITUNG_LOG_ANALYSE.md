# 🔍 WORKFLOW LOG-ANALYSE - ANLEITUNG

## ✅ STATUS
- Debug-Logging ist **aktiviert** im Node "Format Status Response"
- Analyse-Script ist **bereit**

---

## 📋 SCHRITT 1: WORKFLOW AUSFÜHREN

### Option A: Manuell in n8n UI
1. Öffnen Sie: `https://n8n.srv1091615.hstgr.cloud`
2. Gehen Sie zum Workflow: `***MECHTECH_MERCHANT_CENTER_ADMIN`
3. Klicken Sie auf **"Execute Workflow"** (Test-Modus)
4. Warten Sie auf Completion

### Option B: Via Webhook (falls verfügbar)
```powershell
$uri = "https://n8n.srv1091615.hstgr.cloud/webhook/03758724-2fd2-4cf0-bc96-1ba04b9fa35c"
$body = @{} | ConvertTo-Json
Invoke-RestMethod -Uri $uri -Method Post -ContentType "application/json" -Body $body
```

---

## 📊 SCHRITT 2: LOGS ANALYSIEREN

### Option A: Automatisch (neueste Execution)
```powershell
cd C:\Users\Andree\n8n_main_repository
node scripts\analyze-execution-logs.js
```

### Option B: Mit spezifischer Execution ID
```powershell
cd C:\Users\Andree\n8n_main_repository
node scripts\analyze-execution-logs.js <execution-id>
```

---

## 🔍 WAS WIRD ANALYSIERT

Das Script zeigt:
1. **Input Data**: Was kommt in den "Format Status Response" Node hinein
2. **Output Data**: Was geht hinaus
3. **Debug Logs**: Console.log Output (falls verfügbar)
4. **Execution Info**: Zeitstempel, Dauer, etc.
5. **Errors**: Falls vorhanden

---

## 📝 DEBUG-LOGS DIE WIR SEHEN WOLLEN

Im Node "Format Status Response" sind folgende Console-Logs aktiv:

```javascript
console.log('=== Format Status Response ===');
console.log('Input:', JSON.stringify($input.item.json, null, 2));
console.log('Response:', response);
console.log('Is Array?', Array.isArray(response));
console.log('Decisions:', decisions);
console.log('Decisions count:', decisions.length);
console.log('Output:', responseText);
console.log('=== END ===');
```

**Diese Logs erscheinen in:**
- n8n Execution-Logs (UI → Executions → Execution Details → Node Logs)
- Oder im Execution-Output, wenn verfügbar

---

## ⚠️ FALLS API KEY PROBLEM

Falls das Script einen 401 Error zeigt:

1. Prüfen Sie, ob API Key-Dateien existieren:
   - `d:\MAMP\N8N-PROJEKT_INFOS\000_Hostinger(DE-und_EN)\n8n_Admin\n8n_Admin_token_12_12_25.txt`
   - `d:\MAMP\N8N-PROJEKT_INFOS\MCP_SERVER_ALL\n8n_API_CLAUDE_CONTROLL.txt`

2. Prüfen Sie, ob der API Key folgende Scopes hat:
   - `workflow:read`
   - `execution:read`
   - `execution:list`

3. Alternative: Logs manuell in n8n UI prüfen:
   - Executions → Neueste Execution öffnen
   - Node "Format Status Response" öffnen
   - "Logs" Tab prüfen

---

## ✅ NÄCHSTE SCHRITTE NACH ANALYSE

Nach der Log-Analyse können wir:
1. Input-Format verstehen
2. Problem identifizieren (falls vorhanden)
3. Fix implementieren
4. Erneut testen
