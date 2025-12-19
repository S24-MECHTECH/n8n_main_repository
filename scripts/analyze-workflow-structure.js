/**
 * 🔍 ANALYZE WORKFLOW STRUCTURE
 * Analysiert alle Update-Nodes und Prepare-Nodes
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

async function analyzeStructure() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ANALYZE WORKFLOW STRUCTURE');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      console.error('❌ N8N_API_KEY fehlt!');
      process.exit(1);
    }
    
    // 1. Workflow laden
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes || [];
    
    // 2. Finde alle Update-Nodes
    console.log('📋 UPDATE-NODES:\n');
    const updateNodes = nodes.filter(n => n.name && n.name.toLowerCase().includes('update'));
    updateNodes.forEach((node, idx) => {
      console.log(`   ${idx + 1}. ${node.name} (${node.type})`);
    });
    
    // 3. Finde alle Prepare-Nodes
    console.log('\n📋 PREPARE-NODES:\n');
    const prepareNodes = nodes.filter(n => n.name && n.name.toLowerCase().includes('prepare'));
    prepareNodes.forEach((node, idx) => {
      console.log(`   ${idx + 1}. ${node.name} (${node.type})`);
    });
    
    // 4. Mapping erstellen
    console.log('\n📋 MAPPING (Prepare → Update):\n');
    const mappings = {
      'Adult': { prepare: 'Prepare Products Loop', update: 'Update Product Adult Flag' },
      'Images': { prepare: 'Prepare Images Loop', update: 'Update Product Image' },
      'Text': { prepare: 'Prepare Text Loop', update: 'Update Product Text' },
      'Quality': { prepare: 'Prepare Merchant Quality Loop', update: 'Update Product Merchant Quality' },
      'Country': { prepare: 'Prepare Multi Country Loop', update: 'Update Product Multi Country' },
      'GTN/EAN': { prepare: 'Prepare GTN/EAN_Loop', update: 'Update GTN/EAN' }
    };
    
    for (const [key, mapping] of Object.entries(mappings)) {
      const prepareNode = nodes.find(n => n.name === mapping.prepare);
      const updateNode = nodes.find(n => n.name === mapping.update);
      
      console.log(`   ${key}:`);
      console.log(`      Prepare: ${prepareNode ? '✅ ' + prepareNode.id : '❌ Nicht gefunden'}`);
      console.log(`      Update: ${updateNode ? '✅ ' + updateNode.id : '❌ Nicht gefunden'}`);
      console.log('');
    }
    
    console.log('='.repeat(80) + '\n');
    
    return { nodes, mappings };
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  analyzeStructure();
}

module.exports = { analyzeStructure };
