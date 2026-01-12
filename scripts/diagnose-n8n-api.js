/**
 * 🔍 DIAGNOSE N8N API
 * Findet das Grundproblem
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
    } catch (error) {
      console.error(`   ⚠️  Fehler beim Lesen von ${configPath}:`, error.message);
    }
  }
  return null;
}

function n8nRequest(endpoint, method = 'GET', body = null, apiKey = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, N8N_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['X-N8N-API-KEY'] = apiKey;
    }
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: headers
    };
    
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(data), raw: data });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data: data, raw: data });
          }
        } else {
          reject({ statusCode: res.statusCode, data: data, message: `HTTP ${res.statusCode}: ${data}` });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function diagnose() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 N8N API DIAGNOSE');
  console.log('='.repeat(80) + '\n');
  
  // 1. API Key prüfen
  console.log('1️⃣ API KEY CHECK\n');
  const apiKey = getApiKey();
  if (apiKey) {
    console.log(`   ✅ API Key gefunden: ${apiKey.substring(0, 20)}...`);
    console.log(`   Länge: ${apiKey.length} Zeichen\n`);
  } else {
    console.log(`   ❌ API Key NICHT gefunden!\n`);
    console.log('   💡 Prüfe Config-Dateien:');
    console.log('      - mcp.json');
    console.log('      - FUNKTIONIERENDE_CONFIG.json');
    console.log('      - claude_desktop_config.json\n');
    return;
  }
  
  // 2. URL Test (einfacher GET ohne Auth)
  console.log('2️⃣ URL TEST (ohne Auth)\n');
  try {
    const result = await n8nRequest('/api/v1/workflows', 'GET', null, null);
    console.log(`   ⚠️  Antwort erhalten (sollte 401 sein): ${result.statusCode}`);
  } catch (error) {
    if (error.statusCode === 401) {
      console.log(`   ✅ URL erreichbar (401 Unauthorized = korrekt)\n`);
    } else {
      console.log(`   ❌ Fehler: ${error.message}\n`);
    }
  }
  
  // 3. Workflows Liste abrufen (mit Auth)
  console.log('3️⃣ WORKFLOWS LISTE (mit Auth)\n');
  try {
    const result = await n8nRequest('/api/v1/workflows', 'GET', null, apiKey);
    console.log(`   ✅ API Key VALID!`);
    console.log(`   Anzahl Workflows: ${result.data?.length || 0}\n`);
    
    // Finde MECHTECH Workflow
    const mechtechWorkflow = result.data?.find(w => 
      w.name?.includes('MECHTECH') || w.name?.includes('MERCHANT')
    );
    
    if (mechtechWorkflow) {
      console.log(`   📋 MECHTECH Workflow gefunden:`);
      console.log(`      Name: ${mechtechWorkflow.name}`);
      console.log(`      ID: ${mechtechWorkflow.id}`);
      console.log(`      Status: ${mechtechWorkflow.active ? 'ACTIVE' : 'INACTIVE'}\n`);
      
      if (mechtechWorkflow.id !== WORKFLOW_ID) {
        console.log(`   ⚠️  WARNUNG: Workflow-ID stimmt nicht überein!`);
        console.log(`      Erwartet: ${WORKFLOW_ID}`);
        console.log(`      Gefunden: ${mechtechWorkflow.id}\n`);
      }
    } else {
      console.log(`   ⚠️  MECHTECH Workflow nicht in Liste gefunden\n`);
    }
  } catch (error) {
    console.log(`   ❌ Fehler: ${error.message}\n`);
  }
  
  // 4. Workflow-Details abrufen
  console.log('4️⃣ WORKFLOW DETAILS (GET)\n');
  try {
    const result = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'GET', null, apiKey);
    console.log(`   ✅ Workflow gefunden: ${result.data.name}`);
    console.log(`      Nodes: ${result.data.nodes?.length || 0}`);
    console.log(`      Status: ${result.data.active ? 'ACTIVE' : 'INACTIVE'}\n`);
    
    // Analysiere Settings
    console.log(`   📋 Settings-Struktur:`);
    console.log(`      ${JSON.stringify(result.data.settings || {}, null, 6)}\n`);
    
    // Test: Minimaler Update
    console.log('5️⃣ TEST: MINIMALER UPDATE\n');
    
    const minimalPayload = {
      name: result.data.name,
      nodes: result.data.nodes,
      connections: result.data.connections
      // KEINE settings!
    };
    
    try {
      const updateResult = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', minimalPayload, apiKey);
      console.log(`   ✅ MINIMALER Update erfolgreich! (ohne settings)\n`);
    } catch (error) {
      console.log(`   ❌ Update fehlgeschlagen: ${error.message}\n`);
      
      // Versuche mit nur executionOrder
      console.log('6️⃣ TEST: UPDATE MIT NUR executionOrder\n');
      const payloadWithExecutionOrder = {
        name: result.data.name,
        nodes: result.data.nodes,
        connections: result.data.connections,
        settings: { executionOrder: result.data.settings?.executionOrder || 'v1' }
      };
      
      try {
        const updateResult2 = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', payloadWithExecutionOrder, apiKey);
        console.log(`   ✅ Update mit executionOrder erfolgreich!\n`);
      } catch (error2) {
        console.log(`   ❌ Auch das fehlgeschlagen: ${error2.message}\n`);
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Fehler: ${error.message}\n`);
    console.log(`   💡 Mögliche Ursachen:`);
    console.log(`      - Workflow-ID falsch: ${WORKFLOW_ID}`);
    console.log(`      - API Key hat keine Berechtigung`);
    console.log(`      - Workflow existiert nicht\n`);
  }
  
  console.log('='.repeat(80) + '\n');
}

if (require.main === module) {
  diagnose();
}

module.exports = { diagnose };
