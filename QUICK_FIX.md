# ⚡ QUICK FIX - Workflow Reparatur

## 🚀 Schnellstart

### 1. Auto-Fix ausführen (behebt alle bekannten Probleme):

```bash
# Mit API Key als Umgebungsvariable
export N8N_API_KEY="YOUR_API_KEY"
npm run fix

# Oder direkt mit Node
node scripts/auto-fix-workflow.js YOUR_API_KEY
```

### 2. Was wird automatisch behoben:

✅ **Credentials:** `googleApi` → `googleOAuth2Api`  
✅ **Prepare Chain:** Alle Prepare-Nodes werden sequenziell verbunden  
✅ **Route → Update → Rate Limiting:** Struktur wird korrigiert  
✅ **Update Product Adult Flag:** URL Expression & Body  
✅ **Prepare GTN/EAN:** Connection zu Rate Limiting  

### 3. Workflow analysieren:

```bash
npm run analyze YOUR_API_KEY
```

### 4. Workflow überwachen:

```bash
npm run monitor YOUR_API_KEY
```

## 📋 Checkliste nach Fix

- [ ] Alle Prepare-Nodes sind sequenziell verbunden
- [ ] Alle Update-Nodes haben korrekte Credentials (googleOAuth2Api)
- [ ] Route by Priority → Update → Rate Limiting Struktur ist korrekt
- [ ] Update Product Adult Flag hat Body und korrekte URL
- [ ] Workflow kann ohne Fehler gestartet werden

## 🔧 Workflow ID

- **MECHTECH_MERCHANT_CENTER_ADMIN:** `ftZOou7HNgLOwzE5`

## 📞 Bei Problemen

1. Führen Sie `npm run analyze` aus
2. Prüfen Sie die Output-Logs
3. Führen Sie `npm run fix` erneut aus
