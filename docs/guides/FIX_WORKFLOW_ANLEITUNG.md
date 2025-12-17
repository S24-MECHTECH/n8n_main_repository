# 🔧 WORKFLOW-KORREKTUREN - Anleitung

**Ziel:** Alle Artikel werden von Google genehmigt (Adult Flags)

---

## 🚀 SCHNELLSTART

### **Schritt 1: n8n API Key holen**

1. Öffnen Sie n8n: `https://n8n.srv1091615.hstgr.cloud`
2. Gehen Sie zu: **Settings → API**
3. Erstellen Sie einen neuen API Key (oder nutzen Sie einen existierenden)
4. Kopieren Sie den API Key

### **Schritt 2: Script ausführen**

```powershell
# Windows PowerShell
node fix-merchant-workflow-adult-flags.js YOUR_API_KEY_HIER
```

**Beispiel:**
```powershell
node fix-merchant-workflow-adult-flags.js abc123xyz789
```

### **Schritt 3: Erfolg prüfen**

Das Script zeigt:
```
✅ Workflow erfolgreich aktualisiert!
📊 ZUSAMMENFASSUNG:
   Korrekturen: X
```

---

## 📋 WAS WIRD KORRIGIERT

### **1. Shop Configuration2**
- ✅ `shop1_url` hinzugefügt: `"www.siliconedolls24.com"`
- ✅ `shop2_url` hinzugefügt: `"www.dreamdoll.de"`
- ✅ `sheet_id` als Alias für `google_sheet_id`

### **2. Prepare Products Loop**
- ✅ Products werden von `Analyze Products2` geholt (nicht von Gemini Output)
- ✅ Gemini Decision Output wird korrekt verarbeitet
- ✅ Shop URLs werden aus Config verwendet

### **3. Update Product Adult Flag**
- ✅ URL: `shop1_id` → `shop_id` (dynamisch)
- ✅ URL: `product.id` → `product_id`

### **4. Update Product Images** (für später)
- ✅ URL korrigiert
- ✅ Body Parameter: `product.imageLink` → `image_link`

### **5. Update Product Text** (für später)
- ✅ URL korrigiert
- ✅ Body Parameter: `product.title` → `title`
- ✅ Body Parameter: `product.description` → `description`

### **6. Log to Shop Sheet**
- ✅ Sheet ID Referenz korrigiert

---

## ✅ TEST-CHECKLISTE

Nach dem Fix testen:

1. [ ] Workflow manuell ausführen (Manual Trigger)
2. [ ] Prüfen ob `Prepare Products Loop` Products findet
3. [ ] Prüfen ob `Update Product Adult Flag` korrekte URL verwendet
4. [ ] Prüfen ob Product IDs korrekt sind
5. [ ] Prüfen ob Shop IDs dynamisch sind
6. [ ] Prüfen ob Logging funktioniert
7. [ ] Prüfen ob Google API Calls erfolgreich sind
8. [ ] Prüfen ob Adult Flags gesetzt werden

---

## 🎯 ERWARTETES VERHALTEN

Nach den Korrekturen sollte der Workflow:

1. ✅ Alle Produkte ohne Adult Flag finden
2. ✅ Adult Flag (`adult: true`, `ageGroup: "adult"`, `googleProductCategory: "778"`) setzen
3. ✅ Shop 1 UND Shop 2 unterstützen
4. ✅ Korrekte Product IDs verwenden
5. ✅ Erfolgreich zu Google Sheets loggen

---

## ⚠️ WICHTIGE HINWEISE

- **Bilder-Optimierung ist zweitrangig** (wird auch korrigiert, aber nicht getestet)
- **Text-Optimierung ist zweitrangig** (wird auch korrigiert, aber nicht getestet)
- **Hauptziel:** Alle Artikel werden von Google genehmigt durch korrekte Adult Flags

---

**Erstellt:** 2025-01-13
