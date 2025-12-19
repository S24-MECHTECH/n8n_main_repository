/**
 * 🏗️ BUILD ALL ERROR HANDLER NODES
 * Baut alle 15 Error Handler Nodes für 5 Stränge
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

// Node-Definitionen für alle 15 Nodes
const nodeDefinitions = [
  // STRANG 1 - Adult
  { name: 'AI Error Handler Adult', code: `// AI Error Handler Adult
const error = $input.first().json;
if (error.code === 429) return { json: { action: 'RETRY', delay: 2000 } };
if (error.code === 400) return { json: { action: 'REROUTE', to: 'fallback' } };
if (error.code === 500) return { json: { action: 'SKIP' } };
return { json: { action: 'ALERT' } };` },
  { name: 'Retry Queue Adult', code: `// Retry Queue Adult
const product = $input.first().json;
const attempt = product.attempt || 1;
const delay = Math.pow(2, attempt) * 1000;
return { json: { ...product, attempt: attempt + 1, delay } };` },
  { name: 'Expression Repair Adult', code: `// Expression Repair Adult
const product = $input.first().json;
if (!product.sku) product.sku = 'UNKNOWN';
if (!product.action) product.action = 'merchant_quality';
return { json: product };` },
  
  // STRANG 2 - Images
  { name: 'AI Error Handler Images', code: `// AI Error Handler Images
const error = $input.first().json;
if (error.code === 429) return { json: { action: 'RETRY', delay: 2000 } };
if (error.code === 400) return { json: { action: 'REROUTE', to: 'fallback' } };
if (error.code === 500) return { json: { action: 'SKIP' } };
return { json: { action: 'ALERT' } };` },
  { name: 'Retry Queue Images', code: `// Retry Queue Images
const product = $input.first().json;
const attempt = product.attempt || 1;
const delay = Math.pow(2, attempt) * 1000;
return { json: { ...product, attempt: attempt + 1, delay } };` },
  { name: 'Expression Repair Images', code: `// Expression Repair Images
const product = $input.first().json;
if (!product.sku) product.sku = 'UNKNOWN';
if (!product.action) product.action = 'merchant_quality';
return { json: product };` },
  
  // STRANG 3 - Text
  { name: 'AI Error Handler Text', code: `// AI Error Handler Text
const error = $input.first().json;
if (error.code === 429) return { json: { action: 'RETRY', delay: 2000 } };
if (error.code === 400) return { json: { action: 'REROUTE', to: 'fallback' } };
if (error.code === 500) return { json: { action: 'SKIP' } };
return { json: { action: 'ALERT' } };` },
  { name: 'Retry Queue Text', code: `// Retry Queue Text
const product = $input.first().json;
const attempt = product.attempt || 1;
const delay = Math.pow(2, attempt) * 1000;
return { json: { ...product, attempt: attempt + 1, delay } };` },
  { name: 'Expression Repair Text', code: `// Expression Repair Text
const product = $input.first().json;
if (!product.sku) product.sku = 'UNKNOWN';
if (!product.action) product.action = 'merchant_quality';
return { json: product };` },
  
  // STRANG 4 - Quality
  { name: 'AI Error Handler Quality', code: `// AI Error Handler Quality
const error = $input.first().json;
if (error.code === 429) return { json: { action: 'RETRY', delay: 2000 } };
if (error.code === 400) return { json: { action: 'REROUTE', to: 'fallback' } };
if (error.code === 500) return { json: { action: 'SKIP' } };
return { json: { action: 'ALERT' } };` },
  { name: 'Retry Queue Quality', code: `// Retry Queue Quality
const product = $input.first().json;
const attempt = product.attempt || 1;
const delay = Math.pow(2, attempt) * 1000;
return { json: { ...product, attempt: attempt + 1, delay } };` },
  { name: 'Expression Repair Quality', code: `// Expression Repair Quality
const product = $input.first().json;
if (!product.sku) product.sku = 'UNKNOWN';
if (!product.action) product.action = 'merchant_quality';
return { json: product };` },
  
  // STRANG 5 - Country
  { name: 'AI Error Handler Country', code: `// AI Error Handler Country
const error = $input.first().json;
if (error.code === 429) return { json: { action: 'RETRY', delay: 2000 } };
if (error.code === 400) return { json: { action: 'REROUTE', to: 'fallback' } };
if (error.code === 500) return { json: { action: 'SKIP' } };
return { json: { action: 'ALERT' } };` },
  { name: 'Retry Queue Country', code: `// Retry Queue Country
const product = $input.first().json;
const attempt = product.attempt || 1;
const delay = Math.pow(2, attempt) * 1000;
return { json: { ...product, attempt: attempt + 1, delay } };` },
  { name: 'Expression Repair Country', code: `// Expression Repair Country
const product = $input.first().json;
if (!product.sku) product.sku = 'UNKNOWN';
if (!product.action) product.action = 'merchant_quality';
return { json: product };` }
];

function createNodeDefinition(nodeDef, basePosition = [1000, 600]) {
  return {
    id: `${nodeDef.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: nodeDef.name,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [
      basePosition[0] + Math.random() * 200,
      basePosition[1] + Math.random() * 200
    ],
    parameters: {
      jsCode: nodeDef.code
    }
  };
}

async function buildAllNodes() {
  console.log('\n' + '='.repeat(80));
  console.log('🏗️ BUILD ALL ERROR HANDLER NODES');
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
    console.log(`   Nodes vorher: ${nodes.length}\n`);
    
    // 2. Prüfe welche Nodes bereits existieren
    console.log('🔍 Prüfe existierende Nodes...\n');
    const existingNodeNames = nodes.map(n => n.name);
    const nodesToAdd = [];
    const nodesToSkip = [];
    
    for (const nodeDef of nodeDefinitions) {
      if (existingNodeNames.includes(nodeDef.name)) {
        nodesToSkip.push(nodeDef.name);
      } else {
        nodesToAdd.push(nodeDef);
      }
    }
    
    console.log(`   ✅ Bereits vorhanden: ${nodesToSkip.length}`);
    console.log(`   🔧 Zu erstellen: ${nodesToAdd.length}\n`);
    
    if (nodesToSkip.length > 0) {
      console.log('   Vorhandene Nodes:');
      nodesToSkip.forEach(name => console.log(`      - ${name}`));
      console.log('');
    }
    
    if (nodesToAdd.length === 0) {
      console.log('✅ Alle Nodes bereits vorhanden!\n');
      return;
    }
    
    // 3. Erstelle neue Nodes
    console.log('🏗️ Erstelle neue Nodes...\n');
    let addedCount = 0;
    
    for (const nodeDef of nodesToAdd) {
      const newNode = createNodeDefinition(nodeDef);
      
      // Test Code Syntax
      try {
        new Function(nodeDef.code);
      } catch (e) {
        console.log(`   ❌ ${nodeDef.name}: Code-Syntax FEHLER - ${e.message}`);
        continue;
      }
      
      nodes.push(newNode);
      addedCount++;
      console.log(`   ✅ ${nodeDef.name} erstellt`);
    }
    
    console.log(`\n   📊 ${addedCount} Node(s) erstellt\n`);
    
    // 4. Deploy zu n8n
    console.log('🚀 Deploy zu n8n...\n');
    
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
    
    // 5. REPORT
    console.log('📊 REPORT\n');
    console.log('✅ ALLE ERROR HANDLER NODES ERSTELLT');
    console.log(`   ✅ ${addedCount} neue Node(s) hinzugefügt`);
    console.log(`   ✅ ${nodesToSkip.length} Node(s) bereits vorhanden`);
    console.log(`   ✅ Gesamt: ${nodeDefinitions.length} Nodes`);
    console.log('\n   💡 Nächster Schritt: Connections bauen!\n');
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
  buildAllNodes();
}

module.exports = { buildAllNodes, nodeDefinitions };
