/**
 * 🔧 FORCE FIX EXPRESSION REPAIR CONNECTION
 * Entfernt alte Connection und fügt sie neu hinzu
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

async function forceFixConnection() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FORCE FIX EXPRESSION REPAIR CONNECTION');
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
    
    console.log(`✅ Workflow: ${workflow.name}`);
    
    // 2. Finde Nodes
    const expressionRepairNode = nodes.find(n => n.name === 'Expression Repair');
    const updateGtnEanNode = nodes.find(n => n.name === 'Update GTN/EAN');
    
    if (!expressionRepairNode || !updateGtnEanNode) {
      console.error('❌ Nodes nicht gefunden!');
      process.exit(1);
    }
    
    console.log(`   Expression Repair: ${expressionRepairNode.id}`);
    console.log(`   Update GTN/EAN: ${updateGtnEanNode.id}\n`);
    
    // 3. Initialisiere connections
    if (!connections.main) connections.main = [[]];
    if (!connections.main[0]) connections.main[0] = [];
    
    // 4. Entferne ALLE alten Connections von Expression Repair
    console.log('🔧 Entferne alte Connections von Expression Repair...\n');
    const beforeCount = connections.main[0].length;
    connections.main[0] = connections.main[0].filter(conn => 
      conn[0]?.node !== expressionRepairNode.id
    );
    const removedCount = beforeCount - connections.main[0].length;
    console.log(`   ✅ ${removedCount} alte Connection(s) entfernt\n`);
    
    // 5. Füge NEUE Connection hinzu
    console.log('🔧 Füge neue Connection hinzu...\n');
    connections.main[0].push([
      { node: expressionRepairNode.id, type: 'main', index: 0 },
      { node: updateGtnEanNode.id, type: 'main', index: 0 }
    ]);
    console.log('   ✅ Connection Expression Repair → Update GTN/EAN hinzugefügt\n');
    
    // 6. Speichere Workflow
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
    
    // 7. REPORT
    console.log('📊 REPORT\n');
    console.log('✅ CONNECTION ERZWUNGEN');
    console.log('   ✅ Alte Connections entfernt');
    console.log('   ✅ Neue Connection hinzugefügt');
    console.log('   ✅ Expression Repair → Update GTN/EAN');
    console.log('   ✅ Workflow: GESPEICHERT');
    console.log('\n   💡 Browser REFRESH (F5) erforderlich!');
    console.log('   💡 Connection sollte jetzt sichtbar sein!\n');
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
  forceFixConnection();
}

module.exports = { forceFixConnection };
