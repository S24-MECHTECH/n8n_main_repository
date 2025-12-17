/**
 * VERIFY WORKFLOW SAVED
 * Prüft ob die Änderungen am Workflow gespeichert wurden
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

async function verifyWorkflowSaved() {
  console.log('\n' + '='.repeat(80));
  console.log('✅ VERIFY: Workflow Änderungen gespeichert?');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    console.log(`📌 Workflow: ${workflow.name} (ID: ${WORKFLOW_ID})\n`);
    
    // Prüfe Get Workflow Status REAL Node
    const statusNode = workflow.nodes.find(n => n.name.includes('Get Workflow Status REAL'));
    
    if (!statusNode) {
      console.log('❌ Node "Get Workflow Status REAL" nicht gefunden!\n');
      return;
    }
    
    console.log('🔍 Prüfe "Get Workflow Status REAL" Node:\n');
    
    // Prüfe URL
    const url = statusNode.parameters.url || '';
    const expectedUrl = 'https://mxswxdnnjhhukovixzvb.supabase.co/rest/v1/workflow_status?select=*&order=created_at.desc&limit=100';
    const hasExpectedUrl = url.includes('workflow_status?select=*&order=created_at.desc&limit=100');
    const hasProblematicExpression = url.includes('workflow_id=eq.{{');
    
    console.log(`   URL: ${url.substring(0, 120)}...`);
    if (hasExpectedUrl && !hasProblematicExpression) {
      console.log(`   ✅ URL ist korrekt (vereinfacht, ohne Expression-Fehler)\n`);
    } else if (hasProblematicExpression) {
      console.log(`   ❌ URL enthält noch problematische Expression!\n`);
    } else {
      console.log(`   ⚠️  URL sieht anders aus als erwartet\n`);
    }
    
    // Prüfe Method
    const method = statusNode.parameters.method || '';
    console.log(`   Method: ${method}`);
    if (method === 'GET') {
      console.log(`   ✅ Method ist GET (korrekt)\n`);
    } else {
      console.log(`   ❌ Method sollte GET sein, ist aber: ${method}\n`);
    }
    
    // Prüfe Body
    const hasBody = statusNode.parameters.sendBody || statusNode.parameters.jsonBody || statusNode.parameters.bodyParameters;
    console.log(`   Body vorhanden: ${hasBody ? '❌ JA (falsch bei GET!)' : '✅ NEIN (korrekt)'}\n`);
    
    // Prüfe Authentication
    const auth = statusNode.parameters.authentication || '';
    const credentialType = statusNode.parameters.nodeCredentialType || '';
    console.log(`   Authentication: ${auth}`);
    console.log(`   Credential Type: ${credentialType}`);
    if (auth === 'predefinedCredentialType' && credentialType === 'supabaseApi') {
      console.log(`   ✅ Authentication korrekt konfiguriert (Supabase API)\n`);
    } else {
      console.log(`   ⚠️  Authentication sollte 'predefinedCredentialType' mit 'supabaseApi' sein\n`);
    }
    
    // Zusammenfassung
    console.log('='.repeat(80));
    console.log('📊 ZUSAMMENFASSUNG:\n');
    
    const allCorrect = hasExpectedUrl && !hasProblematicExpression && method === 'GET' && !hasBody && auth === 'predefinedCredentialType';
    
    if (allCorrect) {
      console.log('✅ ALLE ÄNDERUNGEN SIND GESPEICHERT!');
      console.log('   → Workflow wurde erfolgreich aktualisiert');
      console.log('   → Sie müssen NICHTS nachladen');
      console.log('   → Die Änderungen sind bereits aktiv\n');
    } else {
      console.log('⚠️  ES GIBT NOCH PROBLEME:');
      if (hasProblematicExpression) console.log('   - URL enthält noch problematische Expression');
      if (method !== 'GET') console.log(`   - Method ist nicht GET: ${method}`);
      if (hasBody) console.log('   - Body sollte nicht vorhanden sein');
      if (auth !== 'predefinedCredentialType') console.log('   - Authentication nicht korrekt');
      console.log('\n💡 Möglicherweise müssen Sie die Änderungen nochmal anwenden.\n');
    }
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

verifyWorkflowSaved();
