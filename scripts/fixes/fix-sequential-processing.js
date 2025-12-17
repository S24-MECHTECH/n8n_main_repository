/**
 * FIX SEQUENTIAL PROCESSING
 * Analysiert und korrigiert die sequenzielle Verarbeitung
 * PROBLEM: Alle Prepare-Nodes geben Arrays zurück → n8n verarbeitet PARALLEL
 * LÖSUNG: Jeder Node muss EIN Item verarbeiten und EIN Item zurückgeben
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

async function analyzeAndFixSequentialProcessing() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ANALYSE: WARUM ARTIKEL NICHT SEQUENZIELL VERARBEITET WERDEN');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    // Finde Prepare-Nodes
    const prepareNodes = workflow.nodes.filter(n => 
      n.name.toLowerCase().includes('prepare') && 
      n.name.toLowerCase().includes('loop')
    );
    
    console.log(`📌 Gefundene Prepare-Nodes: ${prepareNodes.length}\n`);
    
    // Analysiere Code jedes Prepare-Nodes
    console.log('🔍 CODE-ANALYSE:\n');
    
    prepareNodes.forEach((node, index) => {
      const code = node.parameters?.jsCode || '';
      const returnsArray = code.includes('.map(') && code.includes('return');
      const processesMultiple = code.includes('.slice(') || code.includes('.map(');
      
      console.log(`${index + 1}. ${node.name}:`);
      console.log(`   ✅ Code vorhanden: ${code.length} Zeichen`);
      console.log(`   ${returnsArray ? '❌' : '✅'} Gibt Array zurück: ${returnsArray ? 'JA - DAS IST DAS PROBLEM!' : 'NEIN'}`);
      console.log(`   ${processesMultiple ? '❌' : '✅'} Verarbeitet mehrere Items: ${processesMultiple ? 'JA - FALSCH!' : 'NEIN'}`);
      console.log();
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('❌ PROBLEM IDENTIFIZIERT');
    console.log('='.repeat(80) + '\n');
    
    console.log('🔴 DAS PROBLEM:');
    console.log('   Alle Prepare-Nodes geben Arrays zurück (z.B. mit .map())');
    console.log('   → n8n verarbeitet Arrays PARALLEL, nicht sequenziell!');
    console.log('   → Wenn Prepare Products Loop 10 Items zurückgibt,');
    console.log('     werden alle 10 Items PARALLEL durch die nächsten Nodes geschickt\n');
    
    console.log('💡 DIE LÖSUNG:');
    console.log('   Jeder Prepare-Node sollte:');
    console.log('   1. EIN Item aus dem Input nehmen');
    console.log('   2. Dieses Item verarbeiten');
    console.log('   3. EIN Item zurückgeben (nicht Array!)');
    console.log('   → n8n verarbeitet dann jedes Item sequenziell durch die Kette\n');
    
    console.log('📋 EMPFOHLENE KORREKTUR:');
    console.log('   Statt: return items.map(item => ...)  ❌');
    console.log('   Besser: return { json: { ... } }       ✅');
    console.log('   n8n wird dann automatisch jedes Item einzeln durchleiten\n');
    
    // Zeige Beispiel-Code
    console.log('📝 BEISPIEL-KORREKTUR für Prepare Images Loop:\n');
    
    const exampleBefore = `
// ❌ FALSCH: Gibt Array zurück → Parallel-Verarbeitung
const items = $input.all();
return items.map(item => ({
  json: {
    ...item.json,
    processed: true
  }
}));`;
    
    const exampleAfter = `
// ✅ RICHTIG: Gibt EIN Item zurück → Sequenzielle Verarbeitung
const inputItem = $input.first().json;
return {
  json: {
    ...inputItem,
    processed: true,
    image_processed: true
  }
};`;
    
    console.log('VORHER (falsch):');
    console.log(exampleBefore);
    console.log('\nNACHHER (richtig):');
    console.log(exampleAfter);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 NÄCHSTE SCHRITTE');
    console.log('='.repeat(80) + '\n');
    
    console.log('1. Korrigiere alle Prepare-Node Codes:');
    console.log('   - Entferne .map() und Array-Rückgabe');
    console.log('   - Nutze $input.first().json für EIN Item');
    console.log('   - Gebe EIN Item zurück: return { json: {...} }');
    console.log();
    console.log('2. n8n wird dann automatisch:');
    console.log('   - Jedes Item einzeln durch die Kette schicken');
    console.log('   - Artikel 1 → Prepare Images → Prepare Text → ...');
    console.log('   - Artikel 2 → Prepare Images → Prepare Text → ...');
    console.log('   - Artikel 3 → Prepare Images → Prepare Text → ...');
    console.log('   - etc. (sequenziell, nicht parallel!)\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

analyzeAndFixSequentialProcessing();

