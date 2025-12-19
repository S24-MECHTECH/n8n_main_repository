/**
 * 🔧 FIX CONNECTIONS IN BOTH FORMATS
 * Fügt Connections in BEIDEN n8n-Formaten hinzu:
 * 1. connections.main[0] (Array-Format) - für API
 * 2. connections[nodeName] (Node-Name-Format) - für UI
 * 
 * Das garantiert dass Connections sowohl in API als auch UI sichtbar sind!
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

async function fixConnectionsBothFormats() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX CONNECTIONS IN BOTH FORMATS (API + UI)');
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
    
    console.log(`✅ Workflow: ${workflow.name}\n`);
    
    // Initialisiere connections.main wenn nicht vorhanden
    if (!connections.main) {
      connections.main = [[]];
    } else if (!Array.isArray(connections.main)) {
      connections.main = [[]];
    } else if (!connections.main[0] || !Array.isArray(connections.main[0])) {
      connections.main[0] = [];
    }
    
    let connectionsAddedMain = 0;
    let connectionsAddedNodeBased = 0;
    
    // 2. Für jeden Strang Connections in BEIDEN Formaten hinzufügen
    console.log('🔧 Füge Connections in BEIDEN Formaten hinzu...\n');
    
    for (const strand of strandDefinitions) {
      console.log(`📋 STRANG: ${strand.name}\n`);
      
      // Finde Nodes
      const updateNode = nodes.find(n => n.name === strand.updateNode);
      const switchNode = nodes.find(n => 
        n.name === `Error Handler ${strand.name}` && 
        n.type === 'n8n-nodes-base.switch'
      );
      
      if (!updateNode || !switchNode) {
        console.log(`   ⚠️  Nodes nicht vollständig gefunden - übersprungen\n`);
        continue;
      }
      
      // FORMAT 1: connections.main[0] (Array-Format für API)
      const connectionMainExists = connections.main[0].some(conn => 
        Array.isArray(conn) &&
        conn[0]?.node === updateNode.id && 
        conn[1]?.node === switchNode.id
      );
      
      if (!connectionMainExists) {
        connections.main[0].push([
          { node: updateNode.id, type: 'main', index: 0 },
          { node: switchNode.id, type: 'main', index: 0 }
        ]);
        connectionsAddedMain++;
        console.log(`   ✅ FORMAT 1 (main[0]): Connection hinzugefügt`);
      } else {
        console.log(`   ✅ FORMAT 1 (main[0]): Connection bereits vorhanden`);
      }
      
      // FORMAT 2: connections[updateNodeName] (Node-Name-Format für UI)
      if (!connections[strand.updateNode]) {
        connections[strand.updateNode] = {};
      }
      if (!connections[strand.updateNode].main) {
        connections[strand.updateNode].main = [[]];
      }
      if (!connections[strand.updateNode].main[0]) {
        connections[strand.updateNode].main[0] = [];
      }
      
      const connectionNodeBasedExists = connections[strand.updateNode].main[0].some(conn => 
        (typeof conn === 'object' && conn.node === switchNode.id) ||
        (typeof conn === 'string' && conn === switchNode.id)
      );
      
      if (!connectionNodeBasedExists) {
        connections[strand.updateNode].main[0].push({
          node: switchNode.name, // WICHTIG: Node-Name, nicht ID!
          type: 'main',
          index: 0
        });
        connectionsAddedNodeBased++;
        console.log(`   ✅ FORMAT 2 (node-based): Connection hinzugefügt`);
      } else {
        console.log(`   ✅ FORMAT 2 (node-based): Connection bereits vorhanden`);
      }
      
      console.log(`      ${strand.updateNode} → Error Handler ${strand.name}\n`);
    }
    
    // 3. Deploy zu n8n
    console.log('💾 Speichere Workflow mit BEIDEN Connection-Formaten...\n');
    
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
    
    // 4. REPORT
    console.log('📊 REPORT\n');
    console.log('✅ CONNECTIONS IN BEIDEN FORMATEN HINZUGEFÜGT');
    console.log(`   ✅ ${connectionsAddedMain} Connection(s) zu main[0] hinzugefügt`);
    console.log(`   ✅ ${connectionsAddedNodeBased} Connection(s) zu node-based Format hinzugefügt`);
    console.log('\n   💡 Connections sollten jetzt in BEIDEN Formaten vorhanden sein!');
    console.log('   💡 Das garantiert Sichtbarkeit in API UND UI!');
    console.log('   💡 Browser REFRESH (F5) erforderlich!\n');
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
  fixConnectionsBothFormats();
}

module.exports = { fixConnectionsBothFormats };
