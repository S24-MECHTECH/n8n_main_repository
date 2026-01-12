/**
 * 🔍 VERIFY & FIX EXPRESSION REPAIR CONNECTION
 * Prüft ob Expression Repair → Update GTN/EAN verbunden ist
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

async function verifyAndFixConnection() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VERIFY & FIX EXPRESSION REPAIR CONNECTION');
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
    console.log(`   Nodes: ${nodes.length}\n`);
    
    // 2. Finde Nodes
    console.log('🔍 Finde Nodes...\n');
    
    const expressionRepairNode = nodes.find(n => n.name === 'Expression Repair');
    const updateGtnEanNode = nodes.find(n => n.name === 'Update GTN/EAN');
    
    if (!expressionRepairNode) {
      console.error('❌ Expression Repair Node nicht gefunden!');
      process.exit(1);
    }
    
    if (!updateGtnEanNode) {
      console.error('❌ Update GTN/EAN Node nicht gefunden!');
      process.exit(1);
    }
    
    console.log(`   ✅ Expression Repair: ${expressionRepairNode.id}`);
    console.log(`   ✅ Update GTN/EAN: ${updateGtnEanNode.id}\n`);
    
    // 3. Prüfe Connections
    console.log('🔍 Prüfe Connections...\n');
    
    // Initialisiere connections.main falls nötig
    if (!connections.main) {
      connections.main = [[]];
    }
    if (!connections.main[0]) {
      connections.main[0] = [];
    }
    
    // Prüfe ob Expression Repair → Update GTN/EAN existiert
    const connectionExists = connections.main[0].some(conn => {
      return conn[0]?.node === expressionRepairNode.id && 
             conn[1]?.node === updateGtnEanNode.id;
    });
    
    if (connectionExists) {
      console.log('   ✅ Connection Expression Repair → Update GTN/EAN: Vorhanden');
      console.log('   ⏭️  Keine Änderung nötig\n');
    } else {
      console.log('   ❌ Connection Expression Repair → Update GTN/EAN: FEHLT!');
      console.log('   🔧 Füge Connection hinzu...\n');
      
      // Füge Connection hinzu
      connections.main[0].push([
        { node: expressionRepairNode.id, type: 'main', index: 0 },
        { node: updateGtnEanNode.id, type: 'main', index: 0 }
      ]);
      
      console.log('   ✅ Connection hinzugefügt\n');
      
      // 4. Workflow speichern
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
      
      console.log('📊 REPORT\n');
      console.log('✅ CONNECTION HINZUGEFÜGT');
      console.log('   ✅ Expression Repair → Update GTN/EAN');
      console.log('   ✅ Workflow: GESPEICHERT');
      console.log('   ✅ Node sollte nicht mehr "in der Luft hängen"!\n');
    }
    
    // 5. Zeige alle Connections von Expression Repair
    console.log('📋 Alle Connections von Expression Repair:\n');
    const exprRepairConnections = connections.main[0].filter(conn => 
      conn[0]?.node === expressionRepairNode.id
    );
    
    if (exprRepairConnections.length === 0) {
      console.log('   ⚠️  Keine Connections gefunden!');
    } else {
      exprRepairConnections.forEach((conn, idx) => {
        const targetNode = nodes.find(n => n.id === conn[1]?.node);
        console.log(`   ${idx + 1}. Expression Repair → ${targetNode ? targetNode.name : 'Unknown'} (${conn[1]?.node})`);
      });
    }
    
    console.log('');
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
  verifyAndFixConnection();
}

module.exports = { verifyAndFixConnection };
