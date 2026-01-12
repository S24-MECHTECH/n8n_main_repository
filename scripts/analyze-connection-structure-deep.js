/**
 * 🔍 DEEP ANALYZE CONNECTION STRUCTURE
 * Analysiert die tatsächliche Connection-Struktur im Workflow
 * Findet heraus warum Connections nicht sichtbar sind
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

async function analyzeConnections() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 DEEP CONNECTION STRUCTURE ANALYSIS');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      console.error('❌ N8N_API_KEY fehlt!');
      process.exit(1);
    }
    
    // 1. Workflow laden
    console.log('📥 Lade Workflow...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || {};
    
    console.log(`✅ Workflow: ${workflow.name}`);
    console.log(`   Nodes: ${nodes.length}\n`);
    
    // 2. Prüfe n8n Version (falls verfügbar)
    try {
      const healthCheck = await n8nRequest('/healthz');
      console.log('📋 n8n Health Check:');
      console.log(`   ${JSON.stringify(healthCheck, null, 2)}\n`);
    } catch (e) {
      console.log('⚠️  Health Check nicht verfügbar\n');
    }
    
    // 3. Analysiere Connection-Struktur
    console.log('🔍 ANALYSE CONNECTION-STRUKTUR:\n');
    console.log(`   Connections Type: ${typeof connections}`);
    console.log(`   Connections Keys: ${Object.keys(connections).join(', ')}\n`);
    
    // 4. Prüfe verschiedene Connection-Formate
    console.log('📋 CONNECTION-FORMAT ANALYSE:\n');
    
    if (connections.main) {
      console.log('   ✅ connections.main existiert');
      console.log(`   Type: ${Array.isArray(connections.main) ? 'Array' : typeof connections.main}`);
      
      if (Array.isArray(connections.main)) {
        console.log(`   Length: ${connections.main.length}`);
        console.log(`   First element: ${JSON.stringify(connections.main[0]?.slice(0, 2) || 'empty', null, 6)}`);
      } else if (connections.main[0]) {
        console.log(`   connections.main[0] Type: ${Array.isArray(connections.main[0]) ? 'Array' : typeof connections.main[0]}`);
        if (Array.isArray(connections.main[0])) {
          console.log(`   connections.main[0] Length: ${connections.main[0].length}`);
        }
      }
    } else {
      console.log('   ❌ connections.main existiert NICHT!');
    }
    
    // 5. Finde Switch Nodes und ihre Connections
    console.log('\n🔍 SWITCH NODE CONNECTIONS:\n');
    
    const switchNodes = nodes.filter(n => 
      n.type === 'n8n-nodes-base.switch' && 
      n.name && n.name.includes('Error Handler')
    );
    
    const strandDefinitions = [
      { name: 'Adult', updateNode: 'Update Product Adult Flag' },
      { name: 'Images', updateNode: 'Update Product Images' },
      { name: 'Text', updateNode: 'Update Product Text' },
      { name: 'Quality', updateNode: 'Update Merchant Settings' },
      { name: 'Country', updateNode: 'Update Country Feeds' },
      { name: 'GTN/EAN', updateNode: 'Update GTN/EAN' }
    ];
    
    for (const strand of strandDefinitions) {
      const updateNode = nodes.find(n => n.name === strand.updateNode);
      const switchNode = switchNodes.find(n => n.name === `Error Handler ${strand.name}`);
      
      if (!updateNode || !switchNode) {
        console.log(`   ⚠️  ${strand.name}: Nodes nicht vollständig gefunden`);
        continue;
      }
      
      // Suche Connection in verschiedenen Formaten
      let foundConnection = false;
      let connectionFormat = null;
      
      // Format 1: connections.main[0] = [[from, to], ...]
      if (connections.main && Array.isArray(connections.main) && connections.main[0]) {
        const conn = connections.main[0].find(c => 
          Array.isArray(c) && 
          c[0]?.node === updateNode.id && 
          c[1]?.node === switchNode.id
        );
        if (conn) {
          foundConnection = true;
          connectionFormat = 'main[0] array';
          console.log(`   ✅ ${strand.name}: Connection gefunden (Format: main[0] array)`);
          console.log(`      ${updateNode.name} (${updateNode.id}) → ${switchNode.name} (${switchNode.id})`);
        }
      }
      
      // Format 2: connections[updateNode.id] = { main: [[switchNode.id]] }
      if (!foundConnection && connections[updateNode.id]) {
        const nodeConnections = connections[updateNode.id];
        if (nodeConnections.main && Array.isArray(nodeConnections.main) && nodeConnections.main[0]) {
          const conn = nodeConnections.main[0].find(c => 
            (typeof c === 'string' && c === switchNode.id) ||
            (c && c.node === switchNode.id)
          );
          if (conn) {
            foundConnection = true;
            connectionFormat = 'node-based';
            console.log(`   ✅ ${strand.name}: Connection gefunden (Format: node-based)`);
          }
        }
      }
      
      if (!foundConnection) {
        console.log(`   ❌ ${strand.name}: KEINE Connection gefunden!`);
        console.log(`      Update: ${updateNode.name} (${updateNode.id})`);
        console.log(`      Switch: ${switchNode.name} (${switchNode.id})`);
      }
    }
    
    // 6. Speichere vollständige Connection-Struktur
    fs.writeFileSync(
      path.join(__dirname, '..', 'connection-structure-full.json'),
      JSON.stringify(connections, null, 2)
    );
    console.log('\n   💾 Vollständige Connection-Struktur gespeichert: connection-structure-full.json');
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  analyzeConnections();
}

module.exports = { analyzeConnections };
