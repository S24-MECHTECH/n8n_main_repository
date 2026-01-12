/**
 * CONFIGURE SWITCH NODES
 * Konfiguriert Switch Nodes mit Cases:
 * - Condition: $json.error && ($json.error.code === 429 || 400 || 500) → Output 0 (Error)
 * - Fallback Output: 1 (Success)
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

const switchNodeNames = [
  'Switch Action Handler Adult Flags',
  'Switch Action Handler Images',
  'Switch Action Handler Text',
  'Switch Action Handler Merchant Quality',
  'Switch Action Handler Multi Country',
  'Switch Action Handler GTN/EAN'
];

async function configureSwitchNodes() {
  console.log('\n' + '='.repeat(80));
  console.log('CONFIGURE SWITCH NODES');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY nicht gefunden!');
    }
    
    // 1. Lade Workflow
    console.log('1. LADE WORKFLOW...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`   OK Workflow geladen: ${workflow.nodes.length} Nodes\n`);
    
    let nodesUpdated = 0;
    
    // 2. Konfiguriere jeden Switch Node
    console.log('2. KONFIGURIERE SWITCH NODES...\n');
    
    for (const switchName of switchNodeNames) {
      const switchNode = workflow.nodes.find(n => n.name === switchName);
      
      if (!switchNode) {
        console.log(`   ❌ Switch Node nicht gefunden: ${switchName}`);
        continue;
      }
      
      console.log(`   📋 Konfiguriere: ${switchName}`);
      
      // Setze Mode: Rules (für Cases)
      if (!switchNode.parameters) {
        switchNode.parameters = {};
      }
      
      // IMPORTANT: Remove mode='expression' wenn rules vorhanden sind
      // Rules Mode braucht rules, nicht value
      switchNode.parameters.mode = 'rules';
      
      // Setze Rules: Case für Error (429, 400, 500) → Output 0
      // Condition: $json.error && ($json.error.code === 429 || $json.error.code === 400 || $json.error.code === 500)
      switchNode.parameters.rules = {
        values: [
          {
            conditions: {
              string: [
                {
                  value1: '={{ $json.error && ($json.error.code === 429 || $json.error.code === 400 || $json.error.code === 500) }}',
                  operation: 'equals',
                  value2: 'true'
                }
              ]
            },
            renameOutput: 'Error'
          }
        ]
      };
      
      // Setze Fallback Output: 1 (Success) - direkt im parameters, nicht in options
      switchNode.parameters.fallbackOutput = 1;
      
      // Remove options.fallbackOutput if it exists (wrong location)
      if (switchNode.parameters.options) {
        delete switchNode.parameters.options.fallbackOutput;
        delete switchNode.parameters.options.renameFallbackOutput;
      }
      
      console.log(`   ✅ Mode: Expression`);
      console.log(`   ✅ Condition: Error (429/400/500) → Output 0`);
      console.log(`   ✅ Fallback: Output 1 (Success)\n`);
      
      nodesUpdated++;
    }
    
    console.log(`   OK ${nodesUpdated} Switch Node(s) konfiguriert\n`);
    
    // 3. Workflow speichern
    console.log('3. WORKFLOW SPEICHERN...\n');
    
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections
    };
    
    if (workflow.settings && workflow.settings.executionOrder) {
      updatePayload.settings = { executionOrder: workflow.settings.executionOrder };
    }
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    console.log(`   OK Workflow gespeichert\n`);
    
    // 4. Verbinde Outputs (Output 0 → Gemini, Output 1 → Prepare/Aggregate)
    console.log('4. VERBINDE SWITCH OUTPUTS...\n');
    
    // Finde Gemini Nodes und Prepare/Aggregate Nodes
    const geminiNodes = workflow.nodes.filter(n => 
      n.name.includes('Gemini Error Handler') && 
      n.type.includes('gemini')
    );
    
    const prepareNodes = workflow.nodes.filter(n => 
      n.name.includes('Prepare') || 
      n.name.includes('Aggregate')
    );
    
    function addConnection(workflow, fromNodeName, toNodeName, outputIndex, inputIndex = 0) {
      if (!workflow.connections) {
        workflow.connections = {};
      }
      
      if (!workflow.connections[fromNodeName]) {
        workflow.connections[fromNodeName] = {};
      }
      if (!workflow.connections[fromNodeName].main) {
        workflow.connections[fromNodeName].main = [];
      }
      if (!workflow.connections[fromNodeName].main[outputIndex]) {
        workflow.connections[fromNodeName].main[outputIndex] = [];
      }
      
      const existing = workflow.connections[fromNodeName].main[outputIndex].find(
        c => c.node === toNodeName && c.type === 'main' && c.index === inputIndex
      );
      
      if (!existing) {
        workflow.connections[fromNodeName].main[outputIndex].push({
          node: toNodeName,
          type: 'main',
          index: inputIndex
        });
        return true;
      }
      return false;
    }
    
    let connectionsAdded = 0;
    
    // Für jeden Switch Node:
    for (const switchName of switchNodeNames) {
      // Finde zugehörigen Gemini Node (gleicher Fehler-Typ)
      const switchType = switchName.replace('Switch Action Handler ', '');
      const geminiNode = geminiNodes.find(n => n.name.includes(switchType));
      
      // Output 0 (Error) → Rate Limiting (zurück zum Anfang für Retry)
      const rateLimitingName = switchType.includes('Adult Flags') ? 'Rate Limiting' :
                               switchType.includes('Images') ? 'Rate Limiting Images' :
                               switchType.includes('Text') ? 'Rate Limiting Text' :
                               switchType.includes('Merchant Quality') ? 'Rate Limiting Merchant' :
                               switchType.includes('Multi Country') ? 'Rate Limiting Country' :
                               'Rate Limiting GTN/EAN';
      const rateLimitingNode = workflow.nodes.find(n => n.name === rateLimitingName);
      if (rateLimitingNode && addConnection(workflow, switchName, rateLimitingName, 0, 0)) {
        console.log(`   ✅ ${switchName} Output 0 (Error) → ${rateLimitingName}`);
        connectionsAdded++;
      }
      
      // Output 1 (Success) → Prepare/Aggregate Node
      const prepareNode = prepareNodes.find(n => 
        n.name.includes(switchType.split(' ')[0]) || 
        n.name === 'Aggregate Results2'
      );
      const targetSuccessNode = prepareNode ? prepareNode.name : 'Aggregate Results2';
      
      if (addConnection(workflow, switchName, targetSuccessNode, 1, 0)) {
        console.log(`   ✅ ${switchName} Output 1 (Success) → ${targetSuccessNode}`);
        connectionsAdded++;
      }
    }
    
    console.log(`\n   OK ${connectionsAdded} Connection(s) hinzugefügt\n`);
    
    // 5. Workflow nochmal speichern (mit Connections)
    console.log('5. WORKFLOW SPEICHERN (mit Connections)...\n');
    
    const finalPayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections
    };
    
    if (workflow.settings && workflow.settings.executionOrder) {
      finalPayload.settings = { executionOrder: workflow.settings.executionOrder };
    }
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', finalPayload);
    console.log(`   OK Workflow gespeichert\n`);
    
    // 6. Workflow aktivieren
    console.log('6. WORKFLOW AKTIVIEREN...\n');
    try {
      await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}/activate`, 'POST');
      console.log(`   OK Workflow aktiviert\n`);
    } catch (e) {
      console.log(`   WARN Aktivierung fehlgeschlagen: ${e.message}\n`);
    }
    
    // 7. REPORT
    console.log('='.repeat(80));
    console.log('REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log('OK SWITCH NODES KONFIGURIERT:\n');
    console.log(`   ${nodesUpdated} Switch Node(s) konfiguriert`);
    console.log(`   Mode: Expression`);
    console.log(`   Condition: Error (429/400/500) → Output 0`);
    console.log(`   Fallback: Output 1 (Success)`);
    console.log(`   ${connectionsAdded} Connection(s) erstellt`);
    console.log(`   Output 0 (Error) → Gemini/Rate Limiting`);
    console.log(`   Output 1 (Success) → Prepare/Aggregate`);
    console.log(`   Workflow aktiviert\n`);
    
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
  configureSwitchNodes();
}

module.exports = { configureSwitchNodes };


