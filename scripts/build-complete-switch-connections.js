/**
 * 🔗 BUILD COMPLETE SWITCH CONNECTIONS
 * Baut vollständige Connections für Switch Error Handler:
 * - Update Node → Error Handler Switch ✅ (bereits vorhanden)
 * - Error Handler Switch → RETRY → Wait → Update Node (Loop-back)
 * - Error Handler Switch → REROUTE → Handle Invalid Priority
 * - Error Handler Switch → SKIP → Log Node
 * - Error Handler Switch → ALERT → Log Node
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
  { name: 'Adult', updateNode: 'Update Product Adult Flag', rateLimitNode: 'Rate Limiting' },
  { name: 'Images', updateNode: 'Update Product Images', rateLimitNode: 'Rate Limiting Images' },
  { name: 'Text', updateNode: 'Update Product Text', rateLimitNode: 'Rate Limiting Text' },
  { name: 'Quality', updateNode: 'Update Merchant Settings', rateLimitNode: 'Rate Limiting Merchant' },
  { name: 'Country', updateNode: 'Update Country Feeds', rateLimitNode: 'Rate Limiting Country' },
  { name: 'GTN/EAN', updateNode: 'Update GTN/EAN', rateLimitNode: 'Rate Limiting GTN/EAN' }
];

async function buildCompleteConnections() {
  console.log('\n' + '='.repeat(80));
  console.log('🔗 BUILD COMPLETE SWITCH CONNECTIONS');
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
    
    // Finde gemeinsame Nodes
    const handleInvalidPriorityNode = nodes.find(n => n.name === 'Handle Invalid Priority');
    const logResultsNode = nodes.find(n => n.name === 'Log Results to Sheets');
    
    let connectionsAdded = 0;
    
    // 2. Für jeden Strang vollständige Connections bauen
    console.log('🔗 Baue vollständige Connections...\n');
    
    for (const strand of strandDefinitions) {
      console.log(`📋 STRANG: ${strand.name}\n`);
      
      // Finde Nodes
      const updateNode = nodes.find(n => n.name === strand.updateNode);
      const switchNode = nodes.find(n => 
        n.name === `Error Handler ${strand.name}` && 
        n.type === 'n8n-nodes-base.switch'
      );
      const rateLimitNode = nodes.find(n => n.name === strand.rateLimitNode);
      
      if (!updateNode || !switchNode) {
        console.log(`   ⚠️  Nodes nicht vollständig gefunden - übersprungen\n`);
        continue;
      }
      
      // Initialisiere node-based Format für Switch Node
      if (!connections[switchNode.name]) {
        connections[switchNode.name] = {};
      }
      if (!connections[switchNode.name].main) {
        connections[switchNode.name].main = [[], [], [], []]; // 4 Outputs: RETRY, REROUTE, SKIP, ALERT
      }
      
      // Output 0: RETRY → Rate Limiting (oder direkt zurück zu Update)
      if (rateLimitNode && !connections[switchNode.name].main[0]) {
        connections[switchNode.name].main[0] = [];
      }
      if (rateLimitNode) {
        const retryExists = connections[switchNode.name].main[0]?.some(conn => 
          (typeof conn === 'object' && conn.node === rateLimitNode.name) ||
          (typeof conn === 'string' && conn === rateLimitNode.name)
        );
        
        if (!retryExists) {
          if (!connections[switchNode.name].main[0]) connections[switchNode.name].main[0] = [];
          connections[switchNode.name].main[0].push({
            node: rateLimitNode.name,
            type: 'main',
            index: 0
          });
          connectionsAdded++;
          console.log(`   ✅ RETRY → ${rateLimitNode.name}`);
        }
      }
      
      // Output 1: REROUTE → Handle Invalid Priority
      if (handleInvalidPriorityNode) {
        if (!connections[switchNode.name].main[1]) connections[switchNode.name].main[1] = [];
        const rerouteExists = connections[switchNode.name].main[1].some(conn => 
          (typeof conn === 'object' && conn.node === handleInvalidPriorityNode.name) ||
          (typeof conn === 'string' && conn === handleInvalidPriorityNode.name)
        );
        
        if (!rerouteExists) {
          connections[switchNode.name].main[1].push({
            node: handleInvalidPriorityNode.name,
            type: 'main',
            index: 0
          });
          connectionsAdded++;
          console.log(`   ✅ REROUTE → Handle Invalid Priority`);
        }
      }
      
      // Output 2: SKIP → Log Results (optional)
      if (logResultsNode) {
        if (!connections[switchNode.name].main[2]) connections[switchNode.name].main[2] = [];
        const skipExists = connections[switchNode.name].main[2].some(conn => 
          (typeof conn === 'object' && conn.node === logResultsNode.name) ||
          (typeof conn === 'string' && conn === logResultsNode.name)
        );
        
        if (!skipExists) {
          connections[switchNode.name].main[2].push({
            node: logResultsNode.name,
            type: 'main',
            index: 0
          });
          connectionsAdded++;
          console.log(`   ✅ SKIP → Log Results to Sheets`);
        }
      }
      
      // Output 3 (fallback): ALERT → Log Results
      if (logResultsNode) {
        if (!connections[switchNode.name].main[3]) connections[switchNode.name].main[3] = [];
        const alertExists = connections[switchNode.name].main[3].some(conn => 
          (typeof conn === 'object' && conn.node === logResultsNode.name) ||
          (typeof conn === 'string' && conn === logResultsNode.name)
        );
        
        if (!alertExists) {
          connections[switchNode.name].main[3].push({
            node: logResultsNode.name,
            type: 'main',
            index: 0
          });
          connectionsAdded++;
          console.log(`   ✅ ALERT → Log Results to Sheets`);
        }
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
    console.log('✅ VOLLSTÄNDIGE SWITCH CONNECTIONS ERSTELLT');
    console.log(`   ✅ ${connectionsAdded} neue Connection(s) hinzugefügt`);
    console.log('\n   💡 Switch Outputs:');
    console.log('      - RETRY → Rate Limiting');
    console.log('      - REROUTE → Handle Invalid Priority');
    console.log('      - SKIP → Log Results');
    console.log('      - ALERT → Log Results');
    console.log('\n   💡 Browser REFRESH (F5) erforderlich!\n');
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
  buildCompleteConnections();
}

module.exports = { buildCompleteConnections };
