/**
 * 🧪 TEST: PUT Request OHNE settings
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
            resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data: data });
          }
        } else {
          reject({ statusCode: res.statusCode, message: `HTTP ${res.statusCode}: ${data}`, data: data });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testPutWithoutSettings() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST: PUT Request OHNE settings');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      console.error('❌ N8N_API_KEY fehlt!');
      process.exit(1);
    }
    
    // 1. Workflow laden
    console.log('📥 Lade Workflow...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    console.log(`✅ Workflow geladen: ${workflow.name}`);
    console.log(`   Nodes: ${workflow.nodes?.length || 0}\n`);
    
    // 2. Test: PUT OHNE settings
    console.log('🧪 TEST: PUT Request OHNE settings\n');
    
    const payload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections
      // KEINE settings!
    };
    
    console.log('📤 Sende Request...');
    console.log(`   Payload Keys: ${Object.keys(payload).join(', ')}`);
    console.log(`   Settings enthalten: ${payload.settings ? 'JA' : 'NEIN'}\n`);
    
    try {
      const result = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', payload);
      
      console.log('✅ SUCCESS!');
      console.log(`   Workflow aktualisiert: ${result?.name || 'OK'}\n`);
      console.log('🎯 ERGEBNIS: Settings war NICHT das Problem! (Update OHNE settings funktioniert)\n');
      
    } catch (error) {
      console.log('❌ ERROR!');
      console.log(`   Message: ${error.message}\n`);
      
      if (error.message.includes('settings')) {
        console.log('🎯 ERGEBNIS: Settings ist PFLICHT!\n');
      } else {
        console.log('🎯 ERGEBNIS: Anderes Problem (nicht settings)\n');
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
  testPutWithoutSettings();
}

module.exports = { testPutWithoutSettings };
