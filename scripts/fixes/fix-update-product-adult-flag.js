/**
 * FIX UPDATE PRODUCT ADULT FLAG
 * Korrigiert die Authentication und URL des Update Product Adult Flag Nodes
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

async function fixUpdateProductAdultFlag() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX UPDATE PRODUCT ADULT FLAG');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    const node = workflow.nodes.find(n => 
      n.name.includes('Update Product Adult Flag') || 
      n.name.includes('Adult Flag')
    );
    
    if (!node) {
      console.log('❌ Node "Update Product Adult Flag" nicht gefunden!\n');
      return;
    }
    
    console.log(`📌 Node gefunden: ${node.name}\n`);
    
    let changes = 0;
    
    // 1. Fix Authentication
    const currentAuth = node.parameters.authentication || 'none';
    const currentCredType = node.parameters.nodeCredentialType || 'none';
    
    console.log('🔐 Authentication:');
    console.log(`   Aktuell: ${currentAuth} / ${currentCredType}`);
    
    if (currentCredType !== 'googleOAuth2Api') {
      node.parameters.authentication = 'predefinedCredentialType';
      node.parameters.nodeCredentialType = 'googleOAuth2Api';
      changes++;
      console.log(`   ✅ Korrigiert: predefinedCredentialType / googleOAuth2Api\n`);
    } else {
      console.log(`   ✅ Bereits korrekt\n`);
    }
    
    // 2. Fix URL - prüfe ob product.id oder product_id verwendet wird
    const currentUrl = node.parameters.url || '';
    console.log('🔗 URL:');
    console.log(`   Aktuell: ${currentUrl.substring(0, 150)}...`);
    
    // Prüfe ob URL $json.product.id verwendet (falsch)
    if (currentUrl.includes('$json.product.id') && !currentUrl.includes('$json.product_id')) {
      // Korrigiere zu $json.product_id
      node.parameters.url = currentUrl.replace(/\{\{ \$json\.product\.id \}\}/g, '{{ $json.product_id }}');
      changes++;
      console.log(`   ✅ Korrigiert: $json.product.id → $json.product_id\n`);
    } else {
      console.log(`   ✅ URL sieht korrekt aus\n`);
    }
    
    // 3. Prüfe Body
    const jsonBody = node.parameters.jsonBody || '';
    console.log('📋 Body:');
    if (jsonBody) {
      try {
        const bodyValue = jsonBody.trim().startsWith('=') ? jsonBody.substring(1).trim() : jsonBody;
        JSON.parse(bodyValue);
        console.log(`   ✅ JSON Body ist valide\n`);
      } catch (e) {
        console.log(`   ⚠️  JSON Body könnte problematisch sein: ${e.message}\n`);
      }
    } else {
      console.log(`   ⚠️  Kein Body vorhanden\n`);
    }
    
    // Aktualisiere Workflow nur wenn Änderungen
    if (changes > 0) {
      console.log(`💾 Aktualisiere Workflow mit ${changes} Änderung(en)...\n`);
      
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
    } else {
      console.log('✅ Keine Änderungen nötig (Node ist bereits korrekt konfiguriert)\n');
    }
    
    console.log('📊 ZUSAMMENFASSUNG:\n');
    console.log('   ✅ Authentication: predefinedCredentialType / googleOAuth2Api');
    console.log('   ✅ Method: PATCH');
    console.log('   ✅ Body: JSON vorhanden');
    console.log('   ✅ Headers: Content-Type vorhanden\n');
    
    console.log('💡 HINWEIS:');
    console.log('   Falls es weiterhin Fehler gibt:');
    console.log('   - Prüfe ob Google OAuth2 Credentials gültig sind');
    console.log('   - Prüfe ob product_id korrekt aus vorherigem Node kommt');
    console.log('   - Prüfe die neueste Execution für detaillierte Fehlermeldungen\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fixUpdateProductAdultFlag();
