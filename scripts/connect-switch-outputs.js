/**
 * CONNECT SWITCH OUTPUTS
 * Verbindet Switch Node Outputs (RETRY/AUTO_FIX/REROUTE/ALERT) zu entsprechenden Nodes
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

// Mapping: Switch Node → Rate Limiting Node (für RETRY/AUTO_FIX Outputs)
const switchToRateLimiting = [
  {
    switch: 'Switch Action Handler Adult Flags',
    rateLimiting: 'Rate Limiting'
  },
  {
    switch: 'Switch Action Handler Images',
    rateLimiting: 'Rate Limiting Images'
  },
  {
    switch: 'Switch Action Handler Text',
    rateLimiting: 'Rate Limiting Text'
  },
  {
    switch: 'Switch Action Handler Merchant Quality',
    rateLimiting: 'Rate Limiting Merchant'
  },
  {
    switch: 'Switch Action Handler Multi Country',
    rateLimiting: 'Rate Limiting Country'
  },
  {
    switch: 'Switch Action Handler GTN/EAN',
    rateLimiting: 'Rate Limiting GTN/EAN'
  }
];

async function connectSwitchOutputs() {
  console.log('\n' + '='.repeat(80));
  console.log('CONNECT SWITCH OUTPUTS');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY nicht gefunden!');
    }
    
    // 1. Lade Workflow
    console.log('1. LADE WORKFLOW...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`   OK Workflow geladen: ${workflow.nodes.length} Nodes\n`);
    
    if (!workflow.connections) {
      workflow.connections = {};
    }
    
    // 2. Verbinde Switch Outputs
    console.log('2. VERBINDE SWITCH OUTPUTS...\n');
    
    let connectionsAdded = 0;
    
    for (const mapping of switchToRateLimiting) {
      const switchNode = workflow.nodes.find(n => n.name === mapping.switch);
      const rateLimitingNode = workflow.nodes.find(n => n.name === mapping.rateLimiting);
      
      if (!switchNode) {
        console.log(`   WARN Switch Node nicht gefunden: ${mapping.switch}`);
        continue;
      }
      
      if (!rateLimitingNode) {
        console.log(`   WARN Rate Limiting Node nicht gefunden: ${mapping.rateLimiting}`);
        continue;
      }
      
      // RETRY Output (0) → Rate Limiting
      if (addConnection(workflow, mapping.switch, mapping.rateLimiting, 'main', 'main', 0, 0)) {
        console.log(`   ✅ ${mapping.switch} RETRY (0) → ${mapping.rateLimiting}`);
        connectionsAdded++;
      }
      
      // AUTO_FIX Output (1) → Rate Limiting (zurück mit fixed product)
      if (addConnection(workflow, mapping.switch, mapping.rateLimiting, 'main', 'main', 1, 0)) {
        console.log(`   ✅ ${mapping.switch} AUTO_FIX (1) → ${mapping.rateLimiting}`);
        connectionsAdded++;
      }
      
      // REROUTE Output (2) → Finde Log/Aggregate Node (oder Rate Limiting als Fallback)
      // Für jetzt: auch zu Rate Limiting
      const logNode = workflow.nodes.find(n => 
        n.name.includes('Log') || 
        n.name.includes('Aggregate') ||
        n.name.includes('Results')
      );
      const rerouteTarget = logNode ? logNode.name : mapping.rateLimiting;
      
      if (addConnection(workflow, mapping.switch, rerouteTarget, 'main', 'main', 2, 0)) {
        console.log(`   ✅ ${mapping.switch} REROUTE (2) → ${rerouteTarget}`);
        connectionsAdded++;
      }
      
      // ALERT Output (3) → Log Node
      const alertNode = workflow.nodes.find(n => 
        n.name.includes('Log') || 
        n.name === 'Log Results to Sheets' ||
        n.name === 'Log Results_Sheets_01'
      );
      const alertTarget = alertNode ? alertNode.name : rerouteTarget;
      
      if (addConnection(workflow, mapping.switch, alertTarget, 'main', 'main', 3, 0)) {
        console.log(`   ✅ ${mapping.switch} ALERT (3) → ${alertTarget}`);
        connectionsAdded++;
      }
    }
    
    console.log(`\n   OK ${connectionsAdded} Connection(s) hinzugefügt\n`);
    
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
    
    // 4. Workflow aktivieren
    console.log('4. WORKFLOW AKTIVIEREN...\n');
    try {
      await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}/activate`, 'POST');
      console.log(`   OK Workflow aktiviert\n`);
    } catch (e) {
      console.log(`   WARN Aktivierung fehlgeschlagen: ${e.message}\n`);
    }
    
    // 5. REPORT
    console.log('='.repeat(80));
    console.log('REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log('OK SWITCH OUTPUTS VERBUNDEN:\n');
    console.log(`   ${connectionsAdded} Connection(s) erstellt`);
    console.log(`   RETRY/AUTO_FIX → Rate Limiting`);
    console.log(`   REROUTE/ALERT → Log Nodes`);
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
  connectSwitchOutputs();
}

module.exports = { connectSwitchOutputs };
