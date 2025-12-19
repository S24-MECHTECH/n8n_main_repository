/**
 * 🔍 VERIFY & UPDATE NODES
 * Verifiziert die 3 Nodes in n8n und aktualisiert sie mit neuem Code
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

async function verifyAndUpdateNodes() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VERIFY & UPDATE NODES');
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
    
    console.log(`✅ Workflow: ${workflow.name}`);
    console.log(`   Nodes: ${nodes.length}\n`);
    
    // 2. Verifiziere Nodes
    console.log('🔍 SCHRITT 1: VERIFIZIERE NODES\n');
    
    const node1 = nodes.find(n => n.name === 'AI Error Handler');
    const node2 = nodes.find(n => n.name === 'Retry Queue');
    const node3 = nodes.find(n => n.name === 'Expression Repair');
    
    console.log(`   Node 1 - AI Error Handler: ${node1 ? `✅ Gefunden (Index: ${nodes.indexOf(node1)})` : '❌ Nicht gefunden'}`);
    console.log(`   Node 2 - Retry Queue: ${node2 ? `✅ Gefunden (Index: ${nodes.indexOf(node2)})` : '❌ Nicht gefunden'}`);
    console.log(`   Node 3 - Expression Repair: ${node3 ? `✅ Gefunden (Index: ${nodes.indexOf(node3)})` : '❌ Nicht gefunden'}\n`);
    
    if (!node1 || !node2 || !node3) {
      console.log('❌ Nicht alle Nodes gefunden!');
      process.exit(1);
    }
    
    // 3. Update Node 1: AI Error Handler
    console.log('🔧 SCHRITT 2: UPDATE NODE 1 - AI ERROR HANDLER\n');
    
    const node1NewCode = `// AI Error Handler
const error = $input.first().json;
if (error.code === 429) return { json: { action: 'RETRY', delay: 2000 } };
if (error.code === 400) return { json: { action: 'REROUTE', to: 'fallback' } };
if (error.code === 500) return { json: { action: 'SKIP' } };
return { json: { action: 'ALERT' } };`;
    
    // Test Code Syntax
    try {
      new Function(node1NewCode);
      console.log('   ✅ Code-Syntax: VALID');
    } catch (e) {
      console.log(`   ❌ Code-Syntax: FEHLER - ${e.message}`);
      process.exit(1);
    }
    
    node1.parameters.jsCode = node1NewCode;
    console.log('   ✅ Code aktualisiert\n');
    
    // 4. Update Node 2: Retry Queue
    console.log('🔧 SCHRITT 3: UPDATE NODE 2 - RETRY QUEUE\n');
    
    const node2NewCode = `// Retry Queue
const product = $input.first().json;
const attempt = product.attempt || 1;
const delay = Math.pow(2, attempt) * 1000;
return { json: { ...product, attempt: attempt + 1, delay } };`;
    
    // Test Code Syntax
    try {
      new Function(node2NewCode);
      console.log('   ✅ Code-Syntax: VALID');
    } catch (e) {
      console.log(`   ❌ Code-Syntax: FEHLER - ${e.message}`);
      process.exit(1);
    }
    
    node2.parameters.jsCode = node2NewCode;
    console.log('   ✅ Code aktualisiert\n');
    
    // 5. Update Node 3: Expression Repair
    console.log('🔧 SCHRITT 4: UPDATE NODE 3 - EXPRESSION REPAIR\n');
    
    const node3NewCode = `// Expression Repair
const product = $input.first().json;
if (!product.sku) product.sku = 'UNKNOWN';
if (!product.action) product.action = 'merchant_quality';
return { json: product };`;
    
    // Test Code Syntax
    try {
      new Function(node3NewCode);
      console.log('   ✅ Code-Syntax: VALID');
    } catch (e) {
      console.log(`   ❌ Code-Syntax: FEHLER - ${e.message}`);
      process.exit(1);
    }
    
    node3.parameters.jsCode = node3NewCode;
    console.log('   ✅ Code aktualisiert\n');
    
    // 6. Workflow speichern
    console.log('💾 SCHRITT 5: SPEICHERE WORKFLOW\n');
    
    const cleanSettings = { 
      executionOrder: workflow.settings?.executionOrder || 'v1' 
    };
    
    const updatePayload = {
      name: workflow.name,
      nodes: nodes,
      connections: workflow.connections || {},
      settings: cleanSettings
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    console.log('   ✅ Workflow aktualisiert\n');
    
    // 7. REPORT
    console.log('📊 REPORT\n');
    console.log('✅ ALLE 3 NODES AKTUALISIERT');
    console.log('   ✅ Node 1 - AI Error Handler: Code aktualisiert');
    console.log('   ✅ Node 2 - Retry Queue: Code aktualisiert');
    console.log('   ✅ Node 3 - Expression Repair: Code aktualisiert');
    console.log('   ✅ Alle Code-Syntaxen: VALID');
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
  verifyAndUpdateNodes();
}

module.exports = { verifyAndUpdateNodes };
