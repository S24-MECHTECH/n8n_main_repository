/**
 * RESTORE PREPARE NODES LOGIC
 * Ersetzt die Codes direkt, um spezifische Logik wiederherzustellen
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

// Spezifische Codes für jeden Node (sequenziell, mit spezifischer Logik)
const nodeCodes = {
  'Prepare Images Loop': `// ============================================================================
// PREPARE IMAGES LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// ✅ Verarbeite EIN Item für Images
return {
  json: {
    ...inputItem,
    action: 'images',
    priority: 'images',
    image_processed: true
  }
};`,

  'Prepare Text Loop': `// ============================================================================
// PREPARE TEXT LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// ✅ Verarbeite EIN Item für Text
return {
  json: {
    ...inputItem,
    action: 'text',
    priority: 'text',
    text_processed: true
  }
};`,

  'Prepare Merchant Quality Loop': `// ============================================================================
// PREPARE MERCHANT QUALITY LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// ✅ Verarbeite EIN Item für Merchant Quality
return {
  json: {
    ...inputItem,
    action: 'merchant_quality',
    priority: 'merchant_quality',
    quality_processed: true
  }
};`,

  'Prepare Multi Country Loop': `// ============================================================================
// PREPARE MULTI COUNTRY LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// ✅ Verarbeite EIN Item für Multi Country
return {
  json: {
    ...inputItem,
    action: 'multi_country',
    priority: 'multi_country',
    country_processed: true
  }
};`,

  'Prepare GTN/EAN_Loop': `// ============================================================================
// PREPARE GTIN/EAN LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// ✅ Verarbeite EIN Item für GTIN/EAN
return {
  json: {
    ...inputItem,
    action: 'gtin_ean',
    priority: 'multi_gtn_ean',
    gtin_ean_processed: true,
    // GTIN/EAN Daten (sollten bereits in inputItem sein)
    gtin: inputItem.gtin || inputItem.gtin_from_gemini || inputItem.recommended_gtin || '',
    mpn: inputItem.mpn || inputItem.mpn_from_gemini || inputItem.recommended_mpn || '',
    brand: inputItem.brand || inputItem.brand_from_gemini || inputItem.recommended_brand || ''
  }
};`
};

async function restorePrepareNodesLogic() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 RESTORE PREPARE NODES LOGIC');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    let changes = 0;
    
    Object.keys(nodeCodes).forEach(nodeName => {
      const node = workflow.nodes.find(n => n.name === nodeName);
      if (!node || !node.type.includes('code')) {
        console.log(`⚠️  ${nodeName}: Node nicht gefunden\n`);
        return;
      }
      
      const newCode = nodeCodes[nodeName];
      const currentCode = node.parameters?.jsCode || '';
      
      // Ersetze Code immer (auch wenn bereits sequenziell, um spezifische Logik zu haben)
      if (currentCode !== newCode) {
        node.parameters.jsCode = newCode;
        console.log(`✅ ${nodeName}: Code aktualisiert`);
        changes++;
      } else {
        console.log(`✅ ${nodeName}: Bereits korrekt`);
      }
      console.log();
    });
    
    if (changes === 0) {
      console.log('✅ Alle Nodes sind bereits korrekt!\n');
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
    console.log(`   ${changes} Node(s) aktualisiert`);
    console.log('\n💡 NÄCHSTE SCHRITTE:');
    console.log('   - Testen Sie den Workflow');
    console.log('   - Prüfen Sie ob Items sequenziell verarbeitet werden');
    console.log('   - Falls spezifische Felder fehlen, passen Sie die Codes an\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

restorePrepareNodesLogic();

