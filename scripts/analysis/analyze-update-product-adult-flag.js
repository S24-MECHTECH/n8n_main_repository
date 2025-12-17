/**
 * ANALYZE UPDATE PRODUCT ADULT FLAG
 * Analysiert den Update Product Adult Flag Node auf Fehler
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

async function analyzeUpdateProductAdultFlag() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ANALYSE: Update Product Adult Flag');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    // Finde den Node
    const node = workflow.nodes.find(n => 
      n.name.includes('Update Product Adult Flag') || 
      n.name.includes('Adult Flag')
    );
    
    if (!node) {
      console.log('⚠️  Node "Update Product Adult Flag" nicht gefunden!');
      console.log('   Suche nach ähnlichen Namen...\n');
      
      const similarNodes = workflow.nodes.filter(n => 
        n.name.toLowerCase().includes('adult') ||
        n.name.toLowerCase().includes('flag')
      );
      
      if (similarNodes.length > 0) {
        console.log('   Gefundene ähnliche Nodes:');
        similarNodes.forEach(n => console.log(`   - ${n.name}`));
        console.log();
      }
      
      return;
    }
    
    console.log(`📌 Node gefunden: ${node.name}`);
    console.log(`   Type: ${node.type}\n`);
    
    // Analysiere Parameter
    const params = node.parameters || {};
    
    console.log('📋 KONFIGURATION:\n');
    
    // Method
    const method = params.method || 'GET';
    console.log(`   Method: ${method}`);
    if (method !== 'PATCH') {
      console.log(`   ⚠️  WARNUNG: Sollte PATCH sein für Updates!`);
    }
    console.log();
    
    // URL
    const url = params.url || '';
    console.log(`   URL: ${url.substring(0, 150)}...`);
    
    // Prüfe URL auf Expressions
    if (url.includes('{{')) {
      console.log(`   ✅ URL enthält Expressions (wahrscheinlich für product_id)`);
    } else {
      console.log(`   ⚠️  URL enthält keine Expressions - könnte statisch sein`);
    }
    console.log();
    
    // Authentication
    const auth = params.authentication || 'none';
    const credentialType = params.nodeCredentialType || 'none';
    console.log(`   Authentication: ${auth}`);
    console.log(`   Credential Type: ${credentialType}`);
    if (auth === 'predefinedCredentialType' && credentialType === 'googleOAuth2Api') {
      console.log(`   ✅ Google OAuth2 API Credential konfiguriert`);
    } else {
      console.log(`   ⚠️  Authentication sollte 'googleOAuth2Api' sein!`);
    }
    console.log();
    
    // Headers
    const headers = params.options?.headers?.values || params.headerParameters?.parameters || [];
    console.log(`   Headers (${headers.length}):`);
    if (headers.length > 0) {
      headers.forEach(h => {
        const name = h.name || h.key || 'N/A';
        const value = h.value || 'N/A';
        console.log(`      - ${name}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
      });
    } else {
      console.log(`      ⚠️  Keine Headers konfiguriert`);
    }
    console.log();
    
    // Body
    const sendBody = params.sendBody || false;
    const jsonBody = params.jsonBody || '';
    const bodyParameters = params.bodyParameters;
    
    console.log(`   Send Body: ${sendBody ? '✅ JA' : '❌ NEIN'}`);
    
    if (sendBody) {
      if (params.specifyBody === 'json') {
        console.log(`   Body Type: JSON`);
        console.log(`   JSON Body: ${jsonBody.substring(0, 200)}${jsonBody.length > 200 ? '...' : ''}`);
        
        // Prüfe ob Body korrekt formatiert ist
        try {
          if (jsonBody.trim().startsWith('=')) {
            const bodyValue = jsonBody.substring(1).trim();
            JSON.parse(bodyValue);
            console.log(`   ✅ JSON Body ist valides JSON`);
          } else {
            JSON.parse(jsonBody);
            console.log(`   ✅ JSON Body ist valides JSON`);
          }
        } catch (e) {
          console.log(`   ❌ JSON Body ist KEIN valides JSON: ${e.message}`);
        }
      } else if (params.specifyBody === 'jsonParameters') {
        console.log(`   Body Type: JSON Parameters`);
        if (bodyParameters) {
          console.log(`   ✅ Body Parameters vorhanden`);
        }
      }
    } else {
      console.log(`   ⚠️  Kein Body - PATCH Request benötigt normalerweise einen Body!`);
    }
    console.log();
    
    // Options
    console.log('📋 OPTIONS:\n');
    
    const continueOnFail = params.continueOnFail || false;
    console.log(`   Continue On Fail: ${continueOnFail ? '✅ JA' : '❌ NEIN'}`);
    
    const neverError = params.options?.response?.response?.neverError || false;
    console.log(`   Never Error: ${neverError ? '⚠️  JA (Fehler werden unterdrückt!)' : '✅ NEIN'}`);
    console.log();
    
    // Prüfe auf häufige Fehler
    console.log('🔍 HÄUFIGE FEHLER-CHECKS:\n');
    
    let errorFound = false;
    
    // 1. Fehlende Authentication
    if (auth !== 'predefinedCredentialType' || credentialType !== 'googleOAuth2Api') {
      console.log(`   ❌ FEHLER: Authentication nicht korrekt konfiguriert!`);
      console.log(`      → Sollte: predefinedCredentialType mit googleOAuth2Api`);
      errorFound = true;
    } else {
      console.log(`   ✅ Authentication korrekt`);
    }
    
    // 2. Falsche Method
    if (method !== 'PATCH') {
      console.log(`   ❌ FEHLER: Method sollte PATCH sein, ist aber ${method}!`);
      errorFound = true;
    } else {
      console.log(`   ✅ Method korrekt (PATCH)`);
    }
    
    // 3. Kein Body bei PATCH
    if (method === 'PATCH' && !sendBody) {
      console.log(`   ❌ FEHLER: PATCH Request benötigt einen Body!`);
      errorFound = true;
    } else if (method === 'PATCH' && sendBody) {
      console.log(`   ✅ Body vorhanden für PATCH`);
    }
    
    // 4. URL Format
    if (!url.includes('products/{{') && !url.includes('products/$')) {
      console.log(`   ⚠️  WARNUNG: URL enthält möglicherweise keine product_id Expression`);
      console.log(`      → Erwartet: .../products/{{ $json.product_id }}`);
    } else {
      console.log(`   ✅ URL enthält product_id Expression`);
    }
    
    // 5. Content-Type Header
    const hasContentType = headers.some(h => 
      (h.name || h.key || '').toLowerCase() === 'content-type'
    );
    if (!hasContentType && sendBody) {
      console.log(`   ⚠️  WARNUNG: Content-Type Header fehlt!`);
      console.log(`      → Sollte sein: application/json`);
    } else if (hasContentType) {
      console.log(`   ✅ Content-Type Header vorhanden`);
    }
    
    console.log();
    
    if (!errorFound) {
      console.log('✅ Keine offensichtlichen Konfigurationsfehler gefunden!\n');
      console.log('💡 Falls es trotzdem Fehler gibt:');
      console.log('   - Prüfe die neueste Execution für detaillierte Fehlermeldungen');
      console.log('   - Prüfe ob Google OAuth2 Credentials gültig sind');
      console.log('   - Prüfe ob product_id korrekt übergeben wird\n');
    } else {
      console.log('❌ KONFIGURATIONSPROBLEME GEFUNDEN!\n');
      console.log('💡 Bitte korrigieren Sie die oben genannten Fehler.\n');
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

analyzeUpdateProductAdultFlag();
