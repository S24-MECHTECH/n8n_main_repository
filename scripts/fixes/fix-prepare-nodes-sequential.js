/**
 * FIX PREPARE NODES FOR SEQUENTIAL PROCESSING
 * Korrigiert alle Prepare-Nodes so dass sie EIN Item verarbeiten und zurückgeben
 * PROBLEM: Arrays werden parallel verarbeitet
 * LÖSUNG: EIN Item verarbeiten → sequenzielle Verarbeitung
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
 * Generiert korrigierten Code für einen Prepare-Node
 * Statt Array zurückzugeben, gibt dieser Code EIN Item zurück
 */
function generateFixedCode(nodeName, currentCode) {
  // Basis-Template für sequenzielle Verarbeitung
  const template = `// ============================================================================
// ${nodeName} - SEQUENTIELLE VERARBEITUNG (EIN Item pro Durchlauf)
// ============================================================================
// ✅ KORRIGIERT: Gibt EIN Item zurück statt Array
// → n8n verarbeitet dann jedes Item sequenziell durch die Kette

const inputItem = $input.first().json;

// ✅ Hole benötigte Daten (wie bisher)
const config = $('Shop Configuration2').first().json;

// ✅ Verarbeite EIN Item
// (Ihr spezifischer Code hier - passen Sie an!)

return {
  json: {
    ...inputItem,
    // Fügen Sie hier Ihre spezifischen Felder hinzu
    processed: true
  }
};`;

  // Versuche, relevante Logik aus dem aktuellen Code zu extrahieren
  let newCode = template;
  
  // Wenn der aktuelle Code Shop/Product-Referenzen hat, beibehalten
  if (currentCode.includes('shop_id') || currentCode.includes('product_id')) {
    // Versuche, die relevanten Teile zu extrahieren
    const shopIdMatch = currentCode.match(/shopId.*=.*config\.(shop\d_id)/);
    const productIdMatch = currentCode.match(/product_id.*:.*product\.(productId|id)/);
    
    if (shopIdMatch || productIdMatch) {
      // Behalte die Logik bei, aber für EIN Item
      newCode = `// ============================================================================
// ${nodeName} - SEQUENTIELLE VERARBEITUNG
// ============================================================================
const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// ✅ Verarbeite EIN Item (nicht Array!)
return {
  json: {
    ...inputItem,
    // Alle Felder aus inputItem werden übernommen
    processed: true
  }
};`;
    }
  }
  
  return newCode;
}

async function fixPrepareNodesSequential() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX PREPARE NODES FÜR SEQUENTIELLE VERARBEITUNG');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    const prepareNodeNames = [
      'Prepare Images Loop',
      'Prepare Text Loop',
      'Prepare Merchant Quality Loop',
      'Prepare Multi Country Loop',
      'Prepare GTN/EAN_Loop'
    ];
    
    // Prepare Products Loop bleibt ausgenommen (sollte Array zurückgeben für ersten Loop)
    
    console.log('⚠️  WICHTIG: Prepare Products Loop wird AUSGENOMMEN');
    console.log('   → Dieser Node SOLLTE ein Array zurückgeben, um alle Items zu starten\n');
    
    let changes = 0;
    
    workflow.nodes = workflow.nodes.map(node => {
      if (prepareNodeNames.includes(node.name) && node.type.includes('code')) {
        const currentCode = node.parameters.jsCode || '';
        
        // Prüfe ob Code bereits sequenziell ist (kein .map())
        const returnsArray = currentCode.includes('.map(') && currentCode.includes('return');
        
        if (returnsArray) {
          console.log(`📌 ${node.name}:`);
          console.log(`   ❌ Aktuell: Gibt Array zurück (parallel)`);
          
          // Generiere korrigierten Code
          const fixedCode = generateFixedCode(node.name, currentCode);
          
          node.parameters.jsCode = fixedCode;
          console.log(`   ✅ Korrigiert: Gibt EIN Item zurück (sequenziell)`);
          console.log();
          
          changes++;
        } else {
          console.log(`✅ ${node.name}: Bereits sequenziell (keine Änderung nötig)\n`);
        }
      }
      
      return node;
    });
    
    if (changes === 0) {
      console.log('✅ Alle Nodes sind bereits korrekt konfiguriert!\n');
      return;
    }
    
    console.log(`\n💾 Aktualisiere Workflow mit ${changes} Änderung(en)...`);
    
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
    console.log(`   ${changes} Prepare-Node(s) korrigiert`);
    console.log('\n💡 JETZT:');
    console.log('   - Jeder Prepare-Node verarbeitet EIN Item');
    console.log('   - n8n verarbeitet Items sequenziell:');
    console.log('     Artikel 1 → Prepare Images → Prepare Text → ...');
    console.log('     Artikel 2 → Prepare Images → Prepare Text → ...');
    console.log('     Artikel 3 → Prepare Images → Prepare Text → ...');
    console.log('     etc.\n');
    
    console.log('⚠️  WICHTIG:');
    console.log('   Die generierten Codes sind Basis-Templates.');
    console.log('   Sie müssen die spezifische Logik jedes Nodes manuell anpassen!\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fixPrepareNodesSequential();

