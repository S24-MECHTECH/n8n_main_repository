/**
 * 🔍 TEST N8N API - Grundproblem finden
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = 'https://n8n.srv1091615.hstgr.cloud';

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
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject({ statusCode: res.statusCode, body: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testN8nAPI() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 N8N API TEST - GRUNDPROBLEM FINDEN');
  console.log('='.repeat(80) + '\n');
  
  // 1. API Key Check
  console.log('1️⃣  API KEY CHECK\n');
  if (!N8N_API_KEY) {
    console.error('❌ N8N_API_KEY fehlt!');
    console.log('   Suche in:');
    console.log('   - mcp.json');
    console.log('   - FUNKTIONIERENDE_CONFIG.json');
    console.log('   - claude_desktop_config.json');
    process.exit(1);
  }
  console.log(`✅ API Key gefunden: ${N8N_API_KEY.substring(0, 20)}...`);
  console.log(`   Länge: ${N8N_API_KEY.length} Zeichen\n`);
  
  // 2. Einfacher GET Test
  console.log('2️⃣  EINFACHER GET TEST\n');
  try {
    console.log(`   GET: ${N8N_URL}/api/v1/workflows`);
    const workflows = await n8nRequest('/api/v1/workflows?limit=10');
    console.log(`   ✅ GET erfolgreich!`);
    console.log(`   Anzahl Workflows: ${workflows.data?.length || 0}\n`);
    
    // 3. Finde MECHTECH Workflow
    console.log('3️⃣  MECHTECH WORKFLOW FINDEN\n');
    const mechtechWorkflows = workflows.data?.filter(w => 
      w.name?.includes('MECHTECH') || w.name?.includes('MERCHANT')
    ) || [];
    
    console.log(`   Gefundene MECHTECH Workflows: ${mechtechWorkflows.length}`);
    mechtechWorkflows.forEach(w => {
      console.log(`   - ID: ${w.id}`);
      console.log(`     Name: ${w.name}`);
      console.log(`     Active: ${w.active}`);
      console.log(`     Nodes: ${w.nodes?.length || 0}`);
      console.log();
    });
    
    // 4. Test mit spezifischer Workflow ID
    const testWorkflowId = 'ftZOou7HNgLOwzE5';
    console.log(`4️⃣  WORKFLOW GET TEST (ID: ${testWorkflowId})\n`);
    
    try {
      const workflow = await n8nRequest(`/api/v1/workflows/${testWorkflowId}`);
      console.log(`   ✅ Workflow gefunden!`);
      console.log(`   Name: ${workflow.name}`);
      console.log(`   Nodes: ${workflow.nodes?.length || 0}`);
      console.log(`   Active: ${workflow.active}`);
      console.log(`   Settings: ${JSON.stringify(workflow.settings || {}, null, 2)}\n`);
      
      // 5. Test mit minimalem PUT Payload
      console.log('5️⃣  MINIMALER PUT TEST\n');
      
      const minimalPayload = {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections
      };
      
      console.log(`   PUT: ${N8N_URL}/api/v1/workflows/${testWorkflowId}`);
      console.log(`   Payload-Keys: ${Object.keys(minimalPayload).join(', ')}`);
      
      try {
        const result = await n8nRequest(`/api/v1/workflows/${testWorkflowId}`, 'PUT', minimalPayload);
        console.log(`   ✅ PUT erfolgreich!\n`);
      } catch (putError) {
        console.log(`   ❌ PUT fehlgeschlagen:`);
        console.log(`   Status: ${putError.statusCode}`);
        console.log(`   Body: ${putError.body}`);
        console.log(`   💡 Problem: API Schema erfordert andere Felder\n`);
      }
      
      // 6. Test mit Settings
      console.log('6️⃣  PUT TEST MIT SETTINGS\n');
      
      const payloadWithSettings = {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: { executionOrder: 'v1' }
      };
      
      try {
        const result = await n8nRequest(`/api/v1/workflows/${testWorkflowId}`, 'PUT', payloadWithSettings);
        console.log(`   ✅ PUT mit Settings erfolgreich!\n`);
      } catch (putError) {
        console.log(`   ❌ PUT mit Settings fehlgeschlagen:`);
        console.log(`   Status: ${putError.statusCode}`);
        console.log(`   Body: ${putError.body}\n`);
      }
      
    } catch (error) {
      console.log(`   ❌ Workflow nicht gefunden!`);
      console.log(`   Status: ${error.statusCode}`);
      console.log(`   Body: ${error.body}\n`);
    }
    
  } catch (error) {
    console.log(`   ❌ GET fehlgeschlagen!`);
    console.log(`   Status: ${error.statusCode || 'unknown'}`);
    console.log(`   Body: ${error.body || error.message}\n`);
  }
  
  console.log('='.repeat(80) + '\n');
}

if (require.main === module) {
  testN8nAPI().catch(console.error);
}

module.exports = { testN8nAPI };
