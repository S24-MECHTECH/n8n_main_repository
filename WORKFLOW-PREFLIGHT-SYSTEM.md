# 🎯 WORKFLOW PRE-FLIGHT CHECK SYSTEM

**Timestamp:** 2025-12-19T05:20:00Z
**Priority:** 🔥 GAME CHANGER
**Vision:** Teste mit ECHTEN Merchant Center Daten

---

## 💡 RICHTIGE VISION:

**NICHT:** Fake Test-Daten generieren
**SONDERN:** Echte Produkte aus Merchant Center holen + validieren!

```
┌──────────────────────────────────────┐
│  1. Hole ECHTE Produkte              │
│     aus Google Merchant Center       │
│     (kleine Batch z.B. 10 Produkte)  │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│  2. PRE-FLIGHT VALIDATION            │
│     - Simuliere Google's Checks      │
│     - Prüfe ALLE Regeln              │
│     - Teste Error-Ausgänge           │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│  3. ERROR-AUSGANG TESTS              │
│     - Was passiert bei Missing Image?│
│     - Was bei falscher GTN/EAN?      │
│     - Was bei Preis-Fehler?          │
│     - Sind Ausgänge richtig verdrahtet?│
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│  4. OPTIMIZATION CHECK               │
│     - Titel optimiert für SEO?       │
│     - Bilder hochauflösend?          │
│     - Beschreibung vollständig?      │
│     - Kategorie korrekt?             │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│  5. LIVE-FEEDBACK                    │
│     🟢 = Google wird akzeptieren     │
│     🟡 = Suboptimal aber OK          │
│     🔴 = Wird abgelehnt               │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│  6. FIX SUGGESTIONS                  │
│     Claude analysiert Probleme       │
│     Schlägt konkrete Fixes vor       │
│     Auto-Fix wenn möglich            │
└──────────────────────────────────────┘
```

---

## 🔍 WAS IM TEST PASSIERT:

### **NODE 1: Fetch Real Products**

```javascript
// Hole 10 echte Produkte aus Merchant Center
const products = await googleMerchantAPI.call({
  merchantId: shop1_id,
  method: 'products.list',
  params: {
    maxResults: 10,
    fields: 'resources(id,title,description,imageLink,price,gtin)'
  }
});

return {
  test_batch: products,
  test_mode: true,
  timestamp: new Date().toISOString()
};
```

---

### **NODE 2: Google Validation Simulator**

```javascript
// Simuliere Google's Produkt-Validierung
const validationRules = {
  
  // CRITICAL RULES (Reject wenn falsch)
  title: {
    check: p => p.title && p.title.length >= 10,
    error: 'Title zu kurz (min 10 chars)',
    fix: 'Erweitere Titel mit Marke/Modell'
  },
  
  image: {
    check: p => p.imageLink && isValidURL(p.imageLink),
    error: 'Bild fehlt oder ungültige URL',
    fix: 'Füge hochauflösendes Produktbild hinzu'
  },
  
  price: {
    check: p => p.price && p.price.value > 0,
    error: 'Preis fehlt oder ungültig',
    fix: 'Setze korrekten Preis in EUR'
  },
  
  gtin: {
    check: p => p.gtin && isValidGTIN(p.gtin),
    error: 'GTIN/EAN fehlt oder ungültig',
    fix: 'Validiere EAN-13 Format'
  },
  
  // OPTIMIZATION RULES (Warning wenn suboptimal)
  description: {
    check: p => p.description && p.description.length >= 100,
    severity: 'warning',
    message: 'Beschreibung zu kurz - schlecht für SEO',
    fix: 'Erweitere auf min 100 chars'
  },
  
  image_quality: {
    check: async (p) => {
      const img = await checkImageResolution(p.imageLink);
      return img.width >= 800 && img.height >= 800;
    },
    severity: 'warning',
    message: 'Bild-Auflösung suboptimal',
    fix: 'Nutze mindestens 800x800px'
  }
};

// Teste jedes Produkt
const results = products.map(product => {
  const errors = [];
  const warnings = [];
  const fixes = [];
  
  for (const [field, rule] of Object.entries(validationRules)) {
    if (!rule.check(product)) {
      if (rule.severity === 'warning') {
        warnings.push({
          field: field,
          message: rule.message,
          fix: rule.fix
        });
      } else {
        errors.push({
          field: field,
          error: rule.error,
          fix: rule.fix
        });
      }
    }
  }
  
  return {
    product_id: product.id,
    product_title: product.title,
    status: errors.length > 0 ? 'REJECT' : 
            warnings.length > 0 ? 'ACCEPT_SUBOPTIMAL' : 'PERFECT',
    color: errors.length > 0 ? 'red' : 
           warnings.length > 0 ? 'yellow' : 'green',
    errors: errors,
    warnings: warnings,
    google_will_accept: errors.length === 0
  };
});

return results;
```

