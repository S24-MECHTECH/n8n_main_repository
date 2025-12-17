/**
 * FIX GET WORKFLOW STATUS REAL NODE
 * Korrigiert fehlende Parameter, Headers, Body und fügt Fallback hinzu
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
 * Fix Get Workflow Status REAL Node
 */
function fixWorkflowStatusRealNode(node, workflow) {
  if (!node.name.includes('Get Workflow Status REAL')) return node;
  
  let changes = 0;
  
  // 1. Setze Method (POST für Supabase REST API)
  if (!node.parameters.method || node.parameters.method === 'GET') {
    node.parameters.method = 'POST';
    changes++;
    console.log('   ✅ Method gesetzt: POST');
  }
  
  // 2. Korrigiere URL (vollständige Supabase REST API URL)
  const currentUrl = node.parameters.url || '';
  if (!currentUrl.includes('/rest/v1/') && currentUrl.includes('supabase.co')) {
    // Wahrscheinlich sollte es auf eine Tabelle zugreifen
    // Standard: /rest/v1/{table}?select=*
    const baseUrl = currentUrl.replace(/\/$/, '');
    node.parameters.url = `=${baseUrl}/rest/v1/workflow_status?select=*`;
    changes++;
    console.log('   ✅ URL korrigiert: Supabase REST API Endpoint hinzugefügt');
  }
  
  // 3. Füge Headers hinzu
  if (!node.parameters.options) {
    node.parameters.options = {};
  }
  if (!node.parameters.options.headers) {
    node.parameters.options.headers = { values: [] };
  }
  
  const headers = node.parameters.options.headers.values || [];
  const existingHeaderNames = headers.map(h => h.name);
  
  // Content-Type Header
  if (!existingHeaderNames.includes('Content-Type')) {
    headers.push({
      name: 'Content-Type',
      value: 'application/json'
    });
    changes++;
    console.log('   ✅ Header hinzugefügt: Content-Type');
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
  
  // 4. Setze sendHeaders
  if (!node.parameters.sendHeaders) {
    node.parameters.sendHeaders = true;
    changes++;
    console.log('   ✅ Send Headers aktiviert');
  }
  
  // 5. Füge Body hinzu (für POST Request mit Filter)
  if (!node.parameters.bodyParameters && !node.parameters.jsonParameters) {
    // Nutze jsonParameters für komplexere Bodies
    node.parameters.jsonParameters = true;
    node.parameters.jsonBody = `={
  "filter": {
    "workflow_id": "{{ $json.workflow_id || $json.id || '${WORKFLOW_ID}' }}",
    "status": "{{ $json.status || 'running' }}"
  },
  "limit": {{ $json.limit || 100 }},
  "offset": {{ $json.offset || 0 }}
}`;
    changes++;
    console.log('   ✅ JSON Body hinzugefügt (mit Fallback-Werten)');
  }
  
  // 6. Füge Response Options hinzu
  if (!node.parameters.options.response) {
    node.parameters.options.response = {
      response: {
        responseFormat: 'json',
        fullResponse: false,
        neverError: true  // Wichtig: Verhindert Fehler, gibt stattdessen leeres Objekt zurück
      }
    };
    changes++;
    console.log('   ✅ Response Options hinzugefügt (neverError aktiviert)');
  } else {
    // Stelle sicher dass neverError gesetzt ist
    if (!node.parameters.options.response.response) {
      node.parameters.options.response.response = {};
    }
    if (node.parameters.options.response.response.neverError !== true) {
      node.parameters.options.response.response.neverError = true;
      changes++;
      console.log('   ✅ neverError aktiviert (Fallback bei Fehlern)');
    }
  }
  
  // 7. Füge Retry Options hinzu
  if (!node.parameters.options.retry) {
    node.parameters.options.retry = {
      retry: {
        maxRetries: 3,
        retryOnFail: true,
        retryDelay: 1000
      }
    };
    changes++;
    console.log('   ✅ Retry Options hinzugefügt (3 Versuche, 1s Delay)');
  }
  
  // 8. Prüfe Authentication
  if (!node.parameters.authentication) {
    // Nutze predefinedCredentialType für Supabase
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
async function fixWorkflowStatusReal() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX GET WORKFLOW STATUS REAL NODE');
  console.log('='.repeat(80));
  console.log(`Workflow ID: ${WORKFLOW_ID}`);
  console.log(`n8n URL: ${N8N_URL}\n`);
  
  try {
    // Hole Workflow
    console.log('📥 Lade Workflow...');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    console.log(`✅ Workflow geladen: ${workflow.name}\n`);
    
    // Finde Node
    const statusNode = workflow.nodes.find(n => 
      n.name.includes('Get Workflow Status REAL')
    );
    
    if (!statusNode) {
      console.log('❌ Node "Get Workflow Status REAL" nicht gefunden!');
      return;
    }
    
    console.log('🔧 Korrigiere Get Workflow Status REAL Node...\n');
    
    // Korrigiere Node
    const result = fixWorkflowStatusRealNode(statusNode, workflow);
    
    if (result.changes === 0) {
      console.log('✅ Node ist bereits korrekt konfiguriert!\n');
      return;
    }
    
    console.log(`\n✅ ${result.changes} Korrektur(en) durchgeführt\n`);
    
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
    console.log('\n🎯 Get Workflow Status REAL Node ist jetzt korrekt konfiguriert!');
    console.log('   - Method: POST');
    console.log('   - Headers: Content-Type, Prefer');
    console.log('   - Body: JSON mit Fallback-Werten');
    console.log('   - neverError: true (Fallback bei Fehlern)');
    console.log('   - Retry: 3 Versuche\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fixWorkflowStatusReal();
