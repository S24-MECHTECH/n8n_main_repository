/**
 * ANALYZE WORKFLOW STATUS REAL ERROR
 * Analysiert den "Get Workflow Status REAL" Node auf den Fehler:
 * "The expression evaluated to a falsy value: a.ok(from)"
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

async function analyzeWorkflowStatusRealError() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ANALYSE: Get Workflow Status REAL ERROR');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    const statusNode = workflow.nodes.find(n => n.name.includes('Get Workflow Status REAL'));
    
    if (!statusNode) {
      console.log('❌ Node "Get Workflow Status REAL" nicht gefunden!');
      return;
    }
    
    console.log(`📌 Node: ${statusNode.name}\n`);
    
    // Analysiere URL
    const url = statusNode.parameters.url || '';
    console.log('🔗 URL-Analyse:');
    console.log(`   Aktuelle URL: ${url.substring(0, 150)}...`);
    
    // Prüfe auf Expression-Problem
    if (url.includes('{{') && url.includes('}}')) {
      console.log('   ⚠️  URL enthält Expressions - das könnte das Problem sein!');
      
      // Extrahiere Expressions
      const expressions = url.match(/\{\{([^}]+)\}\}/g) || [];
      console.log(`   Gefundene Expressions: ${expressions.length}`);
      expressions.forEach((expr, i) => {
        console.log(`      ${i + 1}. ${expr}`);
        
        // Prüfe ob Expression problematisch ist
        if (expr.includes('$json.workflow_id') || expr.includes('$json.id')) {
          console.log(`         ⚠️  Diese Expression könnte undefined sein!`);
        }
      });
    }
    
    // Prüfe auf "from" in URL (könnte der Fehler sein)
    if (url.toLowerCase().includes('from')) {
      console.log('   ⚠️  URL enthält "from" - könnte SQL-Keyword-Konflikt sein!');
    }
    
    // Analysiere Method
    const method = statusNode.parameters.method || 'GET';
    console.log(`\n📋 Method: ${method}`);
    
    // Analysiere Headers
    const headers = statusNode.parameters.options?.headers?.values || [];
    console.log(`\n📋 Headers (${headers.length}):`);
    headers.forEach(header => {
      console.log(`   - ${header.name}: ${header.value ? '✅ gesetzt' : '❌ leer'}`);
    });
    
    // Analysiere Authentication
    const auth = statusNode.parameters.authentication || 'none';
    const credentialType = statusNode.parameters.nodeCredentialType || 'none';
    console.log(`\n🔐 Authentication:`);
    console.log(`   Type: ${auth}`);
    console.log(`   Credential Type: ${credentialType}`);
    
    if (auth !== 'predefinedCredentialType' || credentialType !== 'supabaseApi') {
      console.log('   ⚠️  Authentication nicht als Supabase API Credential gesetzt!');
    }
    
    // Analysiere Query Parameters (könnten das Problem sein)
    const queryParams = statusNode.parameters.options?.queryParameters?.parameters || [];
    console.log(`\n📋 Query Parameters (${queryParams.length}):`);
    if (queryParams.length > 0) {
      queryParams.forEach(param => {
        console.log(`   - ${param.name}: ${param.value}`);
      });
    } else {
      console.log('   ⚠️  Keine Query Parameters (werden in URL verwendet)');
    }
    
    // Analysiere Body
    const hasBody = statusNode.parameters.sendBody || statusNode.parameters.jsonBody || statusNode.parameters.bodyParameters;
    console.log(`\n📋 Body:`);
    console.log(`   Send Body: ${hasBody ? '⚠️  JA (bei GET falsch!)' : '✅ NEIN'}`);
    
    if (method === 'GET' && hasBody) {
      console.log('   ❌ PROBLEM: GET Request sollte keinen Body haben!');
    }
    
    // FEHLER-ANALYSE
    console.log('\n' + '='.repeat(80));
    console.log('❌ FEHLER-ANALYSE: "a.ok(from)"');
    console.log('='.repeat(80) + '\n');
    
    console.log('🔴 MÖGLICHE URSACHEN:');
    console.log('   1. ❌ Expression in URL ergibt undefined/null');
    console.log('      → {{ $json.workflow_id }} könnte undefined sein');
    console.log('      → Lösung: Fallback-Wert hinzufügen\n');
    
    console.log('   2. ❌ URL enthält ungültige Zeichen');
    console.log('      → SQL-Keyword "from" könnte Problem sein');
    console.log('      → Lösung: URL encoding verwenden\n');
    
    console.log('   3. ❌ Supabase API erwartet anderes Format');
    console.log('      → Query-Parameter-Format könnte falsch sein');
    console.log('      → Lösung: URL-Struktur prüfen\n');
    
    console.log('   4. ❌ Authentication fehlt oder ist falsch');
    console.log('      → API Key wird nicht übertragen');
    console.log('      → Lösung: Supabase Credential prüfen\n');
    
    // LÖSUNGS-VORSCHLAG
    console.log('💡 EMPFOHLENE LÖSUNG:\n');
    
    const baseUrl = 'https://mxswxdnnjhhukovixzvb.supabase.co';
    const fixedUrl = `=${baseUrl}/rest/v1/workflow_status?select=*&workflow_id=eq.{{ $json.workflow_id || $json.id || '${WORKFLOW_ID}' }}&order=created_at.desc&limit={{ $json.limit || 100 }}`;
    
    console.log('   Korrigierte URL (mit Fallback):');
    console.log(`   ${fixedUrl.substring(0, 120)}...\n`);
    
    console.log('   Wichtig:');
    console.log('   - Fallback-Werte: || $json.id || \'ftZOou7HNgLOwzE5\'');
    console.log('   - Method: GET');
    console.log('   - Authentication: Supabase API Credential');
    console.log('   - Headers: Nur Prefer (API Key über Credential)\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

analyzeWorkflowStatusRealError();
