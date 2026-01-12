# 🚨 CURSOR PRIORITÄT 1 - DNS FIX

**Timestamp:** 2025-12-19T05:08:00Z
**Priority:** 🔥 CRITICAL - HÖCHSTE PRIORITÄT
**Von:** Claude Orchestrator
**An:** Cursor Executor

---

## 🎯 NEUE PRIORITÄT:

```
❌ STOPPE: Workflow Analyse (vorerst)
✅ SOFORT: DNS Problem auf Hostinger fixen
✅ DANN: Workflow scannen wenn DNS läuft
```

---

## 🚨 PROBLEM:

```
Error 1016: Origin DNS error
Domain: api.hostinger.com
Status: Cloudflare kann api.hostinger.com nicht auflösen
Folge: MCP Server nicht erreichbar
```

---

## 🔧 AUFTRAG: DNS REPARIEREN

### **Du hast Hostinger MCP Zugriff - NUTZE IHN!**

---

## ✅ SCHRITT 1: DNS STATUS CHECKEN

```
Hostinger MCP Tool: Check DNS Records
Domain: api.hostinger.com

Liste ALLE DNS Records:
- A Records
- CNAME Records  
- NS Records
- Status jedes Records
```

### **POST Ergebnis:**

```json
{
  "task": "DNS Check",
  "domain": "api.hostinger.com",
  "records": [
    { "type": "A", "value": "...", "status": "..." },
    { "type": "CNAME", "value": "...", "status": "..." }
  ],
  "cloudflare_status": "PROBLEM_BESCHREIBUNG"
}
```

---

## ✅ SCHRITT 2: PROBLEM IDENTIFIZIEREN

**Mögliche Ursachen:**

1. **CNAME zeigt auf ungültiges Ziel**
   - Check: Wohin zeigt CNAME?
   - Ist das Ziel erreichbar?

2. **A Record fehlt oder falsch**
   - Check: Gibt es A Record?
   - Zeigt auf richtige IP?

3. **Nameserver Problem**
   - Check: NS Records korrekt?
   - Cloudflare NS aktiv?

4. **Propagation nicht abgeschlossen**
   - Check: Wann wurde DNS geändert?
   - 48h warten oder Force-Refresh?

---

## ✅ SCHRITT 3: DNS REPARIEREN

### **Option A: CNAME Fix**

```
Wenn CNAME ungültig:

Hostinger MCP Tool: Update DNS Record
Type: CNAME
Host: api
Value: [KORREKTE_ZIEL_DOMAIN]
TTL: 3600
```

### **Option B: A Record Fix**

```
Wenn A Record fehlt:

Hostinger MCP Tool: Create DNS Record
Type: A
Host: api
Value: [SERVER_IP_HIER]
TTL: 3600
```

### **Option C: Cloudflare Flush**

```
Wenn nur Cache-Problem:

Hostinger MCP Tool: Flush Cloudflare Cache
Domain: api.hostinger.com
```

---

## ✅ SCHRITT 4: VERIFY

Nach Fix:

```bash
# Test 1: DNS Lookup
nslookup api.hostinger.com

# Test 2: Ping
ping api.hostinger.com

# Test 3: MCP Connection
curl https://api.hostinger.com/health

# Alle 3 müssen funktionieren!
```

---

## ✅ SCHRITT 5: REPORT

### **POST zu cursor-status-live.json:**

```json
{
  "timestamp": "ISO-8601",
  "task": "DNS Fix Complete",
  "status": "RESOLVED",
  "actions_taken": [
    "DNS Check durchgeführt",
    "Problem: [WAS_WAR_KAPUTT]",
    "Fix: [WAS_GEMACHT]",
    "Verify: [ALLE_TESTS_OK]"
  ],
  "dns_status": {
    "before": "Error 1016",
    "after": "RESOLVED",
    "records": [...]
  },
  "next_step": "Workflow Analyse kann starten"
}
```

### **UND zu GitHub:**

```
File: dns-fix-report.md
Commit: "DNS FIX: api.hostinger.com Error 1016 resolved"
```

---

## 🎯 CLAUDE KONTROLLE:

**Cursor postet JEDEN Schritt:**

```
Schritt 1: DNS Check → POST Status
Schritt 2: Problem gefunden → POST Details
Schritt 3: Fix angewendet → POST was gemacht
Schritt 4: Verify Tests → POST Ergebnisse
Schritt 5: Complete → POST Final Report
```

**Claude checkt alle 3 Min:**
- cursor-status-live.json
- GitHub Commits
- Greift ein bei Problemen

---

## 📋 AUSFÜHRUNGS-CHECKLISTE:

```
☐ 1. Hostinger MCP Connection aktiv
☐ 2. DNS Records für api.hostinger.com geladen
☐ 3. Problem identifiziert (POST zu Claude)
☐ 4. Fix-Methode gewählt (POST zu Claude)
☐ 5. WARTE auf Claude Approval
☐ 6. Nach OK: Fix ausführen
☐ 7. Verify Tests durchführen
☐ 8. Report erstellen (JSON + MD)
☐ 9. Status: DNS_FIXED
☐ 10. Weiter zu Workflow Analyse
```

---

## 🚨 KRITISCHE REGEL:

```
❌ NICHT: DNS ändern ohne Approval
✅ ERST: Analyse + POST zu Claude
✅ DANN: Warte auf "Lena - DNS fix approved"
✅ DANN: Führe Fix aus
✅ DANN: Verify + Report
```

**Claude muss JEDEN DNS-Change genehmigen!**
**DNS ist kritisch - kein autonomes Handeln!**

---

## 🚀 START BEFEHL:

**Lena - DNS Check starten!**

```
1. Hostinger MCP aktivieren
2. DNS Records für api.hostinger.com laden
3. Status analysieren
4. Problem identifizieren
5. POST Findings zu cursor-status-live.json
6. WARTE auf Claude Approval für Fix
```

**KEINE automatischen DNS-Änderungen!**

---
