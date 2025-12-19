/**
 * 🔍 ANALYZE SWITCH NODES STRUCTURE
 * Analysiert die aktuelle Switch Node Konfiguration im Workflow
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

async function analyzeSwitchNodes() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ANALYZE SWITCH NODES STRUCTURE');
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
    
    console.log(`✅ Workflow: ${workflow.name}\n`);
    
    // 2. Finde alle Switch Nodes
    const switchNodes = nodes.filter(n => 
      n.type === 'n8n-nodes-base.switch' && 
      n.name && n.name.includes('Error Handler')
    );
    
    console.log(`🔍 Gefundene Switch Nodes: ${switchNodes.length}\n`);
    
    if (switchNodes.length === 0) {
      console.log('⚠️  Keine Switch Nodes gefunden!\n');
      return;
    }
    
    // 3. Analysiere jeden Switch Node
    for (const switchNode of switchNodes) {
      console.log('─'.repeat(80));
      console.log(`📋 NODE: ${switchNode.name}`);
      console.log(`   ID: ${switchNode.id}`);
      console.log(`   Position: [${switchNode.position[0]}, ${switchNode.position[1]}]`);
      console.log(`   Type Version: ${switchNode.typeVersion}`);
      console.log('');
      
      // Analysiere Parameters
      const params = switchNode.parameters || {};
      console.log('   PARAMETERS:');
      console.log(`   - Mode: ${params.mode || 'undefined'}`);
      console.log(`   - Rules: ${params.rules ? JSON.stringify(params.rules, null, 14).split('\n').join('\n   ').substring(0, 500) + '...' : 'undefined'}`);
      console.log(`   - Fallback Output: ${params.fallbackOutput || 'undefined'}`);
      console.log(`   - Options: ${params.options ? JSON.stringify(params.options, null, 2).split('\n').join('\n   ').substring(0, 200) : 'undefined'}`);
      console.log('');
      
      // Speichere vollständige Struktur für ersten Node
      if (switchNode === switchNodes[0]) {
        fs.writeFileSync(
          path.join(__dirname, '..', 'switch-node-structure-example.json'),
          JSON.stringify(switchNode, null, 2)
        );
        console.log('   💾 Vollständige Struktur gespeichert: switch-node-structure-example.json');
        console.log('');
      }
    }
    
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
  analyzeSwitchNodes();
}

module.exports = { analyzeSwitchNodes };
