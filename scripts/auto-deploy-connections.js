/**
 * AUTO-DEPLOY CONNECTIONS
 * Lädt connections.json von GitHub und deployed zu n8n
 * FIXED: Settings Problem - nur executionOrder erlaubt
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';
const CONNECTIONS_FILE = path.join(__dirname, '..', 'claude-outputs', 'connections.json');

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

function addConnection(workflow, fromNodeName, toNodeName, outputType = 'main', inputType = 'main', outputIndex = 0, inputIndex = 0) {
  if (!workflow.connections) {
    workflow.connections = {};
  }
  
  // Format: connections[nodeName][outputType][index] = [{ node, type, index }]
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

async function autoDeployConnections() {
  console.log('\n' + '='.repeat(80));
  console.log('AUTO-DEPLOY CONNECTIONS FROM GITHUB');
  console.log('='.repeat(80) + '\n');
  
  try {
    // 1. Lade connections.json
    console.log('1. LADE CONNECTIONS.JSON...\n');
    if (!fs.existsSync(CONNECTIONS_FILE)) {
      throw new Error(`Connections file nicht gefunden: ${CONNECTIONS_FILE}`);
    }
    
    const connectionsData = JSON.parse(fs.readFileSync(CONNECTIONS_FILE, 'utf8'));
    const connections = connectionsData.connections || [];
    console.log(`   OK ${connections.length} Connection(s) geladen\n`);
    
    // 2. Lade Workflow
    console.log('2. LADE WORKFLOW...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`   OK Workflow geladen: ${workflow.nodes.length} Nodes\n`);
    
    // 3. Füge Connections hinzu
    console.log('3. FUEGE CONNECTIONS HINZU...\n');
    let connectionsAdded = 0;
    
    for (const conn of connections) {
      // Prüfe ob Nodes existieren
      const fromNode = workflow.nodes.find(n => n.name === conn.from);
      const toNode = workflow.nodes.find(n => n.name === conn.to);
      
      if (!fromNode) {
        console.log(`   WARN From Node nicht gefunden: ${conn.from}\n`);
        continue;
      }
      
      if (!toNode) {
        console.log(`   WARN To Node nicht gefunden: ${conn.to}\n`);
        continue;
      }
      
      addConnection(
        workflow,
        conn.from,
        conn.to,
        conn.outputType || 'main',
        conn.inputType || 'main',
        conn.outputIndex || 0,
        conn.inputIndex || 0
      );
      
      console.log(`   OK ${conn.from} -> ${conn.to}`);
      connectionsAdded++;
    }
    
    console.log(`\n   OK ${connectionsAdded} Connection(s) hinzugefuegt\n`);
    
    // 4. Workflow speichern (FIXED: Settings Problem)
    console.log('4. WORKFLOW SPEICHERN (FIXED SETTINGS)...\n');
    
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections
    };
    
    // FIXED: Nur executionOrder in settings (falls vorhanden)
    // Alle anderen Properties werden entfernt!
    if (workflow.settings && workflow.settings.executionOrder) {
      updatePayload.settings = { executionOrder: workflow.settings.executionOrder };
    }
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    console.log(`   OK Workflow gespeichert (Settings gefixt)\n`);
    
    // 5. Workflow aktivieren
    console.log('5. WORKFLOW AKTIVIEREN...\n');
    try {
      await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}/activate`, 'POST');
      console.log(`   OK Workflow aktiviert\n`);
    } catch (e) {
      console.log(`   WARN Aktivierung fehlgeschlagen: ${e.message}\n`);
    }
    
    // 6. REPORT
    console.log('='.repeat(80));
    console.log('REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log('OK DEPLOYMENT ERFOLGREICH:\n');
    console.log(`   ${connectionsAdded} Connection(s) deployed`);
    console.log(`   Settings Problem gefixt (nur executionOrder)\n`);
    
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
  autoDeployConnections();
}

module.exports = { autoDeployConnections };
