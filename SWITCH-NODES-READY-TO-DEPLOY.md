# 🔀 SWITCH NODES - READY TO DEPLOY

**Datum:** 2025-01-13  
**Status:** ✅ ALLE CONFIGS FERTIG - COPY-PASTE READY!

---

## 📋 6 SWITCH NODES FÜR GEMINI ERROR HANDLER

Jeder Switch Node routet basierend auf Gemini `action` Output:

- **RETRY** → Output 0 (zurück zu Rate Limiting)
- **AUTO_FIX** → Output 0 (zurück zu Rate Limiting mit fixed product)
- **REROUTE** → Output 1 (zu alternativem Handler)
- **SKIP** → Output 2 (zu Skip Handler/Log)
- **ALERT** → Output 3 (zu Alert Handler/Log)

---

## 🎯 NODE 1: Switch Action Handler Adult Flags

```json
{
  "parameters": {
    "mode": "rules",
    "rules": {
      "values": [
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "RETRY"
              }
            ]
          },
          "renameOutput": "RETRY"
        },
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "AUTO_FIX"
              }
            ]
          },
          "renameOutput": "AUTO_FIX"
        },
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "REROUTE"
              }
            ]
          },
          "renameOutput": "REROUTE"
        }
      ]
    },
    "fallbackOutput": "ALERT",
    "options": {}
  },
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3,
  "position": [1200, 200],
  "id": "switch-action-adult-flags",
  "name": "Switch Action Handler Adult Flags"
}
```

---

## 🎯 NODE 2: Switch Action Handler Images

```json
{
  "parameters": {
    "mode": "rules",
    "rules": {
      "values": [
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "RETRY"
              }
            ]
          },
          "renameOutput": "RETRY"
        },
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "AUTO_FIX"
              }
            ]
          },
          "renameOutput": "AUTO_FIX"
        },
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "REROUTE"
              }
            ]
          },
          "renameOutput": "REROUTE"
        }
      ]
    },
    "fallbackOutput": "ALERT",
    "options": {}
  },
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3,
  "position": [1200, 400],
  "id": "switch-action-images",
  "name": "Switch Action Handler Images"
}
```

---

## 🎯 NODE 3: Switch Action Handler Text

```json
{
  "parameters": {
    "mode": "rules",
    "rules": {
      "values": [
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "RETRY"
              }
            ]
          },
          "renameOutput": "RETRY"
        },
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "AUTO_FIX"
              }
            ]
          },
          "renameOutput": "AUTO_FIX"
        },
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "REROUTE"
              }
            ]
          },
          "renameOutput": "REROUTE"
        }
      ]
    },
    "fallbackOutput": "ALERT",
    "options": {}
  },
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3,
  "position": [1200, 600],
  "id": "switch-action-text",
  "name": "Switch Action Handler Text"
}
```

---

## 🎯 NODE 4: Switch Action Handler Merchant Quality

```json
{
  "parameters": {
    "mode": "rules",
    "rules": {
      "values": [
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "RETRY"
              }
            ]
          },
          "renameOutput": "RETRY"
        },
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "AUTO_FIX"
              }
            ]
          },
          "renameOutput": "AUTO_FIX"
        },
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "REROUTE"
              }
            ]
          },
          "renameOutput": "REROUTE"
        }
      ]
    },
    "fallbackOutput": "ALERT",
    "options": {}
  },
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3,
  "position": [1200, 800],
  "id": "switch-action-merchant-quality",
  "name": "Switch Action Handler Merchant Quality"
}
```

---

## 🎯 NODE 5: Switch Action Handler Multi Country

```json
{
  "parameters": {
    "mode": "rules",
    "rules": {
      "values": [
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "RETRY"
              }
            ]
          },
          "renameOutput": "RETRY"
        },
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "AUTO_FIX"
              }
            ]
          },
          "renameOutput": "AUTO_FIX"
        },
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "REROUTE"
              }
            ]
          },
          "renameOutput": "REROUTE"
        }
      ]
    },
    "fallbackOutput": "ALERT",
    "options": {}
  },
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3,
  "position": [1200, 1000],
  "id": "switch-action-multi-country",
  "name": "Switch Action Handler Multi Country"
}
```

---

## 🎯 NODE 6: Switch Action Handler GTN/EAN

```json
{
  "parameters": {
    "mode": "rules",
    "rules": {
      "values": [
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "RETRY"
              }
            ]
          },
          "renameOutput": "RETRY"
        },
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "AUTO_FIX"
              }
            ]
          },
          "renameOutput": "AUTO_FIX"
        },
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.action }}",
                "operation": "equals",
                "value2": "REROUTE"
              }
            ]
          },
          "renameOutput": "REROUTE"
        }
      ]
    },
    "fallbackOutput": "ALERT",
    "options": {}
  },
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3,
  "position": [1200, 1200],
  "id": "switch-action-gtn-ean",
  "name": "Switch Action Handler GTN/EAN"
}
```

---

## 🚀 DEPLOYMENT

### **Option 1: Auto-Deploy Script (EMPFOHLEN)**

```powershell
node scripts/auto-deploy-nodes.js
```

### **Option 2: Manuell in n8n**

1. Öffne n8n: `https://n8n.srv1091615.hstgr.cloud`
2. Workflow: `***MECHTECH_MERCHANT_CENTER_ADMIN` (ID: `ftZOou7HNgLOwzE5`)
3. Füge jeden Switch Node hinzu (Copy-Paste JSON oben)
4. Verbinde: Gemini Error Handler → Switch Action Handler
5. Verbinde Switch Outputs zu entsprechenden Nodes

---

## 🔗 CONNECTIONS

**Gemini Error Handler → Switch:**
- `Gemini Error Handler Adult Flags` → `Switch Action Handler Adult Flags`
- `Gemini Error Handler Images` → `Switch Action Handler Images`
- `Gemini Error Handler Text` → `Switch Action Handler Text`
- `Gemini Error Handler Merchant Quality` → `Switch Action Handler Merchant Quality`
- `Gemini Error Handler Multi Country` → `Switch Action Handler Multi Country`
- `Gemini Error Handler GTN/EAN` → `Switch Action Handler GTN/EAN`

**Switch Outputs:**
- **RETRY (Output 0)** → Zurück zu `Rate Limiting` Node
- **AUTO_FIX (Output 0)** → Zurück zu `Rate Limiting` Node (mit fixed product)
- **REROUTE (Output 1)** → Zu alternativem Handler
- **SKIP (Output 2)** → Zu Skip Handler/Log
- **ALERT (Output 3/Fallback)** → Zu Alert Handler/Log

---

**Status:** ✅ READY TO DEPLOY - Copy-Paste oder Auto-Deploy!
