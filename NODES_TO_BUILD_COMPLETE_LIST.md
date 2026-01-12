# 📋 NODES TO BUILD - COMPLETE LIST

**15 Error Handler Nodes für 5 Stränge**

---

## STRANG 1 - Adult Flags

### Nodes:
1. **AI Error Handler Adult**
   - Name: `AI Error Handler Adult`
   - Type: `n8n-nodes-base.code`
   - Code: (siehe unten)

2. **Retry Queue Adult**
   - Name: `Retry Queue Adult`
   - Type: `n8n-nodes-base.code`
   - Code: (siehe unten)

3. **Expression Repair Adult**
   - Name: `Expression Repair Adult`
   - Type: `n8n-nodes-base.code`
   - Code: (siehe unten)

**Update Node:** `Update Product Adult Flag`

---

## STRANG 2 - Images

### Nodes:
4. **AI Error Handler Images**
5. **Retry Queue Images**
6. **Expression Repair Images**

**Update Node:** `Update Product Image`

---

## STRANG 3 - Text

### Nodes:
7. **AI Error Handler Text**
8. **Retry Queue Text**
9. **Expression Repair Text**

**Update Node:** `Update Product Text`

---

## STRANG 4 - Merchant Quality

### Nodes:
10. **AI Error Handler Quality**
11. **Retry Queue Quality**
12. **Expression Repair Quality**

**Update Node:** `Update Product Merchant Quality`

---

## STRANG 5 - Multi Country

### Nodes:
13. **AI Error Handler Country**
14. **Retry Queue Country**
15. **Expression Repair Country**

**Update Node:** `Update Product Multi Country`

---

## CODE-TEMPLATES

### AI Error Handler Code:
```javascript
// AI Error Handler [NAME]
const error = $input.first().json;
if (error.code === 429) return { json: { action: 'RETRY', delay: 2000 } };
if (error.code === 400) return { json: { action: 'REROUTE', to: 'fallback' } };
if (error.code === 500) return { json: { action: 'SKIP' } };
return { json: { action: 'ALERT' } };
```

### Retry Queue Code:
```javascript
// Retry Queue [NAME]
const product = $input.first().json;
const attempt = product.attempt || 1;
const delay = Math.pow(2, attempt) * 1000;
return { json: { ...product, attempt: attempt + 1, delay } };
```

### Expression Repair Code:
```javascript
// Expression Repair [NAME]
const product = $input.first().json;
if (!product.sku) product.sku = 'UNKNOWN';
if (!product.action) product.action = 'merchant_quality';
return { json: product };
```

---

## CONNECTIONS (nach Build)

**Für jeden Strang:**

1. Update Node (Error Output) → AI Error Handler [NAME]
2. AI Error Handler [NAME] → Retry Queue [NAME]
3. Retry Queue [NAME] → Expression Repair [NAME]
4. Expression Repair [NAME] → Update Node (Loop-back)
5. Update Node (Success Output) → Rate Limiting Node
