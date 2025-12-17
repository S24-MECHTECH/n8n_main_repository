/**
 * FIX ALL NODES - FORCE UPDATE
 * Setzt alles zwangsweise auf korrekte Werte
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

async function fixAllNodesForce() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX ALL NODES - FORCE UPDATE');
  console.log('='.repeat(80));
  console.log(`Workflow ID: ${WORKFLOW_ID}\n`);
  
  try {
    // Hole Workflow
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    console.log(`✅ Workflow geladen: ${workflow.name}\n`);
    console.log('🔧 Korrigiere Nodes (FORCE)...\n');
    
    let totalChanges = 0;
    
    workflow.nodes = workflow.nodes.map(node => {
      // 1. Update GTN/EAN - FORCE
      if (node.name.includes('Update GTN/EAN')) {
        console.log(`\n📌 ${node.name}:`);
        
        // Method FORCE
        node.parameters.method = 'PATCH';
        console.log('   ✅ Method: PATCH (FORCE)');
        totalChanges++;
        
        // Body Parameters FORCE - NUR gtin, mpn, brand
        node.parameters.bodyParameters = {
          parameters: [
            {
              name: 'gtin',
              value: '={{ $json.gtin }}'
            },
            {
              name: 'mpn',
              value: '={{ $json.mpn }}'
            },
            {
              name: 'brand',
              value: '={{ $json.brand }}'
            }
          ]
        };
        console.log('   ✅ Body Parameters: gtin, mpn, brand (FORCE)');
        totalChanges++;
        
        // ENTFERNE jsonParameters/jsonBody
        node.parameters.jsonParameters = false;
        node.parameters.jsonBody = '';
        console.log('   ✅ jsonParameters/jsonBody entfernt');
        totalChanges++;
        
        return node;
      }
      
      // 2. Prepare GTN/EAN_Loop - FORCE Code
      if (node.name.includes('Prepare GTN/EAN') && node.name.includes('Loop')) {
        console.log(`\n📌 ${node.name}:`);
        
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
        
        node.parameters.jsCode = newCode;
        console.log('   ✅ Code komplett neu gesetzt (FORCE)');
        totalChanges++;
        
        return node;
      }
      
      // 3. Get Workflow Status REAL - FORCE
      if (node.name.includes('Get Workflow Status REAL')) {
        console.log(`\n📌 ${node.name}:`);
        
        // Method FORCE
        node.parameters.method = 'GET';
        console.log('   ✅ Method: GET (FORCE)');
        totalChanges++;
        
        // URL FORCE - Korrekte Supabase Query-Syntax
        const baseUrl = 'https://mxswxdnnjhhukovixzvb.supabase.co';
        node.parameters.url = `=${baseUrl}/rest/v1/workflow_status?select=*&workflow_id=eq.{{ $json.workflow_id || $json.id || '${WORKFLOW_ID}' }}&order=created_at.desc&limit={{ $json.limit || 100 }}`;
        console.log('   ✅ URL korrigiert (FORCE)');
        totalChanges++;
        
        // Body entfernen
        node.parameters.jsonParameters = false;
        node.parameters.jsonBody = '';
        node.parameters.bodyParameters = undefined;
        console.log('   ✅ Body entfernt');
        totalChanges++;
        
        // Headers FORCE - Nur Prefer Header
        if (!node.parameters.options) {
          node.parameters.options = {};
        }
        if (!node.parameters.options.headers) {
          node.parameters.options.headers = {};
        }
        node.parameters.options.headers.values = [
          {
            name: 'Prefer',
            value: 'return=representation'
          }
        ];
        console.log('   ✅ Headers: Nur Prefer (FORCE)');
        totalChanges++;
        
        // sendHeaders
        node.parameters.sendHeaders = true;
        
        // Authentication FORCE
        node.parameters.authentication = 'predefinedCredentialType';
        node.parameters.nodeCredentialType = 'supabaseApi';
        console.log('   ✅ Authentication: Supabase API (FORCE)');
        totalChanges++;
        
        // Response Options
        if (!node.parameters.options.response) {
          node.parameters.options.response = {};
        }
        if (!node.parameters.options.response.response) {
          node.parameters.options.response.response = {};
        }
        node.parameters.options.response.response.responseFormat = 'json';
        node.parameters.options.response.response.fullResponse = false;
        node.parameters.options.response.response.neverError = false;
        console.log('   ✅ Response Options: neverError=false (FORCE)');
        totalChanges++;
        
        return node;
      }
      
      return node;
    });
    
    console.log(`\n✅ ${totalChanges} Änderungen durchgeführt\n`);
    
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
    console.log('📊 FINALE KONFIGURATION:');
    console.log('\n1. Update GTN/EAN:');
    console.log('   - Method: PATCH');
    console.log('   - Body Parameters: gtin, mpn, brand (NUR diese 3!)');
    console.log('\n2. Prepare GTN/EAN_Loop:');
    console.log('   - Code: GTIN/EAN spezifisch (products_needing_fix, gtin, mpn, brand)');
    console.log('\n3. Get Workflow Status REAL:');
    console.log('   - Method: GET');
    console.log('   - URL: /rest/v1/workflow_status?select=*&workflow_id=eq.{value}...');
    console.log('   - Authentication: Supabase API Credential');
    console.log('   - Headers: Prefer (apikey/Authorization über Credential)\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fixAllNodesForce();

