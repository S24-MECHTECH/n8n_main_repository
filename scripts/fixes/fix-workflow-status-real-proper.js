/**
 * FIX GET WORKFLOW STATUS REAL NODE - PROPER FIX
 * Behebt die Fehlerursache statt sie zu verstecken
 */

const https = require('https');
const http = require('http');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const N8N_API_KEY = process.env.N8N_API_KEY || process.argv[2];
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY fehlt!');
  process.exit(1);
}

function n8nRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, N8N_URL);
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

/**
 * Fix Get Workflow Status REAL Node - RICHTIG
 * Nutzt GET Request mit Query-Parametern (Supabase Standard)
 */
function fixWorkflowStatusRealNode(node) {
  if (!node.name.includes('Get Workflow Status REAL')) return node;
  
  let changes = 0;
  
  // 1. Setze Method auf GET (Supabase REST API Standard)
  if (!node.parameters.method || node.parameters.method !== 'GET') {
    node.parameters.method = 'GET';
    changes++;
    console.log('   ✅ Method gesetzt: GET');
  }
  
  // 2. Korrigiere URL - GET mit Query-Parametern
  const baseUrl = 'https://mxswxdnnjhhukovixzvb.supabase.co';
  
  // Supabase REST API: GET /rest/v1/table?select=*&filter
  // Nutze Input-Daten für Filter, mit Fallbacks
  const newUrl = `=${baseUrl}/rest/v1/workflow_status?select=*&workflow_id=eq.{{ $json.workflow_id || $json.id || '${WORKFLOW_ID}' }}&order=created_at.desc&limit={{ $json.limit || 100 }}`;
  
  if (!node.parameters.url || !node.parameters.url.includes('/rest/v1/')) {
    node.parameters.url = newUrl;
    changes++;
    console.log('   ✅ URL korrigiert: GET Request mit Query-Parametern');
  }
  
  // 3. Entferne JSON Body (GET braucht keinen Body)
  if (node.parameters.jsonParameters || node.parameters.jsonBody) {
    node.parameters.jsonParameters = false;
    node.parameters.jsonBody = '';
    changes++;
    console.log('   ✅ JSON Body entfernt (GET Request)');
  }
  
  if (node.parameters.bodyParameters) {
    node.parameters.bodyParameters = undefined;
    changes++;
    console.log('   ✅ Body Parameters entfernt');
  }
  
  // 4. Füge Headers hinzu (für Supabase)
  if (!node.parameters.options) {
    node.parameters.options = {};
  }
  if (!node.parameters.options.headers) {
    node.parameters.options.headers = {};
  }
  if (!node.parameters.options.headers.values) {
    node.parameters.options.headers.values = [];
  }
  
  const headers = node.parameters.options.headers.values;
  const existingHeaderNames = headers.map(h => h.name);
  
  // apikey Header (Supabase)
  if (!existingHeaderNames.includes('apikey')) {
    headers.push({
      name: 'apikey',
      value: '={{ $("Shop Configuration2").first().json.supabase_api_key || $env.SUPABASE_API_KEY }}'
    });
    changes++;
    console.log('   ✅ Header hinzugefügt: apikey (Supabase)');
  }
  
  // Authorization Header (falls nötig)
  if (!existingHeaderNames.includes('Authorization')) {
    headers.push({
      name: 'Authorization',
      value: '=Bearer {{ $("Shop Configuration2").first().json.supabase_bearer_token || $env.SUPABASE_BEARER_TOKEN }}'
    });
    changes++;
    console.log('   ✅ Header hinzugefügt: Authorization (Bearer)');
  }
  
  // Prefer Header (für Supabase)
  if (!existingHeaderNames.includes('Prefer')) {
    headers.push({
      name: 'Prefer',
      value: 'return=representation'
    });
    changes++;
    console.log('   ✅ Header hinzugefügt: Prefer');
  }
  
  // 5. Setze sendHeaders
  node.parameters.sendHeaders = true;
  
  // 6. Response Options - KEIN neverError! (Fehler sollen sichtbar sein)
  if (!node.parameters.options.response) {
    node.parameters.options.response = {};
  }
  if (!node.parameters.options.response.response) {
    node.parameters.options.response.response = {};
  }
  
  // ENTFERNE neverError (falls gesetzt)
  if (node.parameters.options.response.response.neverError === true) {
    node.parameters.options.response.response.neverError = false;
    changes++;
    console.log('   ✅ neverError DEAKTIVIERT (Fehler werden jetzt angezeigt)');
  }
  
  node.parameters.options.response.response.responseFormat = 'json';
  node.parameters.options.response.response.fullResponse = false;
  
  // 7. Retry Options (bei temporären Fehlern)
  if (!node.parameters.options.retry) {
    node.parameters.options.retry = {};
  }
  if (!node.parameters.options.retry.retry) {
    node.parameters.options.retry.retry = {};
    node.parameters.options.retry.retry.maxRetries = 3;
    node.parameters.options.retry.retry.retryOnFail = true;
    node.parameters.options.retry.retry.retryDelay = 1000;
    changes++;
    console.log('   ✅ Retry Options hinzugefügt');
  }
  
  // 8. Authentication (falls Supabase Credentials vorhanden)
  if (!node.parameters.authentication) {
    // Versuche Supabase API Credential zu verwenden
    node.parameters.authentication = 'predefinedCredentialType';
    node.parameters.nodeCredentialType = 'supabaseApi';
    changes++;
    console.log('   ✅ Authentication gesetzt: Supabase API');
  }
  
  return { node, changes };
}

