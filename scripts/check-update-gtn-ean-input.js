/**
 * 🔍 CHECK UPDATE GTN/EAN INPUT
 * Prüft woher Update GTN/EAN seinen Input bekommt
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

async function checkInput() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECK UPDATE GTN/EAN INPUT');
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
    
    console.log(`✅ Workflow: ${workflow.name}\n`);
    
    // 2. Finde Update GTN/EAN Node
    const updateGtnEanNode = nodes.find(n => n.name === 'Update GTN/EAN');
    if (!updateGtnEanNode) {
      console.error('❌ Update GTN/EAN Node nicht gefunden!');
      process.exit(1);
    }
    
    console.log(`✅ Update GTN/EAN gefunden:`);
    console.log(`   ID: ${updateGtnEanNode.id}`);
    console.log(`   Type: ${updateGtnEanNode.type}\n`);
    
    // 3. Prüfe INPUT Connections (welche Nodes verbinden ZU Update GTN/EAN)
    console.log('🔍 Prüfe INPUT Connections (wer sendet an Update GTN/EAN?)...\n');
    
    if (!connections.main || !connections.main[0]) {
      console.log('   ❌ KEINE INPUT CONNECTIONS GEFUNDEN!');
      console.log('   ⚠️  Update GTN/EAN bekommt KEINEN Input!');
    } else {
      // Finde alle Connections, die ZU Update GTN/EAN gehen
      const inputConnections = connections.main[0].filter(conn => {
        return conn[1]?.node === updateGtnEanNode.id;
      });
      
      if (inputConnections.length === 0) {
        console.log('   ❌ KEINE INPUT CONNECTIONS GEFUNDEN!');
        console.log('   ⚠️  Update GTN/EAN bekommt KEINEN Input!');
      } else {
        console.log(`   ✅ ${inputConnections.length} Input Connection(s) gefunden:\n`);
        
        inputConnections.forEach((conn, idx) => {
          const sourceNode = nodes.find(n => n.id === conn[0]?.node);
          const sourceNodeName = sourceNode ? sourceNode.name : 'Unknown';
          const sourceNodeType = sourceNode ? sourceNode.type : 'Unknown';
          
          console.log(`   ${idx + 1}. ${sourceNodeName} → Update GTN/EAN`);
          console.log(`      Source Node ID: ${conn[0]?.node}`);
          console.log(`      Source Node Type: ${sourceNodeType}`);
          console.log('');
        });
      }
    }
    
    // 4. Prüfe Prepare-Nodes (alle Nodes mit "Prepare" im Namen)
    console.log('🔍 Prüfe Prepare-Nodes...\n');
    const prepareNodes = nodes.filter(n => n.name && n.name.toLowerCase().includes('prepare'));
    
    console.log(`   ✅ ${prepareNodes.length} Prepare-Node(s) gefunden:\n`);
    prepareNodes.forEach((node, idx) => {
      console.log(`   ${idx + 1}. ${node.name}`);
      console.log(`      Type: ${node.type}`);
      console.log(`      ID: ${node.id}`);
      
      // Prüfe ob dieser Prepare-Node zu Update GTN/EAN verbunden ist
      const connectedToUpdate = connections.main[0]?.some(conn => 
        conn[0]?.node === node.id && 
        conn[1]?.node === updateGtnEanNode.id
      );
      
      if (connectedToUpdate) {
        console.log(`      → Update GTN/EAN: ✅ Verbunden`);
      } else {
        console.log(`      → Update GTN/EAN: ❌ NICHT verbunden`);
      }
      console.log('');
    });
    
    // 5. Prüfe Expression Repair Connection
    console.log('🔍 Prüfe Expression Repair → Update GTN/EAN...\n');
    const expressionRepairNode = nodes.find(n => n.name === 'Expression Repair');
    if (expressionRepairNode) {
      const exprRepairToUpdate = connections.main[0]?.some(conn => 
        conn[0]?.node === expressionRepairNode.id && 
        conn[1]?.node === updateGtnEanNode.id
      );
      
      if (exprRepairToUpdate) {
        console.log('   ✅ Expression Repair → Update GTN/EAN: Verbunden (Loop-back)');
      } else {
        console.log('   ❌ Expression Repair → Update GTN/EAN: NICHT verbunden!');
      }
    } else {
      console.log('   ⚠️  Expression Repair Node nicht gefunden');
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
  checkInput();
}

module.exports = { checkInput };
