# 🧪 TEST ANLEITUNG: Switch Error Handler mit 5 Artikeln

## ✅ VORBEREITUNG

1. **Browser öffnen:** https://n8n.srv1091615.hstgr.cloud
2. **Workflow öffnen:** `***MECHTECH_MERCHANT_CENTER_ADMIN`
3. **Test-Daten vorbereiten:** Stelle sicher dass nur 5 Artikel verarbeitet werden

---

## 🔍 STRUKTUR-PRÜFUNG

### Switch Nodes prüfen:
- ✅ 6 Switch Nodes vorhanden (Adult, Images, Text, Quality, Country, GTN/EAN)
- ✅ Jeder Switch hat 4 Outputs: RETRY, REROUTE, SKIP, ALERT
- ✅ Connections sind sichtbar

### Connections prüfen:
- ✅ Update Node → Error Handler Switch (Input)
- ✅ Switch Output 0 (RETRY) → Rate Limiting
- ✅ Switch Output 1 (REROUTE) → Handle Invalid Priority
- ✅ Switch Output 2 (SKIP) → Log Results
- ✅ Switch Output 3 (ALERT) → Log Results

---

## 🧪 TEST-SZENARIEN

### Test 1: HTTP 429 (Rate Limit)
**Erwartung:**
- Error Handler erkennt 429
- Route zu RETRY Output
- Weiter zu Rate Limiting
- Delay wird angewendet
- Retry des Update-Versuchs

### Test 2: HTTP 400 (Bad Request)
**Erwartung:**
- Error Handler erkennt 400
- Route zu REROUTE Output
- Weiter zu Handle Invalid Priority
- Item wird als invalid markiert

### Test 3: HTTP 500 (Server Error)
**Erwartung:**
- Error Handler erkennt 500
- Route zu SKIP Output
- Weiter zu Log Results
- Item wird übersprungen und geloggt

### Test 4: Andere Fehler (z.B. 404)
**Erwartung:**
- Error Handler erkennt unbekannten Code
- Route zu ALERT Output (Fallback)
- Weiter zu Log Results
- Fehler wird geloggt

---

## 📋 TEST-DURCHFÜHRUNG

### Schritt 1: Test-Modus
1. Klicke auf "Execute Workflow" (Test-Modus)
2. Beobachte die Execution
3. Prüfe ob alle 5 Artikel verarbeitet werden

### Schritt 2: Execution Logs prüfen
1. Öffne "Executions" Tab
2. Prüfe die letzte Execution
3. Prüfe ob Error Handler getriggert wurden
4. Prüfe ob richtige Outputs verwendet wurden

### Schritt 3: Log Results prüfen
1. Prüfe "Log Results to Sheets"
2. Prüfe ob Fehler korrekt geloggt wurden
3. Prüfe ob Error Codes korrekt erkannt wurden

---

## ✅ ERFOLGS-KRITERIEN

- ✅ Alle 5 Artikel werden verarbeitet
- ✅ Error Handler reagieren auf Fehler-Codes
- ✅ Richtige Outputs werden verwendet
- ✅ Connections funktionieren korrekt
- ✅ Logging funktioniert

---

**Status:** Bereit für Testing! 🚀
