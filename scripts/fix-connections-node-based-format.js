/**
 * 🔧 FIX CONNECTIONS IN NODE-BASED FORMAT
 * Fügt Connections im korrekten node-based Format hinzu:
 * connections["Node Name"] = { main: [[{node: "Target Node Name", ...}]] }
 * 
 * Das ist das Format, das n8n UI verwendet!
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

async function fixConnectionsNodeBased() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX CONNECTIONS IN NODE-BASED FORMAT (UI-FORMAT)');
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
    
    let connectionsAdded = 0;
    
    // 2. Für jeden Strang Connection im node-based Format hinzufügen
    console.log('🔧 Füge Connections im node-based Format hinzu...\n');
    
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
      
      // Initialisiere node-based Format für Update Node
      if (!connections[strand.updateNode]) {
        connections[strand.updateNode] = {};
      }
      if (!connections[strand.updateNode].main) {
        connections[strand.updateNode].main = [[]];
      }
      if (!connections[strand.updateNode].main[0]) {
        connections[strand.updateNode].main[0] = [];
      }
      
      // Prüfe ob Connection bereits existiert
      const connectionExists = connections[strand.updateNode].main[0].some(conn => 
        (typeof conn === 'object' && conn.node === switchNode.name) ||
        (typeof conn === 'string' && conn === switchNode.name)
      );
      
      if (!connectionExists) {
        // Füge Connection hinzu (Node-Name Format!)
        connections[strand.updateNode].main[0].push({
          node: switchNode.name, // WICHTIG: Node-Name, nicht ID!
          type: 'main',
          index: 0
        });
        connectionsAdded++;
        console.log(`   ✅ Connection hinzugefügt: ${strand.updateNode} → Error Handler ${strand.name}`);
        console.log(`      Format: connections["${strand.updateNode}"].main[0] += {node: "${switchNode.name}"}`);
      } else {
        console.log(`   ✅ Connection bereits vorhanden: ${strand.updateNode} → Error Handler ${strand.name}`);
      }
      
      console.log('');
    }
    
    // 3. Deploy zu n8n
    console.log('💾 Speichere Workflow...\n');
    
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
    console.log('✅ CONNECTIONS IM NODE-BASED FORMAT HINZUGEFÜGT');
    console.log(`   ✅ ${connectionsAdded} Connection(s) hinzugefügt`);
    console.log('\n   💡 Connections sind jetzt im korrekten Format!');
    console.log('   💡 Format: connections["Node Name"].main[0] = [{node: "Target Node Name", ...}]');
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
  fixConnectionsNodeBased();
}

module.exports = { fixConnectionsNodeBased };
