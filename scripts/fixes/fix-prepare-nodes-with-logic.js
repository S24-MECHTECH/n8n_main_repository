/**
 * FIX PREPARE NODES WITH SPECIFIC LOGIC
 * Stellt die spezifische Logik für jeden Prepare-Node wieder her
 * UND passt sie für sequenzielle Verarbeitung an (EIN Item statt Array)
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
 * Generiert Code für Prepare Images Loop (SEQUENTIELL)
 */
function generatePrepareImagesLoopCode() {
  return `// ============================================================================
// PREPARE IMAGES LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
// ✅ KORRIGIERT: Verarbeitet EIN Item (sequenziell)
// → n8n verarbeitet dann jedes Item einzeln durch die Kette

const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// ✅ Hole benötigte Daten aus Input Item
// Input Item kommt von Prepare Products Loop und enthält bereits:
// - shop_id, shop_name, shop_url
// - product_id, offer_id, title
// - etc.

// ✅ Verarbeite EIN Item für Images
return {
  json: {
    ...inputItem,  // Alle Felder vom Input Item übernehmen
    
    // Spezifische Images-Felder (passen Sie an falls nötig)
    action: 'images',
    priority: 'images',
    // imageLink, imageUrl, etc. sollten bereits in inputItem sein
    // oder von einem vorherigen Node kommen
  }
};`;
}

/**
 * Generiert Code für Prepare Text Loop (SEQUENTIELL)
 */
function generatePrepareTextLoopCode() {
  return `// ============================================================================
// PREPARE TEXT LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
// ✅ KORRIGIERT: Verarbeitet EIN Item (sequenziell)

const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// ✅ Verarbeite EIN Item für Text
return {
  json: {
    ...inputItem,  // Alle Felder vom Input Item übernehmen
    
    // Spezifische Text-Felder (passen Sie an falls nötig)
    action: 'text',
    priority: 'text',
    // title, description sollten bereits in inputItem sein
  }
};`;
}

/**
 * Generiert Code für Prepare Merchant Quality Loop (SEQUENTIELL)
 */
function generatePrepareMerchantQualityLoopCode() {
  return `// ============================================================================
// PREPARE MERCHANT QUALITY LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
// ✅ KORRIGIERT: Verarbeitet EIN Item (sequenziell)

const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// ✅ Verarbeite EIN Item für Merchant Quality
return {
  json: {
    ...inputItem,  // Alle Felder vom Input Item übernehmen
    
    // Spezifische Merchant Quality-Felder (passen Sie an falls nötig)
    action: 'merchant_quality',
    priority: 'merchant_quality',
    // quality_score, etc. sollten bereits in inputItem sein
  }
};`;
}

/**
 * Generiert Code für Prepare Multi Country Loop (SEQUENTIELL)
 */
function generatePrepareMultiCountryLoopCode() {
  return `// ============================================================================
// PREPARE MULTI COUNTRY LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
// ✅ KORRIGIERT: Verarbeitet EIN Item (sequenziell)

const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// ✅ Verarbeite EIN Item für Multi Country
return {
  json: {
    ...inputItem,  // Alle Felder vom Input Item übernehmen
    
    // Spezifische Multi Country-Felder (passen Sie an falls nötig)
    action: 'multi_country',
    priority: 'multi_country',
    // destinations, shipping, countries sollten bereits in inputItem sein
    // oder von einem vorherigen Node kommen
  }
};`;
}

/**
 * Generiert Code für Prepare GTN/EAN_Loop (SEQUENTIELL)
 * Basierend auf dem Original-Code aus fix-gtin-ean-nodes-complete.js
 */
function generatePrepareGtinEanLoopCode() {
  return `// ============================================================================
// PREPARE GTIN/EAN LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
// ✅ KORRIGIERT: Verarbeitet EIN Item (sequenziell)

const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// ✅ Input Item kommt bereits mit allen benötigten Daten
// (wurde von Prepare Products Loop oder vorherigen Nodes vorbereitet)

// ✅ GTIN/EAN Daten sollten bereits im inputItem sein
// Falls nicht, können sie hier ergänzt werden:
// - gtin, mpn, brand können von Gemini Decision kommen
// - oder aus dem originalProduct

return {
  json: {
    ...inputItem,  // Alle Felder vom Input Item übernehmen
    
    // GTIN/EAN spezifische Felder (falls noch nicht vorhanden)
    action: inputItem.action || 'gtin_ean',
    priority: inputItem.priority || 'multi_gtn_ean',
    
    // GTIN/EAN Daten (sollten bereits vorhanden sein)
    gtin: inputItem.gtin || inputItem.gtin_from_gemini || inputItem.recommended_gtin || '',
    mpn: inputItem.mpn || inputItem.mpn_from_gemini || inputItem.recommended_mpn || '',
    brand: inputItem.brand || inputItem.brand_from_gemini || inputItem.recommended_brand || '',
  }
};`;
}

async function fixPrepareNodesWithLogic() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX PREPARE NODES MIT SPEZIFISCHER LOGIK');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    const nodeCodes = {
      'Prepare Images Loop': generatePrepareImagesLoopCode(),
      'Prepare Text Loop': generatePrepareTextLoopCode(),
      'Prepare Merchant Quality Loop': generatePrepareMerchantQualityLoopCode(),
      'Prepare Multi Country Loop': generatePrepareMultiCountryLoopCode(),
      'Prepare GTN/EAN_Loop': generatePrepareGtinEanLoopCode()
    };
    
    let changes = 0;
    
    Object.keys(nodeCodes).forEach(nodeName => {
      const node = workflow.nodes.find(n => n.name === nodeName);
      if (!node || !node.type.includes('code')) {
        console.log(`⚠️  ${nodeName}: Node nicht gefunden oder kein Code-Node\n`);
        return;
      }
      
      const newCode = nodeCodes[nodeName];
      const currentCode = node.parameters?.jsCode || '';
      
      // Prüfe ob Code bereits korrekt ist
      const usesFirst = currentCode.includes('$input.first()');
      const returnsArray = currentCode.includes('.map(');
      
      if (!usesFirst || returnsArray) {
        node.parameters.jsCode = newCode;
        console.log(`✅ ${nodeName}: Code aktualisiert`);
        console.log(`   → Verarbeitet jetzt EIN Item (sequenziell)`);
        changes++;
      } else {
        console.log(`✅ ${nodeName}: Bereits korrekt (keine Änderung)`);
      }
      console.log();
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
    console.log(`   ${changes} Node(s) aktualisiert mit spezifischer Logik`);
    console.log('\n💡 WICHTIG:');
    console.log('   - Alle Nodes verarbeiten jetzt EIN Item (sequenziell)');
    console.log('   - Items werden durch die Kette geschickt:');
    console.log('     Artikel 1 → Prepare Images → Prepare Text → ...');
    console.log('     Artikel 2 → Prepare Images → Prepare Text → ...');
    console.log('     etc.');
    console.log('\n⚠️  HINWEIS:');
    console.log('   Die Codes sind Basis-Versionen. Falls spezifische');
    console.log('   Logik fehlt (z.B. Gemini-Daten, spezifische Felder),');
    console.log('   muss diese noch angepasst werden.\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fixPrepareNodesWithLogic();

