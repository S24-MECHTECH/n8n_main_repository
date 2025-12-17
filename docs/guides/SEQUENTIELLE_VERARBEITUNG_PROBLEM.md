# 🔍 PROBLEM: Sequenzielle Verarbeitung funktioniert nicht

## ❌ DAS PROBLEM

**Alle Prepare-Nodes geben Arrays zurück** (z.B. mit `.map()`)  
→ **n8n verarbeitet Arrays PARALLEL, nicht sequenziell!**

### Beispiel:
```
Prepare Products Loop gibt 10 Items zurück:
  → Alle 10 Items gehen PARALLEL zu Prepare Images Loop
  → Alle 10 Items gehen PARALLEL zu Prepare Text Loop
  → etc.

GEWÜNSCHT:
  Artikel 1 → Prepare Images → Prepare Text → ... → Rate Limiting
  Artikel 2 → Prepare Images → Prepare Text → ... → Rate Limiting
  Artikel 3 → Prepare Images → Prepare Text → ... → Rate Limiting
  etc. (sequenziell!)
```

---

## ✅ DIE LÖSUNG

**Jeder Prepare-Node muss EIN Item verarbeiten und EIN Item zurückgeben**  
→ n8n verarbeitet dann automatisch sequenziell!

### Code-Beispiel:

**❌ FALSCH (gibt Array zurück):**
```javascript
const items = $input.all();
return items.map(item => ({
  json: {
    ...item.json,
    processed: true
  }
}));
```

**✅ RICHTIG (gibt EIN Item zurück):**
```javascript
const inputItem = $input.first().json;
return {
  json: {
    ...inputItem,
    processed: true,
    image_processed: true
  }
};
```

---

## 🔧 KORREKTUR DURCHFÜHREN

### Option 1: Automatisch (Basis-Template)

```bash
node fix-prepare-nodes-sequential.js YOUR_API_KEY
```

**⚠️ WICHTIG:**  
Dieses Script generiert Basis-Templates. Sie müssen die **spezifische Logik jedes Nodes manuell anpassen**!

### Option 2: Manuell korrigieren

Für jeden Prepare-Node (außer "Prepare Products Loop"):

1. **Öffnen Sie den Node** in n8n
2. **Ändern Sie den Code:**
   - Entfernen Sie `.map()` und Array-Rückgabe
   - Nutzen Sie `$input.first().json` für EIN Item
   - Geben Sie EIN Item zurück: `return { json: {...} }`

3. **Behalten Sie die spezifische Logik bei:**
   - Shop-Konfiguration lesen
   - Product-Daten verarbeiten
   - Spezifische Felder hinzufügen

---

## 📋 PREPARE-NODES ZU KORRIGIEREN

1. ✅ **Prepare Products Loop** → **AUSGENOMMEN** (sollte Array zurückgeben)
2. ❌ **Prepare Images Loop** → Korrigieren (EIN Item)
3. ❌ **Prepare Text Loop** → Korrigieren (EIN Item)
4. ❌ **Prepare Merchant Quality Loop** → Korrigieren (EIN Item)
5. ❌ **Prepare Multi Country Loop** → Korrigieren (EIN Item)
6. ❌ **Prepare GTN/EAN_Loop** → Korrigieren (EIN Item)

---

## 🎯 ERGEBNIS NACH KORREKTUR

Nach der Korrektur wird n8n automatisch:

```
Artikel 1:
  Prepare Products Loop (Array) → alle Items starten
  ↓
  Artikel 1 → Prepare Images Loop (EIN Item) ✅
  ↓
  Artikel 1 → Prepare Text Loop (EIN Item) ✅
  ↓
  Artikel 1 → Prepare Merchant Quality Loop (EIN Item) ✅
  ↓
  Artikel 1 → Prepare Multi Country Loop (EIN Item) ✅
  ↓
  Artikel 1 → Prepare GTN/EAN_Loop (EIN Item) ✅
  ↓
  Artikel 1 → Rate Limiting ✅

Artikel 2:
  Artikel 2 → Prepare Images Loop (EIN Item) ✅
  ↓
  Artikel 2 → Prepare Text Loop (EIN Item) ✅
  ↓
  ... (sequenziell!)
```

---

## 🚀 GITHUB REPOSITORY SETUP

### Repository erstellen:

```powershell
.\setup-github-repo.ps1
```

**Oder manuell:**

```bash
# 1. Git Repository initialisieren
git init

# 2. Dateien hinzufügen
git add .

# 3. Erster Commit
git commit -m "Initial commit: MECHTECH n8n Workflow Scripts"

# 4. GitHub Repository erstellen (manuell auf github.com/new)
# 5. Remote hinzufügen
git remote add origin https://github.com/IHR-USERNAME/mechtech-n8n-workflows.git

# 6. Branch benennen und pushen
git branch -M main
git push -u origin main
```

---

## 📊 WORKFLOW-STRUKTUR (KORREKT)

```
Analyze Products2 / Route by Priority
   ↓
Prepare Products Loop
   → Gibt Array zurück (alle Items starten)
   ↓
Prepare Images Loop
   → Verarbeitet EIN Item (sequenziell) ✅
   ↓
Prepare Text Loop
   → Verarbeitet EIN Item (sequenziell) ✅
   ↓
Prepare Merchant Quality Loop
   → Verarbeitet EIN Item (sequenziell) ✅
   ↓
Prepare Multi Country Loop
   → Verarbeitet EIN Item (sequenziell) ✅
   ↓
Prepare GTN/EAN_Loop
   → Verarbeitet EIN Item (sequenziell) ✅
   ↓
Rate Limiting
```

---

## ⚠️ WICHTIGE HINWEISE

1. **Prepare Products Loop:** Dieser Node **SOLLTE** ein Array zurückgeben, um alle Items zu starten
2. **Alle anderen Prepare-Nodes:** Müssen **EIN Item** zurückgeben für sequenzielle Verarbeitung
3. **Code-Anpassung:** Die generierten Templates sind Basis-Vorlagen - spezifische Logik muss beibehalten werden
4. **Testen:** Nach Korrekturen den Workflow testen, um sicherzustellen dass Items sequenziell verarbeitet werden

---

**Erstellt:** 2025-01-17  
**Workflow:** `***MECHTECH_MERCHANT_CENTER_ADMIN`  
**Problem:** Parallel-Verarbeitung statt sequenzieller Verarbeitung  
**Lösung:** Einzelne Items statt Arrays zurückgeben

