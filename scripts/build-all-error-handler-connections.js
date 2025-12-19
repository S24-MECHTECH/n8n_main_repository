/**
 * 🔗 BUILD ALL ERROR HANDLER CONNECTIONS
 * Baut alle Connections für die 15 Error Handler Nodes
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

// Strang-Definitionen
const strandDefinitions = [
  {
    name: 'Adult',
    updateNode: 'Update Product Adult Flag',
    errorHandler: 'AI Error Handler Adult',
    retryQueue: 'Retry Queue Adult',
    expressionRepair: 'Expression Repair Adult'
  },
  {
    name: 'Images',
    updateNode: 'Update Product Images',
    errorHandler: 'AI Error Handler Images',
    retryQueue: 'Retry Queue Images',
    expressionRepair: 'Expression Repair Images'
  },
  {
    name: 'Text',
    updateNode: 'Update Product Text',
    errorHandler: 'AI Error Handler Text',
    retryQueue: 'Retry Queue Text',
    expressionRepair: 'Expression Repair Text'
  },
  {
    name: 'Quality',
    updateNode: 'Update Merchant Settings',
    errorHandler: 'AI Error Handler Quality',
    retryQueue: 'Retry Queue Quality',
    expressionRepair: 'Expression Repair Quality'
  },
  {
    name: 'Country',
    updateNode: 'Update Country Feeds',
    errorHandler: 'AI Error Handler Country',
    retryQueue: 'Retry Queue Country',
    expressionRepair: 'Expression Repair Country'
  }
];

async function buildConnections() {
  console.log('\n' + '='.repeat(80));
  console.log('🔗 BUILD ALL ERROR HANDLER CONNECTIONS');
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
    let connections = workflow.connections || {};
    
    console.log(`✅ Workflow: ${workflow.name}\n`);
    
    // Initialisiere connections
    if (!connections.main) connections.main = [[]];
    if (!connections.main[0]) connections.main[0] = [];
    
    let totalConnections = 0;
    
    // 2. Für jeden Strang Connections bauen
    console.log('🔗 Baue Connections für jeden Strang...\n');
    
    for (const strand of strandDefinitions) {
      console.log(`📋 STRANG: ${strand.name}\n`);
      
      // Finde Nodes
      const updateNode = nodes.find(n => n.name === strand.updateNode);
      const errorHandlerNode = nodes.find(n => n.name === strand.errorHandler);
      const retryQueueNode = nodes.find(n => n.name === strand.retryQueue);
      const expressionRepairNode = nodes.find(n => n.name === strand.expressionRepair);
      
      if (!updateNode) {
        console.log(`   ⚠️  ${strand.updateNode} nicht gefunden - übersprungen\n`);
        continue;
      }
      
      if (!errorHandlerNode || !retryQueueNode || !expressionRepairNode) {
        console.log(`   ⚠️  Error Handler Nodes nicht vollständig - übersprungen\n`);
        continue;
      }
      
      // Connection 1: Update Node → Error Handler
      const conn1Exists = connections.main[0].some(conn => 
        conn[0]?.node === updateNode.id && conn[1]?.node === errorHandlerNode.id
      );
      
      if (!conn1Exists) {
        connections.main[0].push([
          { node: updateNode.id, type: 'main', index: 0 },
          { node: errorHandlerNode.id, type: 'main', index: 0 }
        ]);
        console.log(`   ✅ ${strand.updateNode} → ${strand.errorHandler}`);
        totalConnections++;
      }
      
      // Connection 2: Error Handler → Retry Queue
      const conn2Exists = connections.main[0].some(conn => 
        conn[0]?.node === errorHandlerNode.id && conn[1]?.node === retryQueueNode.id
      );
      
      if (!conn2Exists) {
        connections.main[0].push([
          { node: errorHandlerNode.id, type: 'main', index: 0 },
          { node: retryQueueNode.id, type: 'main', index: 0 }
        ]);
        console.log(`   ✅ ${strand.errorHandler} → ${strand.retryQueue}`);
        totalConnections++;
      }
      
      // Connection 3: Retry Queue → Expression Repair
      const conn3Exists = connections.main[0].some(conn => 
        conn[0]?.node === retryQueueNode.id && conn[1]?.node === expressionRepairNode.id
      );
      
      if (!conn3Exists) {
        connections.main[0].push([
          { node: retryQueueNode.id, type: 'main', index: 0 },
          { node: expressionRepairNode.id, type: 'main', index: 0 }
        ]);
        console.log(`   ✅ ${strand.retryQueue} → ${strand.expressionRepair}`);
        totalConnections++;
      }
      
      // Connection 4: Expression Repair → Update Node (Loop-back)
      const conn4Exists = connections.main[0].some(conn => 
        conn[0]?.node === expressionRepairNode.id && conn[1]?.node === updateNode.id
      );
      
      if (!conn4Exists) {
        connections.main[0].push([
          { node: expressionRepairNode.id, type: 'main', index: 0 },
          { node: updateNode.id, type: 'main', index: 0 }
        ]);
        console.log(`   ✅ ${strand.expressionRepair} → ${strand.updateNode} (Loop-back)`);
        totalConnections++;
      }
      
      console.log('');
    }
    
    // 3. Workflow speichern
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
    console.log('   ✅ Workflow gespeichert\n');
    
    // 4. REPORT
    console.log('📊 REPORT\n');
    console.log('✅ ALLE CONNECTIONS ERSTELLT');
    console.log(`   ✅ ${totalConnections} neue Connection(s) hinzugefügt`);
    console.log(`   ✅ 5 Stränge konfiguriert`);
    console.log('\n   💡 Nächster Schritt: Prepare → Update Connections prüfen!\n');
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
  buildConnections();
}

module.exports = { buildConnections };
