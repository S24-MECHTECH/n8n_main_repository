/**
 * UPDATE GEMINI ERROR HANDLERS FUR JSON INPUT/OUTPUT
 * Konfiguriert Gemini Nodes fuer n8n 2.0 mit JSON Input/Output
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

const STRANDS = [
  { name: 'Adult Flags', shortName: 'Adult' },
  { name: 'Images', shortName: 'Images' },
  { name: 'Text', shortName: 'Text' },
  { name: 'Merchant Quality', shortName: 'Quality' },
  { name: 'Multi Country', shortName: 'Country' },
  { name: 'GTN/EAN', shortName: 'GTNEAN' }
];

function getApiKey() {
  if (process.env.N8N_API_KEY) return process.env.N8N_API_KEY;
  
  const configPaths = [
    path.join(__dirname, '..', '..', '.cursor', 'mcp.json'),
    path.join(__dirname, '..', '..', '.cursor', 'FUNKTIONIERENDE_CONFIG.json'),
    path.join(process.env.USERPROFILE || process.env.HOME, '.cursor', 'mcp.json'),
    path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json')
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.mcpServers?.['n8n-mcp']?.env?.N8N_API_KEY) {
          return config.mcpServers['n8n-mcp'].env.N8N_API_KEY;
        }
      }
    } catch (error) {}
  }
  return null;
}

const N8N_API_KEY = getApiKey();

function n8nRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, N8N_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
    
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function getGeminiPrompt(strandName) {
  const actionName = strandName.toLowerCase().replace(/\s+/g, '_');
  return `Du bist ein Error Handler fuer Google Merchant Center ${strandName} Updates.

AUFGABE:
Parse das eingegebene JSON und analysiere Fehler.
Entscheide intelligente Action basierend auf error.code.
Gib IMMER validen JSON zurueck.

INPUT (JSON):
{
  "error": { "code": 429, "message": "Rate limit exceeded" },
  "product": { "sku": "ABC123", "title": "Product Title", "action": "${actionName}" },
  "attempt": 1,
  "context": "retry_loop"
}

DECISION REGELN:
- Code 429 (Rate Limit) -> action: "RETRY", delay in next_step
- Code 400 (Bad Request) -> action: "AUTO_FIX" wenn reparierbar, sonst "REROUTE"
- Code 500 (Server Error) -> action: "RETRY", max 3x attempts
- Code 404 (Not Found) -> action: "SKIP"
- Unknown/Other -> action: "ALERT"

AUTO_FIX BEISPIELE:
- Fehlende Pflichtfelder -> setze Standardwerte
- Ungueltige Formate -> korrigiere (URLs, Zahlen, Datum)
- Zu lange Texte -> kuerze auf Max-Laenge
- Falsche Datentypen -> konvertiere

OUTPUT (JSON - IMMER valid JSON zurueckgeben!):
{
  "action": "RETRY" | "AUTO_FIX" | "REROUTE" | "SKIP" | "ALERT",
  "fix_applied": "Beschreibung des Fixes" | null,
  "product_fixed": { vollstaendiges repariertes Product Object } | null,
  "confidence": 0-100,
  "next_step": "retry_update" | "update_product" | "retry_queue" | "skip" | "alert",
  "reason": "Warum diese Aktion?"
}

WICHTIG: Antworte NUR mit validem JSON, kein zusaetzlicher Text!`;
}

async function updateGeminiErrorHandlers() {
  console.log('\n' + '='.repeat(80));
  console.log('UPDATE GEMINI ERROR HANDLERS FUR JSON INPUT/OUTPUT');
  console.log('='.repeat(80) + '\n');
  
  try {
    console.log('1. WORKFLOW LADEN...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`   OK Workflow geladen: ${workflow.nodes.length} Nodes\n`);
    
    let nodesUpdated = 0;
    
    console.log('2. REFERENZ GEMINI NODE FINDEN...\n');
    const referenceGeminiNode = workflow.nodes.find(n => 
      n.type === '@n8n/n8n-nodes-langchain.lmChatGoogleGemini' &&
      n.name && !n.name.includes('Error Handler')
    );
    
    if (!referenceGeminiNode) {
      throw new Error('Kein Referenz-Gemini Node gefunden!');
    }
    
    console.log(`   OK Referenz: ${referenceGeminiNode.name}\n`);
    
    console.log('3. UPDATE GEMINI ERROR HANDLER NODES...\n');
    
    for (const strand of STRANDS) {
      const nodeName = `Gemini Error Handler ${strand.name}`;
      const errorHandlerNode = workflow.nodes.find(n => n.name === nodeName);
      
      if (!errorHandlerNode) {
        console.log(`   WARN ${nodeName} nicht gefunden - uebersprungen\n`);
        continue;
      }
      
      const systemPrompt = getGeminiPrompt(strand.name);
      
      errorHandlerNode.parameters = {
        ...errorHandlerNode.parameters,
        options: {
          ...(errorHandlerNode.parameters?.options || {}),
          systemMessage: systemPrompt
        }
      };
      
      if (referenceGeminiNode.parameters?.model) {
        errorHandlerNode.parameters.model = referenceGeminiNode.parameters.model;
      }
      if (referenceGeminiNode.parameters?.credentials) {
        errorHandlerNode.parameters.credentials = referenceGeminiNode.parameters.credentials;
      }
      
      console.log(`   OK ${nodeName} aktualisiert`);
      console.log(`      System Prompt: ${systemPrompt.length} chars\n`);
      
      nodesUpdated++;
    }
    
    console.log(`   OK ${nodesUpdated} Node(s) aktualisiert\n`);
    
    console.log('4. WORKFLOW SPEICHERN...\n');
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    console.log(`   OK Workflow aktualisiert\n`);
    
    console.log('='.repeat(80));
    console.log('REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log('OK GEMINI ERROR HANDLERS AKTUALISIERT:\n');
    console.log(`   ${nodesUpdated} Node(s) konfiguriert fuer JSON Input/Output\n`);
    
    console.log('NACHSTE SCHRITTE:\n');
    console.log('1. Code Node VOR jedem Gemini Node: Format Input zu JSON');
    console.log('2. Code Node NACH jedem Gemini Node: Parse JSON Output');
    console.log('3. Basierend auf action: Route zu entsprechenden Nodes');
    console.log('4. Test mit Sample Error Data\n');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\nFEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  updateGeminiErrorHandlers();
}

module.exports = { updateGeminiErrorHandlers };
