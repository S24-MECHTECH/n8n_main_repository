/**
 * AUTO-DEPLOY SWITCH NODES
 * Deployed 6 Switch Action Handler Nodes für Gemini Error Handler
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

// Switch Node Definitions
const switchNodes = [
  {
    id: 'switch-action-adult-flags',
    name: 'Switch Action Handler Adult Flags',
    position: [1200, 200],
    geminiNode: 'Gemini Error Handler Adult Flags'
  },
  {
    id: 'switch-action-images',
    name: 'Switch Action Handler Images',
    position: [1200, 400],
    geminiNode: 'Gemini Error Handler Images'
  },
  {
    id: 'switch-action-text',
    name: 'Switch Action Handler Text',
    position: [1200, 600],
    geminiNode: 'Gemini Error Handler Text'
  },
  {
    id: 'switch-action-merchant-quality',
    name: 'Switch Action Handler Merchant Quality',
    position: [1200, 800],
    geminiNode: 'Gemini Error Handler Merchant Quality'
  },
  {
    id: 'switch-action-multi-country',
    name: 'Switch Action Handler Multi Country',
    position: [1200, 1000],
    geminiNode: 'Gemini Error Handler Multi Country'
  },
  {
    id: 'switch-action-gtn-ean',
    name: 'Switch Action Handler GTN/EAN',
    position: [1200, 1200],
    geminiNode: 'Gemini Error Handler GTN/EAN'
  }
];

function createSwitchNode(definition) {
  return {
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          {
            conditions: {
              string: [
                {
                  value1: '={{ $json.action }}',
                  operation: 'equals',
                  value2: 'RETRY'
                }
              ]
            },
            renameOutput: 'RETRY'
          },
          {
            conditions: {
              string: [
                {
                  value1: '={{ $json.action }}',
                  operation: 'equals',
                  value2: 'AUTO_FIX'
                }
              ]
            },
            renameOutput: 'AUTO_FIX'
          },
          {
            conditions: {
              string: [
                {
                  value1: '={{ $json.action }}',
                  operation: 'equals',
                  value2: 'REROUTE'
                }
              ]
            },
            renameOutput: 'REROUTE'
          }
        ]
      },
      fallbackOutput: 'ALERT',
      options: {}
    },
    type: 'n8n-nodes-base.switch',
    typeVersion: 3,
    position: definition.position,
    id: definition.id,
    name: definition.name
  };
}

function addConnection(workflow, fromNodeName, toNodeName, outputType = 'main', inputType = 'main', outputIndex = 0, inputIndex = 0) {
  if (!workflow.connections) {
    workflow.connections = {};
  }
  
  if (!workflow.connections[fromNodeName]) {
    workflow.connections[fromNodeName] = {};
  }
  if (!workflow.connections[fromNodeName][outputType]) {
    workflow.connections[fromNodeName][outputType] = [];
  }
  if (!workflow.connections[fromNodeName][outputType][outputIndex]) {
    workflow.connections[fromNodeName][outputType][outputIndex] = [];
  }
  
  const existing = workflow.connections[fromNodeName][outputType][outputIndex].find(
    c => c.node === toNodeName && c.type === inputType && c.index === inputIndex
  );
  
  if (!existing) {
    workflow.connections[fromNodeName][outputType][outputIndex].push({
      node: toNodeName,
      type: inputType,
      index: inputIndex
    });
    return true;
  }
  return false;
}

async function autoDeploySwitchNodes() {
  console.log('\n' + '='.repeat(80));
  console.log('AUTO-DEPLOY SWITCH NODES');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY nicht gefunden!');
    }
    
    // 1. Lade Workflow
    console.log('1. LADE WORKFLOW...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`   OK Workflow geladen: ${workflow.nodes.length} Nodes\n`);
    
    // 2. Prüfe existierende Nodes
    console.log('2. PRÜFE EXISTIERENDE SWITCH NODES...\n');
    const existingNodes = new Map(workflow.nodes.map(n => [n.id, n]));
    const existingNames = new Set(workflow.nodes.map(n => n.name));
    
    let nodesToAdd = [];
    
    for (const def of switchNodes) {
      if (existingNodes.has(def.id) || existingNames.has(def.name)) {
        console.log(`   ⚠️  Switch Node existiert bereits: ${def.name}`);
      } else {
        console.log(`   ✅ Switch Node wird hinzugefügt: ${def.name}`);
        nodesToAdd.push(def);
      }
    }
    
    console.log(`\n   ${nodesToAdd.length} neue Switch Node(s) werden hinzugefügt\n`);
    
    // 3. Erstelle Switch Nodes
    if (nodesToAdd.length > 0) {
      console.log('3. ERSTELLE SWITCH NODES...\n');
      
      for (const def of nodesToAdd) {
        const switchNode = createSwitchNode(def);
        workflow.nodes.push(switchNode);
        console.log(`   OK ${def.name} erstellt`);
      }
      
      console.log(`\n   OK ${nodesToAdd.length} Switch Node(s) erstellt\n`);
    } else {
      console.log('   ✅ Alle Switch Nodes bereits vorhanden\n');
    }
    
    // 4. Füge Connections hinzu (Gemini → Switch)
    console.log('4. VERBINDE GEMINI → SWITCH...\n');
    
    if (!workflow.connections) {
      workflow.connections = {};
    }
    
    let connectionsAdded = 0;
    for (const def of switchNodes) {
      const geminiNode = workflow.nodes.find(n => n.name === def.geminiNode);
      const switchNode = workflow.nodes.find(n => n.id === def.id || n.name === def.name);
      
      if (!geminiNode) {
        console.log(`   WARN Gemini Node nicht gefunden: ${def.geminiNode}`);
        continue;
      }
      
      if (!switchNode) {
        console.log(`   WARN Switch Node nicht gefunden: ${def.name}`);
        continue;
      }
      
      if (addConnection(workflow, geminiNode.name, switchNode.name)) {
        console.log(`   OK ${geminiNode.name} → ${switchNode.name}`);
        connectionsAdded++;
      } else {
        console.log(`   ⚠️  Connection existiert bereits: ${geminiNode.name} → ${switchNode.name}`);
      }
    }
    
    console.log(`\n   OK ${connectionsAdded} Connection(s) hinzugefügt\n`);
    
    // 5. Workflow speichern
    console.log('5. WORKFLOW SPEICHERN...\n');
    
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
    
    console.log('OK DEPLOYMENT ERFOLGREICH:\n');
    console.log(`   ${nodesToAdd.length} Switch Node(s) deployed`);
    console.log(`   ${connectionsAdded} Connection(s) erstellt`);
    console.log(`   Workflow aktiviert\n`);
    
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
  autoDeploySwitchNodes();
}

module.exports = { autoDeploySwitchNodes };
