/**
 * FIX GTIN/EAN NODES - COMPLETE FIX
 * Korrigiert beide Nodes richtig
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
 * Fix Prepare GTN/EAN_Loop Node - KOMPLETT NEU
 */
function fixPrepareGtinEanLoopNode(node) {
  if (!node.name.includes('Prepare GTN/EAN') || !node.name.includes('Loop')) return node;
  
  let changes = 0;
  
  // Neuer korrekter Code für GTIN/EAN
  const newCode = `// ============================================================================
// PREPARE GTIN/EAN LOOP - Für Gemini GTIN/EAN Updates
// ============================================================================
const inputData = $input.first().json;
const config = $('Shop Configuration2').first().json;

// ✅ Hole Products von Analyze Products2:
const analysis = $('Analyze Products2').first().json;
const productsToFix = analysis.products_needing_fix || [];

// ✅ Hole Priority und Max Products von Gemini Decision:
const decision = $('Gemini Daily Decision').first().json.output || {};
const maxProducts = decision.products_to_process || productsToFix.length;

// ✅ Shop ID von Decision ODER Config:
const shopId = decision.shop_id || config.shop1_id;

// ✅ Shop Info aus Config:
const shopName = shopId === config.shop1_id ? config.shop1_name : config.shop2_name;
const shopUrl = shopId === config.shop1_id ? config.shop1_url : config.shop2_url;

// Filtere nur Products die GTIN/EAN Updates brauchen
const productsNeedingGtinEan = productsToFix.filter(product => {
  // Prüfe ob Gemini empfohlen hat GTIN/EAN zu aktualisieren
  return product.needs_gtin_ean === true || 
         product.missing_gtin === true || 
         product.missing_mpn === true ||
         product.missing_brand === true ||
         (product.priority && product.priority === 'multi_gtn_ean');
});

// Slice für Batch Processing
const productsSlice = productsNeedingGtinEan.slice(0, maxProducts);

// ✅ Erstelle Items mit GTIN/EAN Daten:
return productsSlice.map((product, index) => ({
  json: {
    shop_id: shopId,
    shop_name: shopName,
    shop_url: shopUrl,
    product_id: product.productId || product.id,
    offer_id: product.offerId,
    title: product.title,
    
    // GTIN/EAN Daten (von Gemini oder Product)
    gtin: product.gtin || product.gtin_from_gemini || product.recommended_gtin || '',
    mpn: product.mpn || product.mpn_from_gemini || product.recommended_mpn || '',
    brand: product.brand || product.brand_from_gemini || product.recommended_brand || '',
    
    action: 'gtin_ean',
    priority: 'multi_gtn_ean',
    index: index + 1,
    total: productsSlice.length
  }
}));`;
  
  const currentCode = node.parameters.jsCode || '';
  
  // Prüfe ob Code korrekt ist (enthält GTIN/EAN Patterns)
  const hasCorrectPatterns = 
    currentCode.includes('products_needing_fix') &&
    currentCode.includes('gtin') &&
    currentCode.includes('mpn') &&
    currentCode.includes('brand') &&
    currentCode.includes('multi_gtn_ean');
  
  if (!hasCorrectPatterns || currentCode.includes('MULTI COUNTRY')) {
    node.parameters.jsCode = newCode;
    changes++;
    console.log('   ✅ Prepare GTN/EAN_Loop Code komplett neu geschrieben');
    console.log('      (war vorher Multi Country Loop Code - jetzt GTIN/EAN)');
  }
  
  return { node, changes };
}

/**
 * Fix Update GTN/EAN Node - Method und Body Parameters
 */
