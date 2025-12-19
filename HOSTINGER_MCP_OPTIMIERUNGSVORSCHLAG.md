# 🔧 HOSTINGER MCP OPTIMIERUNGSVORSCHLAG

**Datum:** 2025-12-19  
**Problem:** "Exceeding total tool limit"  
**Ziel:** Hostinger Tools auf nötigste reduzieren

---

## 📋 IHRE ANFORDERUNGEN

### **BENÖTIGTE FUNKTIONEN:**
- ✅ n8n hostinger copy and paste
- ✅ Webdesign
- ✅ Server Management
- ✅ SQL, Datenbanken
- ✅ Webmin
- ✅ Remote Desktop
- ✅ Domain (realdollz.de) Editierung
- ✅ Apache
- ✅ PHP
- ✅ Server im Griff haben

### **KANN DEAKTIVIERT WERDEN:**
- ❌ Zahlwesen/Billing (nicht löschen, nur deaktivieren)

---

## 🔍 HOSTINGER API TOOL-KATEGORIEN

Basierend auf Hostinger Developer API Dokumentation:

### **1. VPS MANAGEMENT** ✅ BENÖTIGT
- Virtual Machine Management
- Container/Docker Management
- SSH Key Management
- Backup/Snapshot Management
- Firewall Management
- Post-Install Scripts

### **2. DOMAIN MANAGEMENT** ✅ BENÖTIGT
- Domain CRUD Operations
- Domain Forwarding
- Domain Lock/Unlock
- Nameservers
- WHOIS Management
- Privacy Protection

### **3. DNS MANAGEMENT** ✅ BENÖTIGT
- DNS Records (A, AAAA, CNAME, MX, TXT, etc.)
- DNS Snapshots
- DNS Reset

### **4. HOSTING/WEBSITES** ✅ BENÖTIGT
- Website Management
- Website Deployment (WordPress, Static, JS Apps)
- Database Management
- File Management
- SSL Certificates

### **5. DATABASE MANAGEMENT** ✅ BENÖTIGT
- Database CRUD
- Database Users
- Database Backups

### **6. BILLING/SUBSCRIPTIONS** ❌ DEAKTIVIEREN
- Payment Methods
- Subscriptions
- Orders
- Catalog Items
- Auto-Renewal

### **7. EMAIL MARKETING (REACH)** ❌ DEAKTIVIEREN (wenn nicht benötigt)
- Contacts
- Segments
- Campaigns

---

## 💡 OPTIMIERUNGSVORSCHLAG

### **OPTION A: Selektive Tool-Filterung** (Komplex)

**Problem:** Hostinger MCP Server lädt ALLE Tools standardmäßig. Es gibt keine native "Tool-Filter" Option in der mcp.json.

**Lösung:** Custom MCP Wrapper Script erstellen, das nur bestimmte Tools lädt.

**Vorteile:**
- Präzise Kontrolle
- Nur gewünschte Tools

**Nachteile:**
- Benötigt Custom-Script
- Wartungsaufwand

---

### **OPTION B: Hostinger MCP temporär inaktiv lassen** (Einfach)

**Lösung:** Hostinger MCP bleibt in Config, aber nicht aktiv.

**Aktuell:** Server ist bereits inaktiv (Cursor startet ihn nicht)

**Vorteile:**
- Sofort implementierbar
- Config bleibt erhalten
- Keine Tools geladen

**Nachteile:**
- Keine Hostinger Tools verfügbar

---

### **OPTION C: Nur bei Bedarf aktivieren** (Pragmatisch)

**Lösung:** Hostinger MCP nur aktivieren wenn benötigt.

**Workflow:**
1. Hostinger MCP bleibt in Config (inaktiv)
2. Bei Bedarf: Cursor Neustart mit aktivem Server
3. Tools nutzen
4. Danach wieder inaktiv

**Vorteile:**
- Flexibel
- Keine permanente Tool-Last
- Config bleibt erhalten

---

## 📊 PERFORMANCE-ANALYSE

### **Aktuelle Tool-Last (geschätzt):**

**Hostinger MCP Server:** ~50-80 Tools (geschätzt basierend auf API-Endpunkten)
- VPS: ~15-20 Tools
- Domain: ~10-15 Tools
- DNS: ~8-10 Tools
- Hosting: ~10-15 Tools
- Database: ~5-8 Tools
- Billing: ~10-15 Tools
- Email: ~8-10 Tools

**Gesamt Tools (alle MCP Server):**
- n8n-mcp: ~7 Tools
- mechtech-basis: ~13 Tools
- webflow: ~20-30 Tools
- hostinger-mcp: ~50-80 Tools (wenn aktiv)
- **TOTAL: ~90-130 Tools** (wenn alle aktiv)

### **Limit-Warnung:**
Typische Tool-Limits: 100-150 Tools (je nach Cursor/Claude Version)

---

## 🎯 EMPFEHLUNG

### **EMPFEHLUNG: OPTION C (Nur bei Bedarf aktivieren)**

**Begründung:**
1. ✅ Hostinger MCP ist bereits inaktiv (kein Neustart nötig)
2. ✅ Config bleibt erhalten (keine Löschung)
3. ✅ Keine dauerhafte Tool-Last
4. ✅ Flexibel: Aktivieren wenn Server-Management nötig
5. ✅ Keine Custom-Scripts nötig

**Alternative:** Falls Sie dauerhaft Hostinger Tools brauchen, können wir Option A (Custom Wrapper) implementieren.

---

## ❓ ENTSCHEIDUNG BENÖTIGT

**Bitte entscheiden Sie:**

1. **Option C beibehalten?** (Hostinger MCP bleibt inaktiv, nur bei Bedarf aktivieren)
2. **Option A implementieren?** (Custom Wrapper für selektive Tools)
3. **Andere Lösung?**

**Nach Ihrer Entscheidung:** Ich setze um!

---

**Status:** Warte auf Ihre Entscheidung vor Umsetzung! ✅
