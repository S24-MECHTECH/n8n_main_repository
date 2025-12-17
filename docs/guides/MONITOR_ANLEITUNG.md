# 🧪 WORKFLOW TEST MONITOR - Anleitung

**Zweck:** Überwacht Workflow-Executionen und reagiert dynamisch auf Fehler

---

## 🚀 SCHNELLSTART

### **Option 1: Automatisch (Empfohlen)**

1. **Starten Sie den Workflow manuell in n8n:**
   - Öffnen Sie: `https://n8n.srv1091615.hstgr.cloud`
   - Gehen Sie zum Workflow: `***MECHTECH_MERCHANT_CENTER_ADMIN`
   - Klicken Sie auf **"Execute Workflow"**

2. **Starten Sie den Monitor:**
   ```powershell
   node test-workflow-monitor.js YOUR_API_KEY
   ```

   Der Monitor wartet automatisch auf die neue Execution und überwacht sie.

---

### **Option 2: Mit Execution ID**

Wenn Sie bereits eine Execution ID haben:

```powershell
node test-workflow-monitor.js YOUR_API_KEY EXECUTION_ID
```

**Beispiel:**
```powershell
node test-workflow-monitor.js abc123 749
```

---

## 📊 WAS DER MONITOR MACHT

### **1. Überwachung**
- ✅ Prüft Execution-Status alle Sekunde
- ✅ Erkennt Fehler in Nodes
- ✅ Erkennt Warnungen (leere Outputs, etc.)

### **2. Diagnose**
- ✅ Analysiert Fehler automatisch
- ✅ Identifiziert Problem-Node
- ✅ Gibt Lösungsvorschläge

### **3. Dynamische Reaktion**
- ✅ Gruppiert Fehler nach Node
- ✅ Priorisiert nach Severity
- ✅ Gibt konkrete Fix-Anweisungen

---

## 🔍 ERKANNTE FEHLER-TYPEN

### **Prepare Products Loop**
- ❌ Kann nicht auf `Analyze Products2` zugreifen
- ❌ Shop URLs fehlen
- ❌ Products Array leer

### **Update Product Adult Flag**
- ❌ 404 - Product ID nicht gefunden
- ❌ 401 - Authentifizierung fehlgeschlagen
- ❌ Shop ID falsch

### **Get Merchant Products2**
- ❌ 404 - Merchant API URL falsch
- ❌ Merchant ID falsch

### **Analyze Products2**
- ❌ Response-Format falsch
- ❌ Keine Products gefunden

---

## 📋 AUSGABE

Der Monitor zeigt:

```
🔴 Node: Update Product Adult Flag (1 Fehler)
   Fehler: 404 Not Found
   └─ [CRITICAL] Product ID nicht gefunden oder falsche URL
      Lösung: Prüfe ob product_id korrekt übergeben wird
      Fix: URL sollte {{ $json.product_id }} verwenden
```

---

## ✅ NACH DEM TEST

Nach der Überwachung erhalten Sie:

1. **Zusammenfassung:**
   - Anzahl Fehler
   - Anzahl Warnungen
   - Status (Erfolgreich/Fehlgeschlagen)

2. **Detaillierte Diagnose:**
   - Welche Nodes Fehler haben
   - Was die Fehler sind
   - Wie sie behoben werden können

3. **Nächste Schritte:**
   - Automatische Fix-Vorschläge
   - Option zur automatischen Korrektur

---

## 🔧 AUTOMATISCHE FIXES

Der Monitor kann automatisch:
- ❌ Noch nicht implementiert (kann erweitert werden)

**Zukünftige Features:**
- Automatische Korrektur von häufig auftretenden Fehlern
- Auto-Retry bei temporären Fehlern
- Erweiterte Diagnose mit Workflow-Kontext

---

**Erstellt:** 2025-01-13
