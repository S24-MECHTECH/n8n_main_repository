/**
 * 🚀 BUILD CENTRAL GEMINI ERROR HANDLERS
 * Ersetzt fehlerhafte Error Handler Nodes durch korrekte LangChain Gemini Nodes
 * 
 * STRATEGIE:
 * - 1 Gemini Node pro Strang (6x)
 * - Zentrales Error Handling mit AI
 * - Fehleranalyse, Produktreparatur, intelligente Decisions
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

// Stränge für Error Handling
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

function findGeminiNodeReference(workflow) {
  // Finde einen funktionierenden Gemini Node als Referenz
  const geminiNodes = workflow.nodes.filter(n => 
    n.type === '@n8n/n8n-nodes-langchain.lmChatGoogleGemini'
  );
  
  if (geminiNodes.length > 0) {
    return geminiNodes[0];
  }
  return null;
}

function createGeminiErrorHandlerNode(strand, referenceNode, rateLimitingNode) {
  const nodeId = `gemini-error-${strand.shortName.toLowerCase()}-${Date.now()}`;
  
  // System Prompt für Error Handling
  const systemPrompt = `Du bist ein zentraler Error Handler für Google Merchant Center ${strand.name} Updates.

AUFGABE:
1. Fehler analysieren (HTTP Status Codes, Error Messages, Product Data)
2. Produkt reparieren wenn möglich (fehlende Felder, ungültige Daten, Format-Fehler)
3. Intelligente Decision treffen: RETRY / AUTO_FIX / REROUTE / SKIP / ALERT
4. Nächsten Step vorschlagen
5. ALLES detailliert loggen

INPUT:
- error: { code, message, details }
- product: { alle Produktfelder }
- context: { strand: "${strand.name}", attempt, previousActions }

DECISION REGELN:
- Code 429 (Rate Limit) → RETRY mit exponential backoff
- Code 400 (Bad Request) → AUTO_FIX wenn reparierbar, sonst REROUTE zu merchant_quality
- Code 500 (Server Error) → RETRY nach Delay, max 3x
- Code 404 (Not Found) → SKIP (Produkt existiert nicht)
- Unknown/Other → ALERT (manuelle Prüfung nötig)

AUTO_FIX REGELN:
- Fehlende Pflichtfelder → Standardwerte setzen
- Ungültige Formate → Korrigieren (URLs, Zahlen, Datum)
- Zu lange Texte → Kürzen
- Falsche Datentypen → Konvertieren

OUTPUT (JSON):
{
  "action": "RETRY" | "AUTO_FIX" | "REROUTE" | "SKIP" | "ALERT",
  "fix_applied": { "field": "value", ... } | null,
  "product_fixed": { vollständiges repariertes Product } | null,
  "confidence": 0.0-1.0,
  "delay": number (Sekunden für RETRY),
  "next_action": "string (Beschreibung)",
  "reason": "string (Warum diese Aktion?)",
  "log": "string (detailliertes Log)"
}

WICHTIG: Antworte IMMER mit validem JSON!`;

  // Node-Konfiguration basierend auf Referenz
  const node = {
    id: nodeId,
    name: `Gemini Error Handler ${strand.name}`,
    type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
    typeVersion: referenceNode?.typeVersion || 1,
    position: rateLimitingNode ? 
      [rateLimitingNode.position[0] + 350, rateLimitingNode.position[1]] :
      [0, 0],
    parameters: {
      options: {},
      ...(referenceNode?.parameters?.model ? { model: referenceNode.parameters.model } : {}),
      ...(referenceNode?.parameters?.credentials ? { 
        credentials: referenceNode.parameters.credentials 
      } : {})
    }
  };
  
  // System Message hinzufügen
  if (!node.parameters.options) node.parameters.options = {};
  if (!node.parameters.options.systemMessage) {
    node.parameters.options.systemMessage = systemPrompt;
  }
  
  return node;
}

function findRateLimitingNode(workflow, strand) {
  // Finde Rate Limiting Node für diesen Strang
  const rateLimitingNames = [
    `Rate Limiting ${strand.name}`,
    `Rate Limiting${strand.name.replace(/\s+/g, '')}`,
    `Rate Limiting ${strand.shortName}`,
    ...(strand.name === 'GTN/EAN' ? [
      'Rate Limiting GTN/EAN',
      'Rate Limiting GTNEAN'
    ] : [])
  ];
  
  for (const name of rateLimitingNames) {
    const node = workflow.nodes.find(n => 
      n.name && n.name.toLowerCase().includes(name.toLowerCase().replace(/\s+/g, ''))
    );
    if (node) return node;
  }
  
  // Fallback: Suche nach Rate Limiting in der Nähe von Update Nodes
  const updateNames = [
    `Update ${strand.name}`,
    `Update Product ${strand.name}`,
    ...(strand.name === 'GTN/EAN' ? ['Update GTN/EAN'] : [])
  ];
  
  for (const updateName of updateNames) {
    const updateNode = workflow.nodes.find(n => 
      n.name && n.name.toLowerCase().includes(updateName.toLowerCase().replace(/\s+/g, ''))
    );
    if (updateNode) {
      // Suche nach Rate Limiting Node nach diesem Update Node
      const rateLimitNode = workflow.nodes.find(n => 
        n.type === 'n8n-nodes-base.wait' &&
        n.position && 
        n.position[0] > updateNode.position[0] &&
        Math.abs(n.position[1] - updateNode.position[1]) < 200
      );
      if (rateLimitNode) return rateLimitNode;
    }
  }
  
  return null;
}

async function buildCentralGeminiErrorHandlers() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 BUILD CENTRAL GEMINI ERROR HANDLERS');
  console.log('='.repeat(80) + '\n');
  
  try {
    // 1. Workflow laden
    console.log('1️⃣  WORKFLOW LADEN...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`   ✅ Workflow geladen: ${workflow.nodes.length} Nodes\n`);
    
    // 2. Referenz Gemini Node finden
    console.log('2️⃣  REFERENZ GEMINI NODE FINDEN...\n');
    const referenceNode = findGeminiNodeReference(workflow);
    if (!referenceNode) {
      throw new Error('Kein funktionierender Gemini Node als Referenz gefunden!');
    }
    console.log(`   ✅ Referenz Node: ${referenceNode.name} (${referenceNode.type})\n`);
    
    // 3. Fehlerhafte Error Handler Nodes entfernen
    console.log('3️⃣  FEHLERHAFTE ERROR HANDLER ENTFERNEN...\n');
    const oldErrorHandlers = workflow.nodes.filter(n => 
      n.name && n.name.includes('Error Handler') && 
      n.type === 'n8n-nodes-base.googleGemini'
    );
    
    console.log(`   📊 Gefunden: ${oldErrorHandlers.length} fehlerhafte Error Handler Nodes\n`);
    
    // Entferne aus nodes array
    workflow.nodes = workflow.nodes.filter(n => 
      !(n.name && n.name.includes('Error Handler') && n.type === 'n8n-nodes-base.googleGemini')
    );
    
    // Entferne Connections zu/ von diesen Nodes
    if (workflow.connections) {
      Object.keys(workflow.connections).forEach(nodeName => {
        if (oldErrorHandlers.some(old => old.name === nodeName)) {
          delete workflow.connections[nodeName];
        }
      });
      
      // Entferne Referenzen in connections.main[0]
      if (workflow.connections.main && Array.isArray(workflow.connections.main[0])) {
        workflow.connections.main[0] = workflow.connections.main[0].filter(conn => 
          !oldErrorHandlers.some(old => 
            conn.some(c => c.node === old.name)
          )
        );
      }
    }
    
    console.log(`   ✅ ${oldErrorHandlers.length} fehlerhafte Nodes entfernt\n`);
    
    // 4. Neue Gemini Error Handler Nodes erstellen
    console.log('4️⃣  NEUE GEMINI ERROR HANDLER NODES ERSTELLEN...\n');
    const newErrorHandlers = [];
    
    for (const strand of STRANDS) {
      const rateLimitingNode = findRateLimitingNode(workflow, strand);
      const errorHandlerNode = createGeminiErrorHandlerNode(strand, referenceNode, rateLimitingNode);
      
      workflow.nodes.push(errorHandlerNode);
      newErrorHandlers.push({
        strand: strand.name,
        node: errorHandlerNode,
        rateLimitingNode: rateLimitingNode?.name
      });
      
      console.log(`   ✅ ${errorHandlerNode.name} erstellt`);
      if (rateLimitingNode) {
        console.log(`      → Nach Rate Limiting: ${rateLimitingNode.name}`);
      }
      console.log('');
    }
    
    console.log(`   ✅ ${newErrorHandlers.length} neue Gemini Error Handler Nodes erstellt\n`);
    
    // 5. Workflow speichern
    console.log('5️⃣  WORKFLOW SPEICHERN...\n');
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    console.log(`   ✅ Workflow aktualisiert\n`);
    
    // 6. REPORT
    console.log('='.repeat(80));
    console.log('📊 REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log('✅ ERFOLGREICH ERSTELLT:\n');
    newErrorHandlers.forEach(eh => {
      console.log(`   ${eh.node.name}`);
      console.log(`      ID: ${eh.node.id}`);
      console.log(`      Type: ${eh.node.type}`);
      if (eh.rateLimitingNode) {
        console.log(`      Position: Nach ${eh.rateLimitingNode}`);
      }
      console.log('');
    });
    
    console.log('📋 NÄCHSTE SCHRITTE:\n');
    console.log('1. Verbinde Rate Limiting Nodes → Gemini Error Handler Nodes');
    console.log('2. Verbinde Gemini Error Handler Outputs zu entsprechenden Action Nodes');
    console.log('3. Teste jeden Strang einzeln');
    console.log('4. Prüfe Gemini Responses (sollten JSON sein)\n');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  buildCentralGeminiErrorHandlers();
}

module.exports = { buildCentralGeminiErrorHandlers };
