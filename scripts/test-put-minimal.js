/**
 * 🔍 TEST PUT MIT MINIMALEM PAYLOAD
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = 'https://n8n.srv1091615.hstgr.cloud';
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
          reject({ statusCode: res.statusCode, body: data });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testPutMinimal() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 TEST PUT MIT MINIMALEM PAYLOAD');
  console.log('='.repeat(80) + '\n');
  
  // 1. Workflow laden
  console.log('📥 Lade Workflow...\n');
  const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
  
  console.log(`✅ Workflow: ${workflow.name}`);
  console.log(`   Settings Keys: ${JSON.stringify(Object.keys(workflow.settings || {}))}\n`);
  
  // Test 1: OHNE Settings
  console.log('TEST 1: PUT ohne Settings\n');
  try {
    const payload1 = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections
    };
    const result1 = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', payload1);
    console.log('   ✅ ERFOLG ohne Settings!\n');
  } catch (error) {
    console.log(`   ❌ FEHLER: ${error.statusCode}`);
    console.log(`   Body: ${error.body}\n`);
  }
  
  // Test 2: MIT Settings (exakt wie geladen)
  console.log('TEST 2: PUT mit Settings (exakt wie geladen)\n');
  try {
    const payload2 = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings
    };
    const result2 = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', payload2);
    console.log('   ✅ ERFOLG mit Settings (exakt wie geladen)!\n');
  } catch (error) {
    console.log(`   ❌ FEHLER: ${error.statusCode}`);
    console.log(`   Body: ${error.body}\n`);
  }
  
  // Test 3: MIT Settings (leer)
  console.log('TEST 3: PUT mit Settings (leer)\n');
  try {
    const payload3 = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: {}
    };
    const result3 = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', payload3);
    console.log('   ✅ ERFOLG mit Settings (leer)!\n');
  } catch (error) {
    console.log(`   ❌ FEHLER: ${error.statusCode}`);
    console.log(`   Body: ${error.body}\n`);
  }
  
  console.log('='.repeat(80) + '\n');
}

testPutMinimal().catch(console.error);
