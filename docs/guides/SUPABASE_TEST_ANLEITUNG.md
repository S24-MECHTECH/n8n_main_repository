# 🧪 SUPABASE TEST-ANLEITUNG

## ❌ PROBLEM: "a.ok(from)" Fehler

**Fehler:** `The expression evaluated to a falsy value: a.ok(from)`

**Ursache:** Expression in URL ergibt undefined/null → n8n kann Expression nicht evaluieren

---

## ✅ KORREKTUR DURCHGEFÜHRT

**Get Workflow Status REAL Node wurde korrigiert:**
- ✅ URL vereinfacht (ohne `workflow_id` Expression)
- ✅ Method: GET
- ✅ Body entfernt
- ✅ Headers: Nur Prefer
- ✅ Authentication: Supabase API Credential

**Neue URL:**
```
https://mxswxdnnjhhukovixzvb.supabase.co/rest/v1/workflow_status?select=*&order=created_at.desc&limit=100
```

---

## 🧪 SUPABASE VERBINDUNG TESTEN

### **Schritt 1: Supabase API Key finden**

1. Gehen Sie zu: https://supabase.com/dashboard
2. Wählen Sie Ihr Projekt: `mxswxdnnjhhukovixzvb`
3. Gehen Sie zu: **Settings → API**
4. Kopieren Sie den **`anon` Key** oder **`service_role` Key**

### **Schritt 2: Test-Script ausführen**

```bash
node test-supabase-connection.js YOUR_SUPABASE_API_KEY
```

**Das Script testet:**
- ✅ GET Request (letzte 5 Einträge)
- ✅ POST Request (Test-Eintrag einfügen)
- ✅ URL-Format (wie in n8n verwendet)

### **Schritt 3: Prüfen ob Daten in Supabase sind**

**Option A: Über Supabase Dashboard**
1. Gehen Sie zu: https://supabase.com/dashboard/project/mxswxdnnjhhukovixzvb
2. Klicken Sie auf: **Table Editor**
3. Wählen Sie Tabelle: `workflow_status`
4. Prüfen Sie ob Einträge vorhanden sind

**Option B: Über SQL Editor**
1. Gehen Sie zu: **SQL Editor**
2. Führen Sie aus:
```sql
SELECT * FROM workflow_status 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔍 FEHLER-DIAGNOSE

### **Fehler: "401 Unauthorized"**
**Ursache:** API Key ist falsch oder fehlt

**Lösung:**
1. Prüfen Sie den API Key in n8n Credentials
2. Prüfen Sie ob der API Key in Supabase noch gültig ist
3. Erneuern Sie den API Key falls nötig

### **Fehler: "404 Not Found"**
**Ursache:** Tabelle `workflow_status` existiert nicht

**Lösung:**
1. Prüfen Sie ob die Tabelle in Supabase existiert
2. Prüfen Sie den Tabellennamen (Groß-/Kleinschreibung)
3. Erstellen Sie die Tabelle falls nötig

### **Fehler: "400 Bad Request"**
**Ursache:** Falsche Query-Parameter oder Tabellen-Struktur

**Lösung:**
1. Prüfen Sie die Query-Parameter-Syntax
2. Prüfen Sie ob die Spalten existieren
3. Prüfen Sie RLS (Row Level Security) Settings

### **Fehler: "The expression evaluated to a falsy value: a.ok(from)"**
**Ursache:** Expression in URL ergibt undefined

**Lösung:** ✅ **BEREITS BEHOBEN**
- URL wurde vereinfacht
- Keine problematischen Expressions mehr

---

## 📋 SUPABASE TABELLE PRÜFEN

### **Erwartete Tabellen-Struktur:**

```sql
CREATE TABLE workflow_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT,
  status TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Prüfen ob Tabelle existiert:**

```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'workflow_status';
```

### **Prüfen Tabellen-Struktur:**

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workflow_status';
```

---

## 🔗 SUPABASE URL FORMAT

**Korrektes Format:**
```
https://PROJECT-ID.supabase.co/rest/v1/TABLE_NAME?select=*&FILTER&ORDER&LIMIT
```

**Beispiele:**
```
# Alle Einträge (limit 100)
https://mxswxdnnjhhukovixzvb.supabase.co/rest/v1/workflow_status?select=*&order=created_at.desc&limit=100

# Mit Filter (workflow_id)
https://mxswxdnnjhhukovixzvb.supabase.co/rest/v1/workflow_status?select=*&workflow_id=eq.ftZOou7HNgLOwzE5&order=created_at.desc&limit=100
```

**Wichtig:**
- `select=*` - wählt alle Spalten
- `workflow_id=eq.VALUE` - Filter (eq = equals)
- `order=created_at.desc` - Sortierung
- `limit=100` - Max. Einträge

---

## 🔐 SUPABASE CREDENTIALS IN N8N

### **Credential Type:** `Supabase API`

**Benötigte Felder:**
- **Supabase URL:** `https://mxswxdnnjhhukovixzvb.supabase.co`
- **Service Role Key:** (Ihr Supabase API Key)

**Wichtig:**
- Der API Key wird automatisch als Header hinzugefügt
- `apikey` Header und `Authorization: Bearer` werden automatisch gesetzt
- Sie müssen diese NICHT manuell in Headers setzen!

---

## ✅ WORKFLOW TESTEN

**Nach der Korrektur:**

1. **Führen Sie den Workflow aus**
2. **Prüfen Sie den "Get Workflow Status REAL" Node:**
   - Sollte jetzt ohne Fehler laufen
   - Sollte Daten von Supabase zurückgeben

3. **Falls weiterhin Fehler:**
   - Prüfen Sie Supabase Credentials in n8n
   - Testen Sie Supabase direkt mit dem Test-Script
   - Prüfen Sie ob die Tabelle existiert

---

## 🧪 TEST-SCRIPT VERWENDEN

```bash
# Test Supabase Connection
node test-supabase-connection.js YOUR_SUPABASE_API_KEY
```

**Das Script testet:**
1. ✅ GET Request (liest Daten)
2. ✅ POST Request (schreibt Test-Daten)
3. ✅ URL-Format (prüft verschiedene Formate)

**Erwartete Ausgabe:**
```
✅ Status: 200 OK
✅ Daten erhalten: 5 Einträge
✅ Daten eingefügt: {...}
```

---

**Erstellt:** 2025-01-17  
**Problem:** Expression Error "a.ok(from)"  
**Lösung:** URL vereinfacht, Expressions entfernt  
**Status:** ✅ Korrigiert
