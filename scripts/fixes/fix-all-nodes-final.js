/**
 * FIX ALL NODES - FINAL FIX
 * Behebt alle drei Probleme:
 * 1. Update GTN/EAN - Falscher Body (destinations/shipping entfernen)
 * 2. Prepare GTN/EAN_Loop - Code wirklich aktualisieren
 * 3. Get Workflow Status REAL - URL korrigieren, Headers richtig setzen
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
 * Fix Update GTN/EAN - ENTFERNE destinations/shipping Body
 */
function fixUpdateGtinEanNode(node) {
  if (!node.name.includes('Update GTN/EAN')) return node;
  
  let changes = 0;
  
  // 1. Method auf PATCH
  if (node.parameters.method !== 'PATCH') {
    node.parameters.method = 'PATCH';
    changes++;
    console.log('   ✅ Method: PATCH');
  }
  
  // 2. Body Parameters - ENTFERNE alles was nicht gtin/mpn/brand ist
  if (!node.parameters.bodyParameters) {
    node.parameters.bodyParameters = {
      parameters: []
    };
  }
  
  if (!node.parameters.bodyParameters.parameters) {
    node.parameters.bodyParameters.parameters = [];
  }
  
  // ENTFERNE alle falschen Parameter (destinations, shipping, etc.)
  const bodyParams = node.parameters.bodyParameters.parameters;
  const allowedParams = ['gtin', 'mpn', 'brand'];
  const paramsToKeep = bodyParams.filter(p => allowedParams.includes(p.name));
  
  if (bodyParams.length !== paramsToKeep.length) {
    node.parameters.bodyParameters.parameters = paramsToKeep;
    changes++;
    console.log(`   ✅ Entfernt ${bodyParams.length - paramsToKeep.length} falsche Body Parameter`);
  }
  
  // Stelle sicher dass die 3 korrekten Parameter vorhanden sind
  const existingParams = paramsToKeep.map(p => p.name);
  
  if (!existingParams.includes('gtin')) {
    node.parameters.bodyParameters.parameters.push({
      name: 'gtin',
      value: '={{ $json.gtin }}'
    });
    changes++;
    console.log('   ✅ GTIN Parameter hinzugefügt');
  } else {
    const gtinParam = node.parameters.bodyParameters.parameters.find(p => p.name === 'gtin');
    if (gtinParam && gtinParam.value !== '={{ $json.gtin }}') {
      gtinParam.value = '={{ $json.gtin }}';
      changes++;
      console.log('   ✅ GTIN Parameter Wert korrigiert');
    }
  }
  
  if (!existingParams.includes('mpn')) {
    node.parameters.bodyParameters.parameters.push({
      name: 'mpn',
      value: '={{ $json.mpn }}'
    });
    changes++;
    console.log('   ✅ MPN Parameter hinzugefügt');
  } else {
    const mpnParam = node.parameters.bodyParameters.parameters.find(p => p.name === 'mpn');
    if (mpnParam && mpnParam.value !== '={{ $json.mpn }}') {
      mpnParam.value = '={{ $json.mpn }}';
      changes++;
      console.log('   ✅ MPN Parameter Wert korrigiert');
    }
  }
  
  if (!existingParams.includes('brand')) {
    node.parameters.bodyParameters.parameters.push({
      name: 'brand',
      value: '={{ $json.brand }}'
    });
    changes++;
    console.log('   ✅ Brand Parameter hinzugefügt');
  } else {
    const brandParam = node.parameters.bodyParameters.parameters.find(p => p.name === 'brand');
    if (brandParam && brandParam.value !== '={{ $json.brand }}') {
      brandParam.value = '={{ $json.brand }}';
      changes++;
      console.log('   ✅ Brand Parameter Wert korrigiert');
    }
  }
  
  // 3. ENTFERNE jsonParameters/jsonBody (falls vorhanden)
  if (node.parameters.jsonParameters) {
    node.parameters.jsonParameters = false;
    changes++;
    console.log('   ✅ jsonParameters entfernt');
  }
  
  if (node.parameters.jsonBody) {
    node.parameters.jsonBody = '';
    changes++;
    console.log('   ✅ jsonBody entfernt');
  }
  
  return { node, changes };
}

/**
 * Fix Prepare GTN/EAN_Loop - Code ZWINGEND aktualisieren
 */
function fixPrepareGtinEanLoopNode(node) {
  if (!node.name.includes('Prepare GTN/EAN') || !node.name.includes('Loop')) return node;
  
  let changes = 0;
  
  // Neuer korrekter Code - IMMER setzen
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
  
  // Setze Code IMMER (auch wenn ähnlich)
  const currentCode = node.parameters.jsCode || '';
  if (currentCode !== newCode) {
    node.parameters.jsCode = newCode;
    changes++;
    console.log('   ✅ Prepare GTN/EAN_Loop Code aktualisiert');
  }
  
  return { node, changes };
}

/**
 * Fix Get Workflow Status REAL - URL und Headers richtig
 */