---

### **NODE 3: Error-Ausgang Router (SWITCH!)**

```javascript
// Intelligentes Routing basierend auf Error-Type

const product = $input.item.json;

// SWITCH Node mit 6 Ausgängen:

// Ausgang 1: PERFECT (alle grün)
if (product.status === 'PERFECT') {
  return { outputIndex: 0, product };
}

// Ausgang 2: Missing Image
if (product.errors.some(e => e.field === 'image')) {
  return { 
    outputIndex: 1, 
    product,
    fix_action: 'fetch_image_from_source'
  };
}

// Ausgang 3: Invalid GTIN/EAN
if (product.errors.some(e => e.field === 'gtin')) {
  return { 
    outputIndex: 2, 
    product,
    fix_action: 'validate_and_correct_gtin'
  };
}

// Ausgang 4: Price Error
if (product.errors.some(e => e.field === 'price')) {
  return { 
    outputIndex: 3, 
    product,
    fix_action: 'fetch_correct_price'
  };
}

// Ausgang 5: Title Issues
if (product.errors.some(e => e.field === 'title')) {
  return { 
    outputIndex: 4, 
    product,
    fix_action: 'optimize_title_with_ai'
  };
}

// Ausgang 6: Other Errors
return { 
  outputIndex: 5, 
  product,
  fix_action: 'manual_review_required'
};
```

---

### **NODE 4-9: Error-Spezifische Fix-Handler**

#### **NODE 4: Image Fix Handler**
```javascript
// Verbunden mit Ausgang 2
const product = $input.item.json;

// Option A: Bild von Hersteller-Website holen
const imageUrl = await fetchManufacturerImage(product.brand, product.mpn);

// Option B: Placeholder + Manual Review
if (!imageUrl) {
  return {
    action: 'manual_review',
    message: 'Kein Bild gefunden - bitte manuell hochladen',
    product_id: product.id
  };
}

// Update Merchant Center
await updateProduct(product.id, { imageLink: imageUrl });

return { 
  status: 'FIXED',
  product_id: product.id,
  fix_applied: 'image_updated'
};
```

#### **NODE 5: GTIN Validator + Fixer**
```javascript
// Verbunden mit Ausgang 3
const product = $input.item.json;

// Validiere EAN-13
const gtin = product.gtin;
const isValid = validateEAN13(gtin);

if (!isValid) {
  // Versuche von Produkt-Datenbank zu holen
  const correctGTIN = await lookupGTIN(product.brand, product.mpn);
  
  if (correctGTIN) {
    await updateProduct(product.id, { gtin: correctGTIN });
    return { status: 'FIXED', gtin: correctGTIN };
  } else {
    return { 
      status: 'MANUAL_REVIEW',
      message: 'GTIN nicht in Datenbank - manuell prüfen'
    };
  }
}
```

#### **NODE 6: Price Validator**
```javascript
// Verbunden mit Ausgang 4
const product = $input.item.json;

// Hole aktuellen Preis von Shop
const currentPrice = await fetchShopPrice(product.id);

if (currentPrice && currentPrice > 0) {
  await updateProduct(product.id, { 
    price: { value: currentPrice, currency: 'EUR' }
  });
  return { status: 'FIXED', price: currentPrice };
}
```

#### **NODE 7: AI Title Optimizer**
```javascript
// Verbunden mit Ausgang 5
const product = $input.item.json;

// Claude optimiert Titel für Google
const optimizedTitle = await claudeMCP.call({
  tool: 'optimize_product_title',
  params: {
    current_title: product.title,
    brand: product.brand,
    category: product.productType,
    target: 'google_merchant_seo',
    max_length: 150
  }
});

// Beispiel Input: "Handy 256GB"
// Beispiel Output: "Samsung Galaxy S24 Ultra 5G Smartphone 256GB Phantom Black"

await updateProduct(product.id, { title: optimizedTitle });

return { 
  status: 'FIXED',
  old_title: product.title,
  new_title: optimizedTitle
};
```

---

### **NODE 10: Final Aggregator**

