/**
 * 🔗 CONNECT GEMINI ERROR HANDLERS
 * Verbindet Rate Limiting Nodes → Gemini Error Handler Nodes
 * Und Gemini Error Handler → Action Nodes
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

const STRANDS = [
  { name: 'Adult Flags', shortName: 'Adult', updateNodeName: 'Update Product Adult Flag' },
  { name: 'Images', shortName: 'Images', updateNodeName: 'Update Product Images' },
  { name: 'Text', shortName: 'Text', updateNodeName: 'Update Product Text' },
  { name: 'Merchant Quality', shortName: 'Quality', updateNodeName: 'Update Merchant Settings' },
  { name: 'Multi Country', shortName: 'Country', updateNodeName: 'Update Country Feeds' },
  { name: 'GTN/EAN', shortName: 'GTNEAN', updateNodeName: 'Update GTN/EAN' }
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

function findNode(workflow, predicate) {
  return workflow.nodes.find(predicate);
}

function addConnection(workflow, fromNode, toNode, outputType = 'main', inputType = 'main', outputIndex = 0, inputIndex = 0) {
  if (!workflow.connections) {
    workflow.connections = {};
  }
  
  const fromName = typeof fromNode === 'string' ? fromNode : fromNode.name;
  const toName = typeof toNode === 'string' ? toNode : toNode.name;
  
  // Beide Connection-Formate (für UI Sichtbarkeit)
  
  // Format 1: connections[nodeName]
  if (!workflow.connections[fromName]) {
    workflow.connections[fromName] = {};
  }
  if (!workflow.connections[fromName][outputType]) {
    workflow.connections[fromName][outputType] = [];
  }
  if (!workflow.connections[fromName][outputType][outputIndex]) {
    workflow.connections[fromName][outputType][outputIndex] = [];
  }
  
  // Prüfe ob Connection bereits existiert
  const existing = workflow.connections[fromName][outputType][outputIndex].find(
    c => c.node === toName && c.type === inputType && c.index === inputIndex
  );
  
  if (!existing) {
    workflow.connections[fromName][outputType][outputIndex].push({
      node: toName,
      type: inputType,
      index: inputIndex
    });
  }
  
  // Format 2: connections.main[0] (für API)
  if (!workflow.connections.main) {
    workflow.connections.main = [];
  }
  if (!workflow.connections.main[0]) {
    workflow.connections.main[0] = [];
  }
  
  const mainConn = {
    node: fromName,
    type: outputType,
    index: outputIndex
  };
  
  const mainExists = workflow.connections.main[0].some(conn => 
    conn.node === fromName && conn.type === outputType && conn.index === outputIndex &&
    conn.connections && conn.connections.some(c => 
      c.node === toName && c.type === inputType && c.index === inputIndex
    )
  );
  
  if (!mainExists) {
    // Finde oder erstelle Connection-Struktur
    let connObj = workflow.connections.main[0].find(c => 
      c.node === fromName && c.type === outputType && c.index === outputIndex
    );
    
    if (!connObj) {
      connObj = {
        node: fromName,
        type: outputType,
        index: outputIndex,
        connections: []
      };
      workflow.connections.main[0].push(connObj);
    }
    
    if (!connObj.connections) {
      connObj.connections = [];
    }
    
    connObj.connections.push({
      node: toName,
      type: inputType,
      index: inputIndex
    });
  }
}

async function connectGeminiErrorHandlers() {
  console.log('\n' + '='.repeat(80));
  console.log('🔗 CONNECT GEMINI ERROR HANDLERS');
  console.log('='.repeat(80) + '\n');
  
  try {
    // 1. Workflow laden
    console.log('1️⃣  WORKFLOW LADEN...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`   ✅ Workflow geladen: ${workflow.nodes.length} Nodes\n`);
    
    let connectionsAdded = 0;
    
    // 2. Für jeden Strang: Rate Limiting → Gemini Error Handler
    console.log('2️⃣  VERBINDE RATE LIMITING → GEMINI ERROR HANDLER...\n');
    
    for (const strand of STRANDS) {
      const errorHandlerName = `Gemini Error Handler ${strand.name}`;
      const errorHandlerNode = findNode(workflow, n => n.name === errorHandlerName);
      
      if (!errorHandlerNode) {
        console.log(`   ⚠️  ${errorHandlerName} nicht gefunden - übersprungen\n`);
        continue;
      }
      
      // Finde Rate Limiting Node
      const rateLimitingNames = [
        `Rate Limiting${strand.name.replace(/\s+/g, '')}`,
        `Rate Limiting ${strand.name}`,
        `Rate Limiting ${strand.shortName}`,
        ...(strand.name === 'GTN/EAN' ? ['Rate Limiting GTN/EAN'] : [])
      ];
      
      let rateLimitingNode = null;
      for (const name of rateLimitingNames) {
        rateLimitingNode = findNode(workflow, n => 
          n.name && n.name.toLowerCase().includes(name.toLowerCase().replace(/\s+/g, ''))
        );
        if (rateLimitingNode) break;
      }
      
      if (rateLimitingNode) {
        addConnection(workflow, rateLimitingNode, errorHandlerNode, 'main', 'main', 0, 0);
        console.log(`   ✅ ${rateLimitingNode.name} → ${errorHandlerName}`);
        connectionsAdded++;
      } else {
        console.log(`   ⚠️  Rate Limiting für ${strand.name} nicht gefunden`);
      }
      
      console.log('');
    }
    
    console.log(`   ✅ ${connectionsAdded} Connection(s) hinzugefügt\n`);
    
    // 3. Gemini Error Handler → Update Node (für RETRY) oder andere Action Nodes
    console.log('3️⃣  VERBINDE GEMINI ERROR HANDLER → ACTION NODES...\n');
    console.log('   ℹ️  Connections zu Action Nodes müssen manuell gebaut werden');
    console.log('   ℹ️  basierend auf Gemini Output (action: RETRY/AUTO_FIX/REROUTE/SKIP/ALERT)\n');
    
    // 4. Workflow speichern
    console.log('4️⃣  WORKFLOW SPEICHERN...\n');
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    console.log(`   ✅ Workflow aktualisiert\n`);
    
    // 5. REPORT
    console.log('='.repeat(80));
    console.log('📊 REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log('✅ CONNECTIONS ERSTELLT:\n');
    console.log(`   ${connectionsAdded} Rate Limiting → Gemini Error Handler\n`);
    
    console.log('📋 NÄCHSTE SCHRITTE:\n');
    console.log('1. Prüfe Gemini Error Handler Nodes in n8n UI');
    console.log('2. Konfiguriere System Prompt in jedem Gemini Node');
    console.log('3. Teste mit Sample Error Data');
    console.log('4. Baue Action Nodes basierend auf Gemini Output\n');
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
  connectGeminiErrorHandlers();
}

module.exports = { connectGeminiErrorHandlers };
