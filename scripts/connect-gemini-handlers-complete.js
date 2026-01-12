/**
 * CONNECT GEMINI ERROR HANDLERS COMPLETE
 * Findet alle Nodes und baut Connections richtig auf
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

const STRANDS = [
  { name: 'Adult Flags', shortName: 'Adult', rateLimitPatterns: ['Rate Limiting', 'Rate Limiting Adult'] },
  { name: 'Images', shortName: 'Images', rateLimitPatterns: ['Rate Limiting Images'] },
  { name: 'Text', shortName: 'Text', rateLimitPatterns: ['Rate Limiting Text'] },
  { name: 'Merchant Quality', shortName: 'Quality', rateLimitPatterns: ['Rate Limiting Merchant'] },
  { name: 'Multi Country', shortName: 'Country', rateLimitPatterns: ['Rate Limiting Country'] },
  { name: 'GTN/EAN', shortName: 'GTNEAN', rateLimitPatterns: ['Rate Limiting GTN/EAN'] }
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

function ensureConnectionsStructure(workflow) {
  if (!workflow.connections) {
    workflow.connections = {};
  }
  
  // Stelle sicher dass connections[nodeName] Format existiert
  // Format 1: connections[nodeName][outputType][index] = [{ node, type, index }]
  if (!workflow.connections.main) {
    workflow.connections.main = [];
  }
  if (!Array.isArray(workflow.connections.main)) {
    workflow.connections.main = [workflow.connections.main];
  }
  if (!workflow.connections.main[0]) {
    workflow.connections.main[0] = [];
  }
}

function addConnection(workflow, fromNodeName, toNodeName, outputType = 'main', inputType = 'main', outputIndex = 0, inputIndex = 0) {
  ensureConnectionsStructure(workflow);
  
  // Format 1: connections[nodeName] (für UI Sichtbarkeit)
  if (!workflow.connections[fromNodeName]) {
    workflow.connections[fromNodeName] = {};
  }
  if (!workflow.connections[fromNodeName][outputType]) {
    workflow.connections[fromNodeName][outputType] = [];
  }
  if (!workflow.connections[fromNodeName][outputType][outputIndex]) {
    workflow.connections[fromNodeName][outputType][outputIndex] = [];
  }
  
  // Prüfe ob Connection bereits existiert
  const existing = workflow.connections[fromNodeName][outputType][outputIndex].find(
    c => c.node === toNodeName && c.type === inputType && c.index === inputIndex
  );
  
  if (!existing) {
    workflow.connections[fromNodeName][outputType][outputIndex].push({
      node: toNodeName,
      type: inputType,
      index: inputIndex
    });
  }
}

async function connectGeminiHandlersComplete() {
  console.log('\n' + '='.repeat(80));
  console.log('CONNECT GEMINI ERROR HANDLERS COMPLETE');
  console.log('='.repeat(80) + '\n');
  
  try {
    console.log('1. WORKFLOW LADEN...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`   OK Workflow geladen: ${workflow.nodes.length} Nodes\n`);
    
    // Zeige alle Rate Limiting Nodes
    console.log('2. FINDE ALLE RATE LIMITING NODES...\n');
    const allRateLimitingNodes = workflow.nodes.filter(n => 
      n.type === 'n8n-nodes-base.wait' && 
      n.name && n.name.toLowerCase().includes('rate limiting')
    );
    
    allRateLimitingNodes.forEach(n => {
      console.log(`   - ${n.name} (${n.id})`);
    });
    console.log('');
    
    // Zeige alle Gemini Error Handler Nodes
    console.log('3. FINDE ALLE GEMINI ERROR HANDLER NODES...\n');
    const allGeminiErrorHandlers = workflow.nodes.filter(n => 
      n.name && n.name.includes('Gemini Error Handler')
    );
    
    allGeminiErrorHandlers.forEach(n => {
      console.log(`   - ${n.name} (${n.id})`);
    });
    console.log('');
    
    let connectionsAdded = 0;
    
    console.log('4. VERBINDE RATE LIMITING -> GEMINI ERROR HANDLER...\n');
    
    for (const strand of STRANDS) {
      const errorHandlerName = `Gemini Error Handler ${strand.name}`;
      const errorHandlerNode = workflow.nodes.find(n => n.name === errorHandlerName);
      
      if (!errorHandlerNode) {
        console.log(`   WARN ${errorHandlerName} nicht gefunden\n`);
        continue;
      }
      
      // Suche Rate Limiting Node mit verschiedenen Patterns
      let rateLimitingNode = null;
      
      for (const pattern of strand.rateLimitPatterns) {
        rateLimitingNode = workflow.nodes.find(n => 
          n.name === pattern || n.name.toLowerCase() === pattern.toLowerCase()
        );
        if (rateLimitingNode) break;
      }
      
      // Fallback: Suche nach "Rate Limiting" (für Adult Flags)
      if (!rateLimitingNode && strand.name === 'Adult Flags') {
        rateLimitingNode = workflow.nodes.find(n => 
          n.name === 'Rate Limiting' && n.type === 'n8n-nodes-base.wait'
        );
      }
      
      // Fallback: Suche nach "Rate Limiting GTN/EAN" für GTN/EAN
      if (!rateLimitingNode && strand.name === 'GTN/EAN') {
        rateLimitingNode = workflow.nodes.find(n => 
          (n.name === 'Rate Limiting GTN/EAN' || n.name.includes('GTN')) &&
          n.type === 'n8n-nodes-base.wait'
        );
      }
      
      if (rateLimitingNode) {
        addConnection(workflow, rateLimitingNode.name, errorHandlerName, 'main', 'main', 0, 0);
        console.log(`   OK ${rateLimitingNode.name} -> ${errorHandlerName}`);
        connectionsAdded++;
      } else {
        console.log(`   WARN Rate Limiting für ${strand.name} nicht gefunden`);
        console.log(`      Gesucht nach: ${strand.rateLimitPatterns.join(', ')}`);
      }
      console.log('');
    }
    
    console.log(`   OK ${connectionsAdded} Connection(s) hinzugefuegt\n`);
    
    console.log('5. WORKFLOW SPEICHERN...\n');
    
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections
    };
    
    // Nur executionOrder in settings falls vorhanden
    if (workflow.settings && workflow.settings.executionOrder) {
      updatePayload.settings = { executionOrder: workflow.settings.executionOrder };
    }
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    console.log(`   OK Workflow gespeichert\n`);
    
    console.log('6. WORKFLOW AKTIVIEREN...\n');
    try {
      await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}/activate`, 'POST');
      console.log(`   OK Workflow aktiviert\n`);
    } catch (e) {
      console.log(`   WARN Aktivierung fehlgeschlagen: ${e.message}`);
      console.log(`   Hinweis: Workflow kann manuell in UI aktiviert werden\n`);
    }
    
    console.log('='.repeat(80));
    console.log('REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log('OK CONNECTIONS ERSTELLT:\n');
    console.log(`   ${connectionsAdded} Rate Limiting -> Gemini Error Handler\n`);
    
    console.log('NACHSTE SCHRITTE:\n');
    console.log('1. Pruefe Connections in n8n UI');
    console.log('2. Teste jeden Strang einzeln');
    console.log('3. Baue Code Nodes fuer JSON Input/Output\n');
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
  connectGeminiHandlersComplete();
}

module.exports = { connectGeminiHandlersComplete };
