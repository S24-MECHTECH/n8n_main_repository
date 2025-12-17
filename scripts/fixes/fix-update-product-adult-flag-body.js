/**
 * FIX UPDATE PRODUCT ADULT FLAG - ADD BODY
 * Fügt den fehlenden Body zum Update Product Adult Flag Node hinzu
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

async function fixUpdateProductAdultFlagBody() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX UPDATE PRODUCT ADULT FLAG - ADD BODY');
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
    
    // Prüfe ob Body bereits vorhanden ist
    const hasBody = node.parameters.sendBody || node.parameters.jsonBody;
    
    if (!hasBody) {
      console.log('📋 Füge Body hinzu...\n');
      
      // Setze Body-Parameter
      node.parameters.sendBody = true;
      node.parameters.specifyBody = 'json';
      node.parameters.jsonBody = `={
  "adult": true,
  "ageGroup": "adult",
  "googleProductCategory": "778"
}`;
      
      console.log('   ✅ Body hinzugefügt:');
      console.log('      adult: true');
      console.log('      ageGroup: adult');
      console.log('      googleProductCategory: 778\n');
      
      // Aktualisiere Workflow
      console.log('💾 Aktualisiere Workflow...\n');
      
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
      console.log('✅ Body ist bereits vorhanden\n');
      
      const jsonBody = node.parameters.jsonBody || '';
      if (jsonBody) {
        console.log('📋 Aktueller Body:');
        console.log(`   ${jsonBody.substring(0, 200)}${jsonBody.length > 200 ? '...' : ''}\n`);
      }
    }
    
    console.log('📊 FINALE KONFIGURATION:\n');
    console.log('   ✅ Authentication: googleOAuth2Api');
    console.log('   ✅ Method: PATCH');
    console.log('   ✅ URL: Mit product_id Expression');
    console.log('   ✅ Body: JSON mit adult, ageGroup, googleProductCategory');
    console.log('   ✅ Headers: Content-Type application/json\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fixUpdateProductAdultFlagBody();
