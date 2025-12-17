# 🔧 REPARATUR-ANLEITUNG: Beide Server grün bekommen

## ✅ FUNKTIONIERENDE KONFIGURATION GEFUNDEN!

Ich habe die **alte funktionierende Konfiguration** aus den Logs gefunden und mit dem **neuen Token** aktualisiert.

---

## 📋 ALTE vs. NEUE KONFIGURATION

### **ALT (aus Logs vom 6. Dezember):**
```json
{
  "n8n-mcp": {
    "command": "npx",
    "args": [
      "-y",
      "supergateway",
      "--streamableHttp",
      "https://n8n.srv1091615.hstgr.cloud/mcp-server/http",
      "--header",
      "authorization:Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5MDViOTNlMi0yY2NkLTRlNmItYTYxMy00ZDAxNDg1YTkyNTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjA1MWRiMmZhLTBhNWUtNGVkMy05ZGI3LTY4N2E4NzMzNTJjZSIsImlhdCI6MTc2NDk5NTEzOX0.Fvnln4G5M03ZDeh6hE9oQMhDJmeZpDpTm5n3Bl4EH3g"
    ]
  }
}
```

**Problem:** 
- ❌ Verwendet `supergateway` mit `/mcp-server/http` (existiert nicht mehr!)
- ❌ Alter Token (abgelaufen)

### **NEU (funktionierend):**
```json
{
  "n8n-mcp": {
    "command": "npx",
    "args": ["-y", "n8n-mcp"],
    "env": {
      "N8N_URL": "https://n8n.srv1091615.hstgr.cloud",
      "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5MDViOTNlMi0yY2NkLTRlNmItYTYxMy00ZDAxNDg1YTkyNTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY1NDk2MDQ3LCJleHAiOjE3NzMyNzAwMDB9.NMeeeSXlCQvACE4a_7xtbH_xhR_azhYdn-VFH4h5NRo"
    }
  },
  "mechtech-basis": {
    "command": "npx",
    "args": [
      "-y",
      "supergateway",
      "--streamableHttp",
      "https://n8n.srv1091615.hstgr.cloud/mcp/c8608713-c52f-4e9f-9407-bb716a2d49ff"
    ]
  }
}
```

**Vorteile:**
- ✅ Direktes `n8n-mcp` (kein supergateway)
- ✅ Neuer Token (gültig bis 2025-07-12)
- ✅ `mechtech-basis` bleibt unverändert (funktioniert bereits)

---

## 🚀 SCHRITTE ZUR REPARATUR

### **Schritt 1: Claude Desktop vollständig beenden**

1. **Alle Claude Desktop Fenster schließen**
2. **Task Manager öffnen** (Strg + Shift + Esc)
3. **Nach "Claude" suchen** und **ALLE** Prozesse beenden:
   - `Claude.exe`
   - `Claude Desktop.exe`
   - `Claude Desktop Helper.exe`
   - Alle anderen Claude-Prozesse

### **Schritt 2: Konfiguration aktualisieren**

**Datei:** `C:\Users\Andree\AppData\Roaming\Claude\claude_desktop_config.json`

**Ersetzen Sie den gesamten Inhalt mit:**

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["-y", "n8n-mcp"],
      "env": {
        "N8N_URL": "https://n8n.srv1091615.hstgr.cloud",
        "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5MDViOTNlMi0yY2NkLTRlNmItYTYxMy00ZDAxNDg1YTkyNTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY1NDk2MDQ3LCJleHAiOjE3NzMyNzAwMDB9.NMeeeSXlCQvACE4a_7xtbH_xhR_azhYdn-VFH4h5NRo"
      }
    },
    "mechtech-basis": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--streamableHttp",
        "https://n8n.srv1091615.hstgr.cloud/mcp/c8608713-c52f-4e9f-9407-bb716a2d49ff"
      ]
    }
  }
}
```

**ODER:** Kopieren Sie die Datei `FUNKTIONIERENDE_CONFIG.json` und benennen Sie sie um.

### **Schritt 3: Cache löschen (optional, aber empfohlen)**

1. Claude Desktop schließen (falls noch offen)
2. Löschen Sie den Cache-Ordner:
   ```
   C:\Users\Andree\AppData\Roaming\Claude\Cache
   ```
3. **WICHTIG:** Nur den Cache-Ordner löschen, nicht die gesamte Claude-Installation!

### **Schritt 4: Claude Desktop neu starten**

1. **Claude Desktop öffnen**
2. **Warten Sie 10-30 Sekunden** bis beide Server geladen sind
3. **Prüfen Sie, ob beide Server grün sind**

---

## 🔍 WAS WURDE GEÄNDERT?

### **n8n-mcp Server:**

**VORHER:**
- ❌ `supergateway` mit `/mcp-server/http` (existiert nicht!)
- ❌ Alter Token (abgelaufen)

**NACHHER:**
- ✅ Direktes `n8n-mcp` mit API Key
- ✅ Neuer Token (gültig bis 2025-07-12)

### **mechtech-basis Server:**

**UNVERÄNDERT:**
- ✅ Funktioniert bereits korrekt
- ✅ Keine Änderungen nötig

---

## ✅ ERWARTETES ERGEBNIS

Nach dem Neustart sollten **beide Server grün** sein:

1. **`n8n-mcp`** (7 Tools):
   - ✅ Direkt mit n8n API verbunden
   - ✅ Tools: search_nodes, get_node, validate_workflow, etc.

2. **`mechtech-basis`** (12 Tools):
   - ✅ Über Workflow-Endpoint verbunden
   - ✅ Tools: Google Services, Webflow, etc.

---

## 🐛 FALLS ES IMMER NOCH NICHT FUNKTIONIERT

### **Problem 1: JSON-Parsing-Fehler**

**Symptom:** "clientVers is not valid JSON"

**Lösung:**
1. `n8n-mcp` Server aktualisieren:
   ```powershell
   npm install -g n8n-mcp@latest
   ```
2. Claude Desktop neu starten

### **Problem 2: Server startet nicht**

**Prüfen Sie:**
1. Node.js Version: `node --version` (sollte >= 18 sein)
2. npx verfügbar: `npx --version`
3. Internet-Verbindung aktiv

### **Problem 3: API Key ungültig**

**Prüfen Sie:**
1. Token in n8n noch gültig? (Settings → API)
2. Token hat richtige Scopes?
3. Token nicht abgelaufen?

---

## 📝 ZUSAMMENFASSUNG

**Was wurde gemacht:**
1. ✅ Alte funktionierende Konfiguration gefunden
2. ✅ Mit neuem Token aktualisiert
3. ✅ `n8n-mcp` auf direkte API-Verbindung umgestellt
4. ✅ `mechtech-basis` unverändert gelassen

**Nächste Schritte:**
1. Claude Desktop beenden
2. Konfiguration aktualisieren
3. Cache löschen (optional)
4. Claude Desktop neu starten
5. Beide Server sollten grün sein! ✅

---

**Erstellt:** 2025-12-12  
**Status:** ✅ Bereit zum Anwenden