function fixWorkflowStatusRealNode(node) {
  if (!node.name.includes('Get Workflow Status REAL')) return node;
  
  let changes = 0;
  
  // 1. Method GET
  if (!node.parameters.method || node.parameters.method !== 'GET') {
    node.parameters.method = 'GET';
    changes++;
    console.log('   ✅ Method: GET');
  }
  
  // 2. URL korrigieren - Supabase REST API mit korrekter Query-Syntax
  // Problem: workflow_id=eq. war leer - muss richtige Syntax sein
  const baseUrl = 'https://mxswxdnnjhhukovixzvb.supabase.co';
  
  // Korrekte Supabase Query: workflow_id=eq.{value}
  // Aber wir müssen die Expression richtig formatieren
  const newUrl = `=${baseUrl}/rest/v1/workflow_status?select=*&workflow_id=eq.{{ $json.workflow_id || $json.id || '${WORKFLOW_ID}' }}&order=created_at.desc&limit={{ $json.limit || 100 }}`;
  
  if (!node.parameters.url || !node.parameters.url.includes('/rest/v1/workflow_status')) {
    node.parameters.url = newUrl;
    changes++;
    console.log('   ✅ URL korrigiert: Supabase REST API');
  }
  
  // 3. Entferne JSON Body
  if (node.parameters.jsonParameters) {
    node.parameters.jsonParameters = false;
    node.parameters.jsonBody = '';
    changes++;
    console.log('   ✅ JSON Body entfernt');
  }
  
  // 4. Headers - WICHTIG: Wenn Supabase Credential vorhanden, nutze Authentication statt manuelle Headers
  // Aber füge trotzdem Prefer Header hinzu (wird zusätzlich benötigt)
  if (!node.parameters.options) {
    node.parameters.options = {};
  }
  if (!node.parameters.options.headers) {
    node.parameters.options.headers = {};
  }
  if (!node.parameters.options.headers.values) {
    node.parameters.options.headers.values = [];
  }
  
  const headers = node.parameters.options.headers.values;
  const existingHeaderNames = headers.map(h => h.name);
  
  // Prefer Header (für Supabase)
  if (!existingHeaderNames.includes('Prefer')) {
    headers.push({
      name: 'Prefer',
      value: 'return=representation'
    });
    changes++;
    console.log('   ✅ Header hinzugefügt: Prefer');
  }
  
  // ENTFERNE manuelle apikey/Authorization Header (wenn Supabase Credential verwendet wird)
  // Das wird automatisch über Authentication gehandhabt
  const apikeyIndex = headers.findIndex(h => h.name === 'apikey');
  if (apikeyIndex !== -1) {
    headers.splice(apikeyIndex, 1);
    changes++;
    console.log('   ✅ apikey Header entfernt (wird über Authentication gehandhabt)');
  }
  
  const authIndex = headers.findIndex(h => h.name === 'Authorization');
  if (authIndex !== -1) {
    headers.splice(authIndex, 1);
    changes++;
    console.log('   ✅ Authorization Header entfernt (wird über Authentication gehandhabt)');
  }
  
  // 5. Setze sendHeaders
  node.parameters.sendHeaders = true;
  
  // 6. Authentication - Nutze Supabase Credential
  if (!node.parameters.authentication || node.parameters.authentication !== 'predefinedCredentialType') {
    node.parameters.authentication = 'predefinedCredentialType';
    node.parameters.nodeCredentialType = 'supabaseApi';
    changes++;
    console.log('   ✅ Authentication: Supabase API Credential');
  }
  
  // 7. Response Options - KEIN neverError
  if (!node.parameters.options.response) {
    node.parameters.options.response = {};
  }
  if (!node.parameters.options.response.response) {
    node.parameters.options.response.response = {};
  }
  
  if (node.parameters.options.response.response.neverError === true) {
    node.parameters.options.response.response.neverError = false;
    changes++;
    console.log('   ✅ neverError: false (Fehler werden angezeigt)');
  }
  
  node.parameters.options.response.response.responseFormat = 'json';
  node.parameters.options.response.response.fullResponse = false;
  
  return { node, changes };
}

/**
 * Hauptfunktion
 */
async function fixAllNodesFinal() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX ALL NODES - FINAL FIX');
  console.log('='.repeat(80));
  console.log(`Workflow ID: ${WORKFLOW_ID}`);
  console.log(`n8n URL: ${N8N_URL}\n`);
  
  try {
    // Hole Workflow
    console.log('📥 Lade Workflow...');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    console.log(`✅ Workflow geladen: ${workflow.name}\n`);
    
    // Korrigiere Nodes
    console.log('🔧 Korrigiere Nodes...\n');
    
    let totalChanges = 0;
    
    workflow.nodes = workflow.nodes.map(node => {
      // 1. Update GTN/EAN
      if (node.name.includes('Update GTN/EAN')) {
        const result = fixUpdateGtinEanNode(node);
        totalChanges += result.changes;
        if (result.changes > 0) {
          console.log(`\n📌 ${node.name}:`);
        }
        return result.node;
      }
      
      // 2. Prepare GTN/EAN_Loop
      if (node.name.includes('Prepare GTN/EAN') && node.name.includes('Loop')) {
        const result = fixPrepareGtinEanLoopNode(node);
        totalChanges += result.changes;
        if (result.changes > 0) {
          console.log(`\n📌 ${node.name}:`);
        }
        return result.node;
      }
      
      // 3. Get Workflow Status REAL
      if (node.name.includes('Get Workflow Status REAL')) {
        const result = fixWorkflowStatusRealNode(node);
        totalChanges += result.changes;
        if (result.changes > 0) {
          console.log(`\n📌 ${node.name}:`);
        }
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
    console.log('\n🎯 Korrigierte Nodes:');
    console.log('   1. Update GTN/EAN:');
    console.log('      - Method: PATCH');
    console.log('      - Body: NUR gtin, mpn, brand (destinations/shipping entfernt)');
    console.log('   2. Prepare GTN/EAN_Loop:');
    console.log('      - Code komplett neu (GTIN/EAN spezifisch)');
    console.log('   3. Get Workflow Status REAL:');
    console.log('      - Method: GET');
    console.log('      - URL: Korrigiert (workflow_id=eq.{value})');
    console.log('      - Authentication: Supabase API Credential');
    console.log('      - Header: Nur Prefer (apikey/Authorization über Credential)\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fixAllNodesFinal();