```javascript
// Sammelt alle Fix-Ergebnisse
const allResults = $input.all();

const summary = {
  total_products: allResults.length,
  perfect: allResults.filter(r => r.status === 'PERFECT').length,
  fixed: allResults.filter(r => r.status === 'FIXED').length,
  manual_review: allResults.filter(r => r.status === 'MANUAL_REVIEW').length,
  failed: allResults.filter(r => r.status === 'FAILED').length
};

// Speichere zu Supabase für Dashboard
await supabase.from('workflow_test_results').insert({
  test_id: testId,
  summary: summary,
  details: allResults,
  timestamp: new Date().toISOString(),
  approval_ready: summary.manual_review === 0 && summary.failed === 0
});

return {
  test_complete: true,
  summary: summary,
  recommendation: summary.approval_ready ? 
    'Lena - Alle Produkte bereit für Google' :
    'Manual Review für fehlerhafte Produkte nötig'
};
```

---

## 🎨 LIVE-DASHBOARD VIEW:

```
┌─────────────────────────────────────────┐
│ MERCHANT CENTER PRE-FLIGHT TEST         │
│ Test ID: test_1734582400               │
├─────────────────────────────────────────┤
│                                         │
│ 📊 BATCH: 10 Produkte                  │
│                                         │
│ 🟢 PERFECT:           3 Produkte (30%) │
│ 🟡 FIXED:             5 Produkte (50%) │
│ 🔴 MANUAL REVIEW:     2 Produkte (20%) │
│ ❌ FAILED:            0 Produkte (0%)  │
│                                         │
├─────────────────────────────────────────┤
│ DETAILS:                                │
│                                         │
│ 🟢 Samsung Galaxy S24                   │
│    ✓ Alle Checks bestanden              │
│                                         │
│ 🟡 iPhone 15 Pro                        │
│    ⚠ Bild-Auflösung niedrig (fixed)     │
│    ✓ GTIN validiert                     │
│                                         │
│ 🔴 Generic Handy Case                   │
│    ✗ GTIN nicht gefunden               │
│    ✗ Titel zu generisch                │
│    → Manual Review Required             │
│                                         │
└─────────────────────────────────────────┘

[Run Full Batch (100)] [Re-Test Failed] [Approve & Go Live]
```

---

## 🎯 WAS IM TEST GEPRÜFT WIRD:

### **Google Acceptance Criteria:**
✅ Titel (min 10 chars, max 150)
✅ Bild (URL gültig, min 800x800px)
✅ Preis (> 0, Währung EUR)
✅ GTIN/EAN (valid EAN-13 Format)
✅ Beschreibung (empf. min 100 chars)
✅ Verfügbarkeit (in stock / preorder)
✅ Versandkosten definiert
✅ Keine verbotenen Wörter

### **Optimization Checks:**
🟡 SEO-optimierter Titel
🟡 Hochauflösende Bilder
🟡 Ausführliche Beschreibung
🟡 Korrekte Kategorisierung
🟡 Strukturierte Daten

### **Error-Ausgang Tests:**
🔴 Was passiert wenn Bild fehlt? → Ausgang 2
🔴 Was bei invalid GTIN? → Ausgang 3
🔴 Was bei Preis-Fehler? → Ausgang 4
🔴 Was bei Titel-Problem? → Ausgang 5
🔴 Sind alle Ausgänge verdrahtet? → Check!

---

## 🚀 IMPLEMENTATION:

### **Cursor Aufgaben:**

```
☐ 1. Switch Node nach Validation einfügen (6 Ausgänge)
☐ 2. Error-Handler Nodes erstellen (Image/GTIN/Price/Title/Other)
☐ 3. Final Aggregator hinzufügen
☐ 4. Supabase Table: workflow_test_results
☐ 5. Test mit 10 echten Produkten
☐ 6. Validiere dass ALLE Ausgänge funktionieren
☐ 7. Report: Welche Ausgänge wurden genutzt?
```

### **Claude Aufgaben:**

```
☐ 1. Validation Rules definieren (Google Criteria)
☐ 2. Title Optimization (SEO)
☐ 3. Error Analysis + Fix Suggestions
☐ 4. Final Approval Decision
```

---

## 🎯 START BEFEHL:

**Lena - Build Pre-Flight System!**

```
1. Hole 10 echte Produkte aus Merchant Center
2. Erstelle Switch Node (6 Error-Ausgänge)
3. Baue Error-Handler für jeden Typ
4. Teste dass ALLE Ausgänge funktionieren
5. Report welche Fehler gefunden + gefixed
6. NUR bei 100% oder manuell approved → Save

Schritt für Schritt!
```

---

**IST DAS WAS DU WILLST?** 🎯

**Sag "Lena - Build Pre-Flight System" und wir starten!** 🚀

---
