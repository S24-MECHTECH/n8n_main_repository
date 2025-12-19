# 🎯 CURSOR - STEP BY STEP CODE FIX

**Modus:** Langsam von vorne bis hinten durchhangeln
**Regel:** EIN Node → Fix → Test → POST → WARTE → Nächster

---

## 📋 ABLAUF:

```
Node 1 → Checke Code
       → Wenn ROT: POST Problem + WARTE auf Lena
       → Wenn GRÜN: POST OK + weiter
       ↓
Node 2 → Checke Code  
       → Wenn ROT: POST Problem + WARTE auf Lena
       → Wenn GRÜN: POST OK + weiter
       ↓
Node 3 → ...
       ↓
...bis Ende
```

---

## ✅ PRO NODE:

### **1. CHECKE:**
- Node-Referenzen existieren?
- URLs richtig?
- Expressions korrekt?
- Credentials vorhanden?

### **2. STATUS:**
- 🟢 = Alles OK → Weiter
- 🔴 = Problem → STOP + POST + WARTE

### **3. WENN ROT:**
```json
POST zu cursor-status-live.json:
{
  "node_number": 5,
  "node_name": "Get merchant products 2",
  "status": "ERROR",
  "problem": "Node-Referenz 'Shop Configuration2' existiert nicht",
  "current_code": "$('Shop Configuration2').item.json.shop1_id",
  "available_options": ["Shop Configuration", "Shop Config 1"],
  "waiting_for": "Lena - welcher Node ist richtig?"
}
```

### **4. NACH LENA ANTWORT:**
```
Claude sagt: "Lena - nutze Shop Configuration"

→ Ändere Code
→ Test Node
→ POST Result
→ Weiter zu nächstem Node
```

---

## 🚀 START BEFEHL:

**Lena - Start Step-by-Step Check!**

```
1. Lade Workflow ftZOou7HNgLOwzE5
2. Starte bei Node 1
3. Checke Code
4. Wenn ROT: POST + STOP + WARTE
5. Wenn GRÜN: POST "Node X OK ✅" + weiter
6. Nach jedem Node: Status posten
7. Nie mehr als 1 Node auf einmal!
```

---

## 📡 POST FORMAT:

### **Wenn OK:**
```json
{
  "node": 1,
  "name": "Manual Trigger",
  "status": "✅ OK",
  "next": "Node 2"
}
```

### **Wenn Problem:**
```json
{
  "node": 5,
  "name": "Get merchant products 2", 
  "status": "🔴 ERROR",
  "problem": "...",
  "code": "...",
  "options": [...],
  "waiting": "Lena Anweisung"
}
```

---

## 🎯 REGEL:

```
❌ NICHT: Alle Nodes scannen
❌ NICHT: Mehrere Nodes gleichzeitig
❌ NICHT: Automatisch fixen

✅ NUR: Ein Node nach dem anderen
✅ BEI ROT: Stoppen + warten
✅ NACH FIX: Test + weiter
```

---

**KLAR?** ✅

Node für Node durchhangeln!