/**
 * Hauptfunktion
 */
async function fixWorkflowStatusRealProper() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX GET WORKFLOW STATUS REAL NODE - PROPER FIX');
  console.log('='.repeat(80));
  console.log(`Workflow ID: ${WORKFLOW_ID}`);
  console.log(`n8n URL: ${N8N_URL}\n`);
  
  try {
    // Hole Workflow
    console.log('📥 Lade Workflow...');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    console.log(`✅ Workflow geladen: ${workflow.name}\n`);
    
    // Finde Node
    const statusNodeIndex = workflow.nodes.findIndex(n => 
      n.name.includes('Get Workflow Status REAL')
    );
    
    if (statusNodeIndex === -1) {
      console.log('❌ Node "Get Workflow Status REAL" nicht gefunden!');
      return;
    }
    
    const statusNode = workflow.nodes[statusNodeIndex];
    
    console.log('🔧 Korrigiere Get Workflow Status REAL Node...\n');
    console.log(`   Aktueller Zustand:`);
    console.log(`   - Method: ${statusNode.parameters.method || 'FEHLT'}`);
    console.log(`   - URL: ${statusNode.parameters.url ? statusNode.parameters.url.substring(0, 80) + '...' : 'FEHLT'}`);
    console.log(`   - Headers: ${statusNode.parameters.options?.headers?.values?.length || 0}`);
    console.log(`   - Body: ${statusNode.parameters.jsonParameters ? 'JSON' : statusNode.parameters.bodyParameters ? 'Body' : 'Keiner'}\n`);
    
    // Korrigiere Node
    const result = fixWorkflowStatusRealNode(statusNode);
    
    if (result.changes === 0) {
      console.log('✅ Node ist bereits korrekt konfiguriert!\n');
    } else {
      console.log(`\n✅ ${result.changes} Korrektur(en) durchgeführt\n`);
    }
    
    // Aktualisiere Node im Workflow
    workflow.nodes[statusNodeIndex] = result.node;
    
    // Aktualisiere Workflow
    console.log('💾 Aktualisiere Workflow...');
    
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: {}
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    
    console.log('✅ Workflow erfolgreich aktualisiert!\n');
    console.log('📊 ZUSAMMENFASSUNG:');
    console.log(`   Korrekturen: ${result.changes}`);
    console.log('\n🎯 Node-Konfiguration:');
    console.log(`   - Method: GET (Supabase REST API Standard)`);
    console.log(`   - URL: Mit Query-Parametern (workflow_id, limit, order)`);
    console.log(`   - Headers: apikey, Authorization, Prefer`);
    console.log(`   - Body: KEINER (GET Request)`);
    console.log(`   - neverError: FALSE (Fehler werden angezeigt)`);
    console.log(`   - Retry: 3 Versuche bei temporären Fehlern\n`);
    console.log('⚠️  WICHTIG: Prüfen Sie ob Supabase Credentials korrekt sind!');
    console.log('   Falls Fehler weiterhin auftreten, prüfen Sie:');
    console.log('   - Supabase API Key in Shop Configuration2');
    console.log('   - Tabellenname (workflow_status)');
    console.log('   - RLS (Row Level Security) Policies\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fixWorkflowStatusRealProper();

