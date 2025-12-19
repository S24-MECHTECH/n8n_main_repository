/**
 * 🔗 BUILD CONNECTIONS
 * Erstellt die Verbindungen zwischen den Nodes im n8n Workflow
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

async function buildConnections() {
  console.log('\n' + '='.repeat(80));
  console.log('🔗 BUILD CONNECTIONS');
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
    
    console.log(`✅ Workflow: ${workflow.name}`);
    console.log(`   Nodes: ${nodes.length}\n`);
    
    // 2. Finde Node-IDs
    console.log('🔍 Finde Node-IDs...\n');
    
    const updateGtnEanNode = nodes.find(n => n.name === 'Update GTN/EAN');
    const aiErrorHandlerNode = nodes.find(n => n.name === 'AI Error Handler');
    const retryQueueNode = nodes.find(n => n.name === 'Retry Queue');
    const expressionRepairNode = nodes.find(n => n.name === 'Expression Repair');
    const rateLimitingGtnEanNode = nodes.find(n => n.name === 'Rate Limiting GTN/EAN');
    const handleInvalidPriorityNode = nodes.find(n => n.name && n.name.includes('Invalid Priority'));
    
    console.log(`   Update GTN/EAN: ${updateGtnEanNode ? `✅ ${updateGtnEanNode.id}` : '❌ Nicht gefunden'}`);
    console.log(`   AI Error Handler: ${aiErrorHandlerNode ? `✅ ${aiErrorHandlerNode.id}` : '❌ Nicht gefunden'}`);
    console.log(`   Retry Queue: ${retryQueueNode ? `✅ ${retryQueueNode.id}` : '❌ Nicht gefunden'}`);
    console.log(`   Expression Repair: ${expressionRepairNode ? `✅ ${expressionRepairNode.id}` : '❌ Nicht gefunden'}`);
    console.log(`   Rate Limiting GTN/EAN: ${rateLimitingGtnEanNode ? `✅ ${rateLimitingGtnEanNode.id}` : '❌ Nicht gefunden'}`);
    console.log(`   Handle Invalid Priority: ${handleInvalidPriorityNode ? `✅ ${handleInvalidPriorityNode.id}` : '⚠️  Nicht gefunden (wird übersprungen)'}\n`);
    
    if (!updateGtnEanNode || !aiErrorHandlerNode || !retryQueueNode || !expressionRepairNode) {
      console.error('❌ Wichtige Nodes fehlen!');
      process.exit(1);
    }
    
    // 3. Initialisiere Connections-Objekt falls nötig
    if (!connections.main) {
      connections.main = [[]];
    }
    
    // 4. Erstelle Connections
    console.log('🔗 Erstelle Connections...\n');
    
    // Connection 1: Update GTN/EAN (Error Output) → AI Error Handler
    // n8n hat kein explizites "Error Output", aber Code Nodes können auf Error gehen
    // Wir nehmen Output 0 (main) für Error-Fälle
    if (!connections.main[0]) connections.main[0] = [];
    
    const conn1Exists = connections.main[0].some(conn => 
      conn[0]?.node === updateGtnEanNode.id && conn[1]?.node === aiErrorHandlerNode.id
    );
    
    if (!conn1Exists) {
      connections.main[0].push([
        { node: updateGtnEanNode.id, type: 'main', index: 0 },
        { node: aiErrorHandlerNode.id, type: 'main', index: 0 }
      ]);
      console.log('   ✅ Connection 1: Update GTN/EAN → AI Error Handler');
    } else {
      console.log('   ⏭️  Connection 1: Bereits vorhanden');
    }
    
    // Connection 2: AI Error Handler → Retry Queue
    // Wir nutzen Output 0 (RETRY case)
    const conn2Exists = connections.main[0].some(conn => 
      conn[0]?.node === aiErrorHandlerNode.id && conn[1]?.node === retryQueueNode.id
    );
    
    if (!conn2Exists) {
      connections.main[0].push([
        { node: aiErrorHandlerNode.id, type: 'main', index: 0 },
        { node: retryQueueNode.id, type: 'main', index: 0 }
      ]);
      console.log('   ✅ Connection 2: AI Error Handler → Retry Queue');
    } else {
      console.log('   ⏭️  Connection 2: Bereits vorhanden');
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
      console.log('   ✅ Connection 3: Retry Queue → Expression Repair');
    } else {
      console.log('   ⏭️  Connection 3: Bereits vorhanden');
    }
    
    // Connection 4: Expression Repair → Update GTN/EAN (Loop-back)
    const conn4Exists = connections.main[0].some(conn => 
      conn[0]?.node === expressionRepairNode.id && conn[1]?.node === updateGtnEanNode.id
    );
    
    if (!conn4Exists) {
      connections.main[0].push([
        { node: expressionRepairNode.id, type: 'main', index: 0 },
        { node: updateGtnEanNode.id, type: 'main', index: 0 }
      ]);
      console.log('   ✅ Connection 4: Expression Repair → Update GTN/EAN (Loop-back)');
    } else {
      console.log('   ⏭️  Connection 4: Bereits vorhanden');
    }
    
    // Connection 5: AI Error Handler → Handle Invalid Priority (SKIP/ALERT)
    // Nutze Output 1 für SKIP/ALERT (falls Handle Invalid Priority existiert)
    if (handleInvalidPriorityNode) {
      const conn5Exists = connections.main[0].some(conn => 
        conn[0]?.node === aiErrorHandlerNode.id && conn[1]?.node === handleInvalidPriorityNode.id
      );
      
      if (!conn5Exists) {
        connections.main[0].push([
          { node: aiErrorHandlerNode.id, type: 'main', index: 1 },
          { node: handleInvalidPriorityNode.id, type: 'main', index: 0 }
        ]);
        console.log('   ✅ Connection 5: AI Error Handler → Handle Invalid Priority');
      } else {
        console.log('   ⏭️  Connection 5: Bereits vorhanden');
      }
    } else {
      console.log('   ⏭️  Connection 5: Handle Invalid Priority nicht gefunden, übersprungen');
    }
    
    // Connection 6: Update GTN/EAN → Rate Limiting GTN/EAN (Success - behalten falls vorhanden)
    if (rateLimitingGtnEanNode) {
      const conn6Exists = connections.main[0].some(conn => 
        conn[0]?.node === updateGtnEanNode.id && conn[1]?.node === rateLimitingGtnEanNode.id
      );
      
      if (conn6Exists) {
        console.log('   ✅ Connection 6: Update GTN/EAN → Rate Limiting GTN/EAN (bereits vorhanden)');
      } else {
        // Nur hinzufügen wenn nicht vorhanden, aber nicht überschreiben
        connections.main[0].push([
          { node: updateGtnEanNode.id, type: 'main', index: 1 },
          { node: rateLimitingGtnEanNode.id, type: 'main', index: 0 }
        ]);
        console.log('   ✅ Connection 6: Update GTN/EAN → Rate Limiting GTN/EAN (hinzugefügt)');
      }
    } else {
      console.log('   ⏭️  Connection 6: Rate Limiting GTN/EAN nicht gefunden, übersprungen');
    }
    
    console.log('');
    
    // 5. Workflow speichern
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
    
    // 6. REPORT
    console.log('📊 REPORT\n');
    console.log('✅ CONNECTIONS ERSTELLT');
    console.log('   ✅ Connection 1: Update GTN/EAN → AI Error Handler');
    console.log('   ✅ Connection 2: AI Error Handler → Retry Queue');
    console.log('   ✅ Connection 3: Retry Queue → Expression Repair');
    console.log('   ✅ Connection 4: Expression Repair → Update GTN/EAN (Loop-back)');
    if (handleInvalidPriorityNode) {
      console.log('   ✅ Connection 5: AI Error Handler → Handle Invalid Priority');
    }
    if (rateLimitingGtnEanNode) {
      console.log('   ✅ Connection 6: Update GTN/EAN → Rate Limiting GTN/EAN (behalten)');
    }
    console.log('   ✅ Workflow: GESPEICHERT\n');
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