function fixUpdateGtinEanNode(node) {
  if (!node.name.includes('Update GTN/EAN')) return node;
  
  let changes = 0;
  
  // 1. Korrigiere Method: POST → PATCH
  if (node.parameters.method !== 'PATCH') {
    node.parameters.method = 'PATCH';
    changes++;
    console.log('   ✅ Method korrigiert: POST → PATCH');
  }
  
  // 2. Füge Body Parameters hinzu
  if (!node.parameters.bodyParameters) {
    node.parameters.bodyParameters = {
      parameters: []
    };
  }
  
  if (!node.parameters.bodyParameters.parameters) {
    node.parameters.bodyParameters.parameters = [];
  }
  
  const bodyParams = node.parameters.bodyParameters.parameters;
  const existingParams = bodyParams.map(p => p.name);
  
  // GTIN Parameter
  if (!existingParams.includes('gtin')) {
    bodyParams.push({
      name: 'gtin',
      value: '={{ $json.gtin }}'
    });
    changes++;
    console.log('   ✅ GTIN Parameter hinzugefügt');
  } else {
    // Prüfe ob Wert korrekt ist
    const gtinParam = bodyParams.find(p => p.name === 'gtin');
    if (gtinParam && !gtinParam.value.includes('$json.gtin')) {
      gtinParam.value = '={{ $json.gtin }}';
      changes++;
      console.log('   ✅ GTIN Parameter Wert korrigiert');
    }
  }
  
  // MPN Parameter
  if (!existingParams.includes('mpn')) {
    bodyParams.push({
      name: 'mpn',
      value: '={{ $json.mpn }}'
    });
    changes++;
    console.log('   ✅ MPN Parameter hinzugefügt');
  } else {
    const mpnParam = bodyParams.find(p => p.name === 'mpn');
    if (mpnParam && !mpnParam.value.includes('$json.mpn')) {
      mpnParam.value = '={{ $json.mpn }}';
      changes++;
      console.log('   ✅ MPN Parameter Wert korrigiert');
    }
  }
  
  // Brand Parameter
  if (!existingParams.includes('brand')) {
    bodyParams.push({
      name: 'brand',
      value: '={{ $json.brand }}'
    });
    changes++;
    console.log('   ✅ Brand Parameter hinzugefügt');
  } else {
    const brandParam = bodyParams.find(p => p.name === 'brand');
    if (brandParam && !brandParam.value.includes('$json.brand')) {
      brandParam.value = '={{ $json.brand }}';
      changes++;
      console.log('   ✅ Brand Parameter Wert korrigiert');
    }
  }
  
  return { node, changes };
}

/**
 * Hauptfunktion
 */
async function fixGtinEanNodesComplete() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX GTIN/EAN NODES - COMPLETE FIX');
  console.log('='.repeat(80));
  console.log(`Workflow ID: ${WORKFLOW_ID}`);
  console.log(`n8n URL: ${N8N_URL}\n`);
  
  try {
    // Hole Workflow
    console.log('📥 Lade Workflow...');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    console.log(`✅ Workflow geladen: ${workflow.name}\n`);
    
    // Korrigiere Nodes
    console.log('🔧 Korrigiere GTIN/EAN Nodes...\n');
    
    let totalChanges = 0;
    
    workflow.nodes = workflow.nodes.map(node => {
      // Prepare GTN/EAN_Loop
      if (node.name.includes('Prepare GTN/EAN') && node.name.includes('Loop')) {
        const result = fixPrepareGtinEanLoopNode(node);
        totalChanges += result.changes;
        return result.node;
      }
      
      // Update GTN/EAN
      if (node.name.includes('Update GTN/EAN')) {
        const result = fixUpdateGtinEanNode(node);
        totalChanges += result.changes;
        return result.node;
      }
      
      return node;
    });
    
    if (totalChanges === 0) {
      console.log('✅ Alle Nodes sind bereits korrekt!\n');
      return;
    }
    
    console.log(`\n✅ ${totalChanges} Korrektur(en) durchgeführt\n`);
    
    // Aktualisiere Workflow
    console.log('💾 Aktualisiere Workflow...');
    
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: {}
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    
    console.log('✅ Workflow erfolgreich aktualisiert!\n');
    console.log('📊 ZUSAMMENFASSUNG:');
    console.log(`   Korrekturen: ${totalChanges}`);
    console.log('\n🎯 Nodes korrigiert:');
    console.log('   ✅ Prepare GTN/EAN_Loop: Code komplett neu (GTIN/EAN statt Multi Country)');
    console.log('   ✅ Update GTN/EAN: Method PATCH, Body Parameters (gtin, mpn, brand)\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fixGtinEanNodesComplete();

