/**
 * 🚀 AUTO DEPLOY NODES
 * Deployt Node-Codes DIREKT zu n8n via API
 * KEIN Manual-Zeug!
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

// NEUE CODES - HIER AKTUALISIEREN!
const nodeCodes = {
  'AI Error Handler': `// AI Error Handler
const error = $input.first().json;
if (error.code === 429) return { json: { action: 'RETRY', delay: 2000 } };
if (error.code === 400) return { json: { action: 'REROUTE', to: 'fallback' } };
if (error.code === 500) return { json: { action: 'SKIP' } };
return { json: { action: 'ALERT' } };`,
  
  'Retry Queue': `// Retry Queue
const product = $input.first().json;
const attempt = product.attempt || 1;
const delay = Math.pow(2, attempt) * 1000;
return { json: { ...product, attempt: attempt + 1, delay } };`,
  
  'Expression Repair': `// Expression Repair
const product = $input.first().json;
if (!product.sku) product.sku = 'UNKNOWN';
if (!product.action) product.action = 'merchant_quality';
return { json: product };`
};

async function autoDeployNodes() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 AUTO DEPLOY NODES');
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
    
    // 2. Update Nodes
    console.log('🔧 Update Nodes...\n');
    
    let updatedCount = 0;
    
    for (const [nodeName, newCode] of Object.entries(nodeCodes)) {
      const node = nodes.find(n => n.name === nodeName);
      
      if (!node) {
        console.log(`   ⚠️  ${nodeName}: Node nicht gefunden - übersprungen`);
        continue;
      }
      
      // Prüfe ob Code sich geändert hat
      const currentCode = node.parameters?.jsCode || '';
      if (currentCode.trim() === newCode.trim()) {
        console.log(`   ⏭️  ${nodeName}: Code bereits aktuell`);
        continue;
      }
      
      // Update Code
      if (!node.parameters) node.parameters = {};
      node.parameters.jsCode = newCode;
      
      console.log(`   ✅ ${nodeName}: Code aktualisiert`);
      updatedCount++;
    }
    
    if (updatedCount === 0) {
      console.log('\n✅ Alle Nodes bereits aktuell - kein Update nötig\n');
      return;
    }
    
    console.log(`\n   📊 ${updatedCount} Node(s) aktualisiert\n`);
    
    // 3. DIREKT zu n8n pushen
    console.log('🚀 Deploy zu n8n via API...\n');
    
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
    
    console.log('   ✅ Workflow aktualisiert');
    console.log('   ✅ LIVE in n8n!\n');
    
    // 4. REPORT
    console.log('📊 REPORT\n');
    console.log('✅ AUTO DEPLOYMENT ERFOLGREICH');
    console.log(`   ✅ ${updatedCount} Node(s) deployed`);
    for (const nodeName of Object.keys(nodeCodes)) {
      const node = nodes.find(n => n.name === nodeName);
      if (node) {
        console.log(`   ✅ ${nodeName}: LIVE`);
      }
    }
    console.log('   ✅ KEIN Manual-Zeug nötig!');
    console.log('   ✅ Workflow: GESPEICHERT\n');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    console.log('\n📊 REPORT: ❌ DEPLOYMENT FEHLGESCHLAGEN\n');
    process.exit(1);
  }
}

if (require.main === module) {
  autoDeployNodes();
}

module.exports = { autoDeployNodes, nodeCodes };
