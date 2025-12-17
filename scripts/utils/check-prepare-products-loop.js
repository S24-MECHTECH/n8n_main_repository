/**
 * CHECK PREPARE PRODUCTS LOOP
 * Prüft den Code von Prepare Products Loop
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

async function checkPrepareProductsLoop() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECK PREPARE PRODUCTS LOOP');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    const node = workflow.nodes.find(n => n.name === 'Prepare Products Loop');
    
    if (!node) {
      console.log('❌ Node "Prepare Products Loop" nicht gefunden!\n');
      return;
    }
    
    console.log(`📌 Node: ${node.name}`);
    console.log(`   Type: ${node.type}\n`);
    
    const code = node.parameters?.jsCode || '';
    
    console.log('📄 CODE:\n');
    console.log(code);
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Analyse
    console.log('🔍 ANALYSE:\n');
    
    const usesMap = code.includes('.map(') || code.includes('items.map');
    const usesFirst = code.includes('$input.first()');
    const returnsArray = code.includes('return [') || code.includes('return items') || code.includes('return [items');
    const returnsSingle = code.includes('return {') && code.includes('json:');
    
    console.log(`   Verwendet .map(): ${usesMap ? '❌ JA (PARALLEL!)' : '✅ NEIN'}`);
    console.log(`   Verwendet $input.first(): ${usesFirst ? '✅ JA (SEQUENTIELL)' : '❌ NEIN'}`);
    console.log(`   Gibt Array zurück: ${returnsArray ? '❌ JA (PARALLEL!)' : '✅ NEIN'}`);
    console.log(`   Gibt einzelnes Item zurück: ${returnsSingle ? '✅ JA (SEQUENTIELL)' : '❌ NEIN'}\n`);
    
    if (usesMap || returnsArray) {
      console.log('❌ PROBLEM ERKANNT:');
      console.log('   Der Code gibt ein Array zurück → n8n verarbeitet parallel!');
      console.log('   → 90 Artikel werden alle parallel verarbeitet');
      console.log('   → Der Workflow wartet, bis ALLE 90 fertig sind');
      console.log('   → Dann geht es erst zum nächsten Node\n');
      
      console.log('💡 LÖSUNG:');
      console.log('   Code muss geändert werden, um EIN Item zurückzugeben');
      console.log('   → Verwende $input.first().json');
      console.log('   → Gib return { json: {...} } zurück (KEIN Array!)\n');
    } else if (usesFirst && returnsSingle) {
      console.log('✅ Code sieht korrekt aus (sequenziell)\n');
      console.log('⚠️  Falls es trotzdem nicht funktioniert:');
      console.log('   - Prüfe die Connections zwischen den Nodes');
      console.log('   - Prüfe ob "Prepare Images Loop" richtig verbunden ist\n');
    }
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

checkPrepareProductsLoop();
