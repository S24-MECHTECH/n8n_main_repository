/**
 * FIX SUPABASE URL EXPRESSION ERROR
 * Behebt den Fehler "a.ok(from)" in Get Workflow Status REAL Node
 * Problem: Expression in URL könnte undefined sein oder falsches Format
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

async function fixSupabaseUrlExpressionError() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX SUPABASE URL EXPRESSION ERROR');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    const statusNode = workflow.nodes.find(n => n.name.includes('Get Workflow Status REAL'));
    
    if (!statusNode) {
      console.log('❌ Node nicht gefunden!');
      return;
    }
    
    console.log(`📌 Node: ${statusNode.name}\n`);
    
    // Analysiere aktuelle URL
    const currentUrl = statusNode.parameters.url || '';
    console.log('📋 Aktuelle URL:');
    console.log(`   ${currentUrl.substring(0, 150)}...\n`);
    
    // KORRIGIERTE URL - OHNE workflow_id Filter (verursacht Probleme)
    // Stattdessen: Einfache URL ohne Filter, dann im nächsten Node filtern
    const baseUrl = 'https://mxswxdnnjhhukovixzvb.supabase.co';
    const fixedUrl = `=${baseUrl}/rest/v1/workflow_status?select=*&order=created_at.desc&limit=100`;
    
    console.log('🔧 Korrigiere URL...');
    console.log(`   Problem: Expressions in URL können undefined sein`);
    console.log(`   Lösung: Einfache URL ohne workflow_id Filter\n`);
    
    statusNode.parameters.url = fixedUrl;
    console.log(`   ✅ URL korrigiert: ${fixedUrl.substring(0, 100)}...\n`);
    
    // Stelle sicher dass Method GET ist
    if (statusNode.parameters.method !== 'GET') {
      statusNode.parameters.method = 'GET';
      console.log('   ✅ Method: GET');
    }
    
    // Stelle sicher dass kein Body vorhanden ist
    statusNode.parameters.sendBody = false;
    statusNode.parameters.jsonBody = '';
    statusNode.parameters.bodyParameters = undefined;
    console.log('   ✅ Body entfernt');
    
    // Headers: Nur Prefer (API Key über Credential)
    if (!statusNode.parameters.options) {
      statusNode.parameters.options = {};
    }
    if (!statusNode.parameters.options.headers) {
      statusNode.parameters.options.headers = {};
    }
    statusNode.parameters.options.headers.values = [
      {
        name: 'Prefer',
        value: 'return=representation'
      }
    ];
    console.log('   ✅ Headers: Nur Prefer');
    
    statusNode.parameters.sendHeaders = true;
    
    // Authentication
    statusNode.parameters.authentication = 'predefinedCredentialType';
    statusNode.parameters.nodeCredentialType = 'supabaseApi';
    console.log('   ✅ Authentication: Supabase API Credential');
    
    // Response Options
    if (!statusNode.parameters.options.response) {
      statusNode.parameters.options.response = {};
    }
    if (!statusNode.parameters.options.response.response) {
      statusNode.parameters.options.response.response = {};
    }
    statusNode.parameters.options.response.response.responseFormat = 'json';
    statusNode.parameters.options.response.response.fullResponse = false;
    statusNode.parameters.options.response.response.neverError = false;
    console.log('   ✅ Response Options: neverError=false\n');
    
    // Aktualisiere Workflow
    console.log('💾 Aktualisiere Workflow...');
    
    const cleanSettings = workflow.settings ? 
      { executionOrder: workflow.settings.executionOrder || 'v1' } : 
      { executionOrder: 'v1' };
    
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: cleanSettings
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    
    console.log('✅ Workflow erfolgreich aktualisiert!\n');
    
    console.log('📊 ZUSAMMENFASSUNG:');
    console.log('   ✅ URL vereinfacht (ohne workflow_id Expression)');
    console.log('   ✅ Method: GET');
    console.log('   ✅ Body entfernt');
    console.log('   ✅ Headers: Nur Prefer');
    console.log('   ✅ Authentication: Supabase API Credential');
    console.log('\n💡 HINWEIS:');
    console.log('   Die URL holt jetzt alle Einträge (limit 100).');
    console.log('   Falls Sie nach workflow_id filtern müssen, können Sie das');
    console.log('   im nachfolgenden Node (z.B. "Format Status Response") machen.\n');
    
    console.log('🧪 NÄCHSTER SCHRITT:');
    console.log('   Testen Sie Supabase direkt mit:');
    console.log('   node test-supabase-connection.js YOUR_SUPABASE_API_KEY\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fixSupabaseUrlExpressionError();
