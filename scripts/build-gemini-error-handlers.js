/**
 * 🤖 BUILD GEMINI ERROR HANDLERS
 * Erstellt Gemini-basierte Error Handler für alle 6 Stränge
 * Statt Switch Nodes → Gemini analysiert Fehler und entscheidet intelligent
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

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

const strandDefinitions = [
  { name: 'Adult', updateNode: 'Update Product Adult Flag' },
  { name: 'Images', updateNode: 'Update Product Images' },
  { name: 'Text', updateNode: 'Update Product Text' },
  { name: 'Quality', updateNode: 'Update Merchant Settings' },
  { name: 'Country', updateNode: 'Update Country Feeds' },
  { name: 'GTN/EAN', updateNode: 'Update GTN/EAN' }
];

/**
 * Erstellt Gemini Error Handler Node
 */
function createGeminiErrorHandlerNode(strand, updateNode) {
  const position = [updateNode.position[0] + 350, updateNode.position[1]];
  
  // System Prompt für Gemini Error Handler
  const systemPrompt = `Du bist ein Error Handler für n8n Workflows. Analysiere Fehler und entscheide die beste Aktion.

INPUT: error + product data
OUTPUT: JSON mit:
- action: "RETRY" | "REPAIR" | "SKIP" | "ROUTE"
- delay: number (Sekunden für RETRY)
- fixedProduct: object (repariertes Product für REPAIR)
- nextAction: string (Beschreibung)
- reason: string (Warum diese Aktion?)

REGLEN:
- Code 429 (Rate Limit) → action: "RETRY", delay: 5
- Code 400 (Bad Request) → action: "REPAIR", fixedProduct: [reparierte Daten]
- Code 500 (Server Error) → action: "SKIP", nextAction: "tomorrow retry"
- Unknown/Other → action: "ROUTE", nextAction: "merchant_quality"

Antworte IMMER mit validen JSON!`;

  const userPrompt = `Analysiere diesen Fehler:

Error Code: {{ $json.error?.code || $json.code || $json.statusCode || "UNKNOWN" }}
Error Message: {{ $json.error?.message || $json.message || "Unknown error" }}
Product Data: {{ JSON.stringify($json) }}

Antworte IMMER mit JSON im Format:
{
  "action": "RETRY" | "REPAIR" | "SKIP" | "ROUTE",
  "delay": <number>,
  "fixedProduct": <object>,
  "nextAction": "<string>",
  "reason": "<string>"
}`;

  return {
    id: `gemini-error-${strand.name.toLowerCase().replace(/[\/\s]/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `Gemini Error Handler ${strand.name}`,
    type: '@n8n/n8n-nodes-langchain.googleGeminiTool',
    typeVersion: 1,
    position: position,
    parameters: {
      modelId: {
        __rl: true,
        value: 'models/gemini-2.0-flash-exp',
        mode: 'list',
        cachedResultName: 'models/gemini-2.0-flash-exp'
      },
      messages: {
        values: [
          {
            content: `${systemPrompt}\n\n${userPrompt}`
          }
        ]
      },
      options: {
        temperature: 0.3
      }
    }
  };
}

async function buildGeminiErrorHandlers() {
  console.log('\n' + '='.repeat(80));
  console.log('🤖 BUILD GEMINI ERROR HANDLERS');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      console.error('❌ N8N_API_KEY fehlt!');
      process.exit(1);
    }
    
    // 1. Workflow laden
    console.log('📥 Lade Workflow...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    let nodes = workflow.nodes || [];
    let connections = workflow.connections || {};
    
    console.log(`✅ Workflow: ${workflow.name}`);
    console.log(`   Nodes vorher: ${nodes.length}\n`);
    
    // Initialisiere connections
    if (!connections.main) connections.main = [[]];
    if (!connections.main[0]) connections.main[0] = [];
    
    // 2. Entferne alte Switch Nodes
    console.log('🗑️  Entferne alte Switch Nodes...\n');
    
    const switchNodes = nodes.filter(n => 
      n.type === 'n8n-nodes-base.switch' && 
      n.name && n.name.includes('Error Handler')
    );
    
    const switchNodeIds = new Set(switchNodes.map(n => n.id));
    
    // Entferne Connections zu Switch Nodes
    if (connections.main && Array.isArray(connections.main) && connections.main[0]) {
      connections.main[0] = connections.main[0].filter(conn => 
        !Array.isArray(conn) || 
        (!switchNodeIds.has(conn[0]?.node) && !switchNodeIds.has(conn[1]?.node))
      );
    }
    
    // Entferne node-based Connections
    switchNodes.forEach(switchNode => {
      delete connections[switchNode.name];
      
      // Entferne Connections VON anderen Nodes ZU Switch Node
      Object.keys(connections).forEach(nodeName => {
        if (connections[nodeName]?.main) {
          connections[nodeName].main = connections[nodeName].main.map(outputArray => {
            if (Array.isArray(outputArray)) {
              return outputArray.filter(conn => 
                (typeof conn === 'object' && conn.node !== switchNode.name) ||
                (typeof conn === 'string' && conn !== switchNode.name)
              );
            }
            return outputArray;
          });
        }
      });
    });
    
    // Entferne Nodes
    nodes = nodes.filter(n => !switchNodeIds.has(n.id));
    
    console.log(`   ✅ ${switchNodes.length} Switch Node(s) entfernt\n`);
    
    // 3. Erstelle Gemini Error Handler für jeden Strang
    console.log('🤖 Erstelle Gemini Error Handler...\n');
    
    let addedCount = 0;
    
    for (const strand of strandDefinitions) {
      console.log(`📋 STRANG: ${strand.name}\n`);
      
      // Finde Update Node
      const updateNode = nodes.find(n => n.name === strand.updateNode);
      if (!updateNode) {
        console.log(`   ⚠️  ${strand.updateNode} nicht gefunden - übersprungen\n`);
        continue;
      }
      
      // Prüfe ob Gemini Error Handler bereits existiert
      const existingGemini = nodes.find(n => 
        n.name === `Gemini Error Handler ${strand.name}` &&
        n.type === 'n8n-nodes-base.googleGemini'
      );
      
      if (existingGemini) {
        console.log(`   ⏭️  Gemini Error Handler bereits vorhanden: ${existingGemini.name}\n`);
        continue;
      }
      
      // Erstelle Gemini Error Handler
      const geminiNode = createGeminiErrorHandlerNode(strand, updateNode);
      nodes.push(geminiNode);
      addedCount++;
      
      console.log(`   ✅ ${geminiNode.name} erstellt`);
      console.log(`      Position: [${geminiNode.position[0]}, ${geminiNode.position[1]}]`);
      console.log(`      Model: gemini-2.0-flash-exp`);
      console.log(`      Response Format: JSON\n`);
    }
    
    if (addedCount === 0) {
      console.log('✅ Alle Gemini Error Handler bereits vorhanden\n');
    } else {
      console.log(`   📊 ${addedCount} Gemini Error Handler Node(s) erstellt\n`);
    }
    
    // 4. Deploy zu n8n
    console.log('🚀 Deploy zu n8n...\n');
    
    const cleanSettings = { 
      executionOrder: workflow.settings?.executionOrder || 'v1' 
    };
    
    const updatePayload = {
      name: workflow.name,
      nodes: nodes,
      connections: connections,
      settings: cleanSettings
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    console.log('   ✅ Workflow aktualisiert\n');
    
    // 5. REPORT
    console.log('📊 REPORT\n');
    console.log('✅ GEMINI ERROR HANDLERS ERSTELLT');
    console.log(`   ✅ ${switchNodes.length} Switch Node(s) entfernt`);
    console.log(`   ✅ ${addedCount} Gemini Error Handler Node(s) erstellt`);
    console.log(`   ✅ Nodes jetzt: ${nodes.length}`);
    console.log('\n   💡 NÄCHSTER SCHRITT: Connections bauen!');
    console.log('   💡 Update Node → Gemini Error Handler → Action Handler\n');
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
  buildGeminiErrorHandlers();
}

module.exports = { buildGeminiErrorHandlers, createGeminiErrorHandlerNode };
