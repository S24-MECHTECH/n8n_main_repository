# 🔧 WORKFLOW REPARATUR-PLAN

## ❌ AKTUELLE PROBLEME

### 1. **Update Nodes haben KEINE Input Connections!**

Alle Update Nodes sind **NICHT mit den Prepare Nodes verbunden**:

- ❌ `Prepare Images Loop` → sollte → `Update Product Images` → `Rate Limiting Images`
- ❌ `Prepare Text Loop` → sollte → `Update Product Text` → `Rate Limiting Text`
- ❌ `Prepare Merchant Quality Loop` → sollte → `Update Merchant Settings` → `Rate Limiting Merchant`
- ❌ `Prepare Multi Country Loop` → sollte → `Update Country Feeds` → `Rate Limiting Country`
- ❌ `Prepare GTN/EAN_Loop` → sollte → `Update GTN/EAN` → `Rate Limiting GTN/EAN`

**Aktueller Zustand:**
- ✅ Prepare Chain ist korrekt (Prepare Products → Images → Text → ... → GTN/EAN)
- ❌ ABER: Prepare Images Loop geht NICHT zu Update Product Images
- ❌ Stattdessen: Prepare GTN/EAN_Loop geht direkt zu "Rate Limiting" (ohne Update!)

### 2. **Update Product Adult Flag**

- ❌ Hat KEINE Input Connection
- ❌ Kommt NICHT von Prepare Products Loop
- ❌ Sollte vermutlich nach "Prepare Products Loop" kommen?

### 3. **Credential-Type Fehler (rotes Dreieck)**

Mehrere Update Nodes haben falsche Credential-Type:
- ❌ `Update Product Images`: `googleApi` → sollte `googleOAuth2Api`
- ❌ `Update Product Text`: `googleApi` → sollte `googleOAuth2Api`
- ❌ `Update Merchant Settings`: `googleApi` → sollte `googleOAuth2Api`
- ❌ `Update Country Feeds`: `googleApi` → sollte `googleOAuth2Api`
- ❌ `Update GTN/EAN`: `googleApi` → sollte `googleOAuth2Api`

---

## ✅ KORREKTE LOGIK (Vermutung)

Die Logik sollte vermutlich so sein:

```
Prepare Products Loop
  ↓
Update Product Adult Flag? (oder direkt zu Prepare Images?)
  ↓
Prepare Images Loop
  ↓
Update Product Images
  ↓
Rate Limiting Images
  ↓
Prepare Text Loop
  ↓
Update Product Text
  ↓
Rate Limiting Text
  ↓
Prepare Merchant Quality Loop
  ↓
Update Merchant Settings
  ↓
Rate Limiting Merchant
  ↓
Prepare Multi Country Loop
  ↓
Update Country Feeds
  ↓
Rate Limiting Country
  ↓
Prepare GTN/EAN_Loop
  ↓
Update GTN/EAN
  ↓
Rate Limiting GTN/EAN
  ↓
Aggregate Results2 (oder weiter...)
```

**ODER:** Sollten Prepare und Update parallel laufen (jedes Item durch Prepare → dann durch Update)?

---

## 🤔 FRAGEN BEVOR REPARATUR

1. **Wo soll "Update Product Adult Flag" in die Kette?**
   - Nach "Prepare Products Loop"?
   - Oder ist das ein separater Pfad?

2. **Sollte die Kette sein:**
   - **Variante A:** Prepare → Update → Rate Limiting → Prepare → Update → Rate Limiting ... (sequenziell)
   - **Variante B:** Alle Prepare Nodes durchlaufen, DANN alle Update Nodes?

3. **Wo soll die Kette enden?**
   - Nach "Rate Limiting GTN/EAN" → zu "Aggregate Results2"?
   - Oder zu einem anderen Node?

---

## 📋 REPARATUR-PLAN (NACH IHRER BESTÄTIGUNG)

### Schritt 1: Connections wiederherstellen
- Prepare Images Loop → Update Product Images
- Prepare Text Loop → Update Product Text
- Prepare Merchant Quality Loop → Update Merchant Settings
- Prepare Multi Country Loop → Update Country Feeds
- Prepare GTN/EAN_Loop → Update GTN/EAN

### Schritt 2: Rate Limiting Nodes richtig verbinden
- Update Product Images → Rate Limiting Images → Prepare Text Loop (oder weiter?)
- Update Product Text → Rate Limiting Text → Prepare Merchant Quality Loop
- etc.

### Schritt 3: Credential-Types korrigieren
- Alle Update Nodes: `googleApi` → `googleOAuth2Api`

### Schritt 4: Update Product Adult Flag Position klären

---

## ⚠️ WICHTIG

**Ich führe NICHTS aus ohne Ihr OK!**

Bitte bestätigen Sie:
1. Soll die Kette so sein: Prepare → Update → Rate Limiting → Nächster Prepare?
2. Wo soll "Update Product Adult Flag" hin?
3. Wo soll die Kette enden (nach welchem Node)?

**Dann erstelle ich die Korrekturen!**
