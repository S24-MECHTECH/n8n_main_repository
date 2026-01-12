/**
 * 🔧 FIX SWITCH NODES POSITIONS & CONNECTIONS
 * Korrigiert Positionen und Connections für Switch Error Handler
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

async function fixPositionsAndConnections() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX SWITCH NODES POSITIONS & CONNECTIONS');
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
    
    // Initialisiere connections
    if (!connections.main) connections.main = [[]];
    if (!connections.main[0]) connections.main[0] = [];
    
    let positionFixed = 0;
    let connectionsAdded = 0;
    
    // 2. Für jeden Strang Positionen und Connections prüfen
    console.log('🔧 Prüfe und korrigiere Positionen & Connections...\n');
    
    for (const strand of strandDefinitions) {
      console.log(`📋 STRANG: ${strand.name}\n`);
      
      // Finde Update Node
      const updateNode = nodes.find(n => n.name === strand.updateNode);
      if (!updateNode) {
        console.log(`   ⚠️  ${strand.updateNode} nicht gefunden - übersprungen\n`);
        continue;
      }
      
      // Finde Switch Node
      const switchNode = nodes.find(n => 
        n.name === `Error Handler ${strand.name}` && 
        n.type === 'n8n-nodes-base.switch'
      );
      
      if (!switchNode) {
        console.log(`   ⚠️  Switch Node nicht gefunden - übersprungen\n`);
        continue;
      }
      
      // 3. Korrigiere Position (rechts neben Update Node)
      const expectedX = updateNode.position[0] + 350;
      const expectedY = updateNode.position[1];
      
      if (switchNode.position[0] !== expectedX || switchNode.position[1] !== expectedY) {
        switchNode.position = [expectedX, expectedY];
        positionFixed++;
        console.log(`   ✅ Position korrigiert: [${expectedX}, ${expectedY}]`);
      } else {
        console.log(`   ✅ Position korrekt: [${switchNode.position[0]}, ${switchNode.position[1]}]`);
      }
      
      // 4. Prüfe Connection: Update Node → Switch Node
      const connectionExists = connections.main[0].some(conn => 
        conn[0]?.node === updateNode.id && conn[1]?.node === switchNode.id
      );
      
      if (!connectionExists) {
        connections.main[0].push([
          { node: updateNode.id, type: 'main', index: 0 },
          { node: switchNode.id, type: 'main', index: 0 }
        ]);
        connectionsAdded++;
        console.log(`   ✅ Connection hinzugefügt: ${strand.updateNode} → Error Handler ${strand.name}`);
      } else {
        console.log(`   ✅ Connection vorhanden: ${strand.updateNode} → Error Handler ${strand.name}`);
      }
      
      console.log('');
    }
    
    // 5. Deploy zu n8n
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
    
    // 6. REPORT
    console.log('📊 REPORT\n');
    console.log('✅ POSITIONEN & CONNECTIONS KORRIGIERT');
    console.log(`   ✅ ${positionFixed} Position(en) korrigiert`);
    console.log(`   ✅ ${connectionsAdded} Connection(s) hinzugefügt`);
    console.log('\n   💡 Switch Nodes sollten jetzt richtig positioniert sein!');
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
  fixPositionsAndConnections();
}

module.exports = { fixPositionsAndConnections };
