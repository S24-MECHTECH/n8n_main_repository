/**
 * FIX MERCHANT WORKFLOW - ADULT FLAGS für Google-Genehmigung
 * Korrigiert kritische Parameterübergaben im ***MECHTECH_MERCHANT_CENTER_ADMIN Workflow
 */

const https = require('https');
const http = require('http');

// Konfiguration
const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const N8N_API_KEY = process.env.N8N_API_KEY || process.argv[2];
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5'; // ***MECHTECH_MERCHANT_CENTER_ADMIN

if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY fehlt!');
  console.error('Nutzung: node fix-merchant-workflow-adult-flags.js <N8N_API_KEY>');
  process.exit(1);
}

/**
 * n8n API Request
 */
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
 * Korrigiere Shop Configuration2 - Füge shop URLs hinzu
 */
function fixShopConfiguration2(node) {
  if (node.name !== 'Shop Configuration2') return node;
  
  const assignments = node.parameters.assignments.assignments || [];
  
  // Prüfe ob shop1_url bereits existiert
  const hasShop1Url = assignments.some(a => a.name === 'shop1_url');
  const hasShop2Url = assignments.some(a => a.name === 'shop2_url');
  const hasSheetId = assignments.some(a => a.name === 'sheet_id');
  
  let changes = 0;
  
  // Füge shop1_url hinzu falls fehlt
  if (!hasShop1Url) {
    assignments.push({
      id: `shop1_url_${Date.now()}`,
      name: 'shop1_url',
      value: 'www.siliconedolls24.com',
      type: 'string'
    });
    changes++;
    console.log('   ✅ shop1_url hinzugefügt');
  }
  
  // Füge shop2_url hinzu falls fehlt
  if (!hasShop2Url) {
    assignments.push({
      id: `shop2_url_${Date.now()}`,
      name: 'shop2_url',
      value: 'www.dreamdoll.de',
      type: 'string'
    });
    changes++;
    console.log('   ✅ shop2_url hinzugefügt');
  }
  
  // Füge sheet_id Alias hinzu falls fehlt
  if (!hasSheetId) {
    const googleSheetId = assignments.find(a => a.name === 'google_sheet_id');
    if (googleSheetId) {
      assignments.push({
        id: `sheet_id_${Date.now()}`,
        name: 'sheet_id',
        value: googleSheetId.value,
        type: 'string'
      });
      changes++;
      console.log('   ✅ sheet_id Alias hinzugefügt');
    }
  }
  
  return { node, changes };
}

/**
 * Korrigiere Prepare Products Loop - Hole Products von Analyze Products2
 */
function fixPrepareProductsLoop(node) {
  if (node.name !== 'Prepare Products Loop') return node;
  
  const newCode = `// ============================================================================
// FIX: PREPARE PRODUCTS LOOP - KORRIGIERT FÜR GOOGLE-GENEHMIGUNG
// ============================================================================
const inputData = $input.first().json;
const config = $('Shop Configuration2').first().json;

// ✅ RICHTIG: Hole Products von Analyze Products2:
const analysis = $('Analyze Products2').first().json;
const productsToFix = analysis.products_needing_fix || [];

// ✅ RICHTIG: Hole Priority und Max Products von Gemini Decision:
const decision = $('Gemini Daily Decision').first().json.output || {};
const maxProducts = decision.products_to_process || productsToFix.length;

// ✅ Shop ID von Decision ODER Config:
const shopId = decision.shop_id || config.shop1_id;

// ✅ Shop Info aus Config (JETZT mit URLs):
const shopName = shopId === config.shop1_id ? config.shop1_name : config.shop2_name;
const shopUrl = shopId === config.shop1_id ? config.shop1_url : config.shop2_url;

// Slice für Batch Processing
const productsSlice = productsToFix.slice(0, maxProducts);

// ✅ Erstelle Items mit KORREKTEN Feldnamen (product_id, nicht product.id):
return productsSlice.map((product, index) => ({
  json: {
    shop_id: shopId,
    shop_name: shopName,
    shop_url: shopUrl,
    product_id: product.productId || product.id,  // ✅ Konsistent mit Update Nodes
    offer_id: product.offerId,
    title: product.title,
    action: 'adult_flags',
    priority: 'adult_flags',
    index: index + 1,
    total: productsSlice.length
  }
}));`;
  
  const oldCode = node.parameters.jsCode || '';
  const changed = oldCode !== newCode;
  
  if (changed) {
    node.parameters.jsCode = newCode;
    console.log('   ✅ Prepare Products Loop Code korrigiert');
  }
  
  return { node, changes: changed ? 1 : 0 };
}

/**
 * Korrigiere Update Product Adult Flag - URL und Product ID
 */
function fixUpdateProductAdultFlag(node) {
  if (node.name !== 'Update Product Adult Flag') return node;
  
  let changes = 0;
  
  // Korrigiere URL
  const oldUrl = node.parameters.url || '';
  const newUrl = '=https://www.googleapis.com/content/v2.1/{{ $json.shop_id }}/products/{{ $json.product_id }}';
  
  if (oldUrl.includes('shop1_id') || oldUrl.includes('product.id')) {
    node.parameters.url = newUrl;
    changes++;
    console.log('   ✅ URL korrigiert: shop1_id → shop_id, product.id → product_id');
  }
  
  return { node, changes };
}

/**
 * Korrigiere Update Product Images - URL und Body Parameter
 */
function fixUpdateProductImages(node) {
  if (node.name !== 'Update Product Images') return node;
  
  let changes = 0;
  
  // Korrigiere URL
  const oldUrl = node.parameters.url || '';
  const newUrl = '=https://www.googleapis.com/content/v2.1/{{ $json.shop_id }}/products/{{ $json.product_id }}';
  
  if (oldUrl.includes('shop1_id') || oldUrl.includes('product.id')) {
    node.parameters.url = newUrl;
    changes++;
    console.log('   ✅ URL korrigiert');
  }
  
  // Korrigiere Body Parameter
  const bodyParams = node.parameters.bodyParameters?.parameters || [];
  const imageLinkParam = bodyParams.find(p => p.name === 'imageLink');
  
  if (imageLinkParam && imageLinkParam.value.includes('product.imageLink')) {
    imageLinkParam.value = '={{ $json.image_link }}';
    changes++;
    console.log('   ✅ Body Parameter korrigiert: product.imageLink → image_link');
  }
  
  return { node, changes };
}

/**
 * Korrigiere Update Product Text - URL und Body Parameters
 */
function fixUpdateProductText(node) {
  if (node.name !== 'Update Product Text') return node;
  
  let changes = 0;
  
  // Korrigiere URL
  const oldUrl = node.parameters.url || '';
  const newUrl = '=https://www.googleapis.com/content/v2.1/{{ $json.shop_id }}/products/{{ $json.product_id }}';
  
  if (oldUrl.includes('shop1_id') || oldUrl.includes('product.id')) {
    node.parameters.url = newUrl;
    changes++;
    console.log('   ✅ URL korrigiert');
  }
  
  // Korrigiere Body Parameters
  const bodyParams = node.parameters.bodyParameters?.parameters || [];
  
  const titleParam = bodyParams.find(p => p.name === 'title');
  if (titleParam && titleParam.value.includes('product.title')) {
    titleParam.value = '={{ $json.title }}';
    changes++;
    console.log('   ✅ Title Parameter korrigiert');
  }
  
  const descParam = bodyParams.find(p => p.name === 'description');
  if (descParam && descParam.value.includes('product.description')) {
    descParam.value = '={{ $json.description }}';
    changes++;
    console.log('   ✅ Description Parameter korrigiert');
  }
  
  return { node, changes };
}

/**
 * Korrigiere Log to Shop Sheet - Sheet ID Referenz
 */
function fixLogToShopSheet(node) {
  if (node.name !== 'Log to Shop Sheet') return node;
  
  let changes = 0;
  
  const docId = node.parameters.documentId;
  if (docId && docId.value) {
    const oldValue = docId.value;
    // Prüfe ob google_sheet_id verwendet wird, aber sheet_id erwartet wird
    if (oldValue.includes('sheet_id') && !oldValue.includes('google_sheet_id')) {
      // Wenn Config nur google_sheet_id hat, ändern wir zu sheet_id (das jetzt als Alias existiert)
      // Oder wir ändern zu google_sheet_id
      // Da wir sheet_id als Alias hinzugefügt haben, sollte sheet_id funktionieren
      // Aber zur Sicherheit ändern wir zu google_sheet_id
      docId.value = "={{ $('Shop Configuration2').item.json.google_sheet_id }}";
      changes++;
      console.log('   ✅ Sheet ID Referenz korrigiert');
    }
  }
  
  return { node, changes };
}

/**
 * Hauptfunktion: Workflow korrigieren
 */
async function fixWorkflow() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 MERCHANT WORKFLOW FIX - ADULT FLAGS für Google-Genehmigung');
  console.log('='.repeat(80));
  console.log(`Workflow ID: ${WORKFLOW_ID}`);
  console.log(`n8n URL: ${N8N_URL}\n`);
  
  try {
    // 1. Hole aktuellen Workflow
    console.log('📥 Lade aktuellen Workflow...');
    const workflowResponse = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const workflow = workflowResponse;
    
    if (!workflow.nodes) {
      throw new Error('Workflow hat keine nodes!');
    }
    
    console.log(`✅ Workflow geladen: ${workflow.name}`);
    console.log(`   Aktuelle Nodes: ${workflow.nodes.length}\n`);
    
    // 2. Korrigiere Nodes
    console.log('🔧 Korrigiere kritische Nodes...\n');
    
    let totalChanges = 0;
    
    workflow.nodes = workflow.nodes.map(node => {
      // Shop Configuration2
      if (node.name === 'Shop Configuration2') {
        const result = fixShopConfiguration2(node);
        totalChanges += result.changes;
        return result.node;
      }
      
      // Prepare Products Loop
      if (node.name === 'Prepare Products Loop') {
        const result = fixPrepareProductsLoop(node);
        totalChanges += result.changes;
        return result.node;
      }
      
      // Update Product Adult Flag
      if (node.name === 'Update Product Adult Flag') {
        const result = fixUpdateProductAdultFlag(node);
        totalChanges += result.changes;
        return result.node;
      }
      
      // Update Product Images (für später)
      if (node.name === 'Update Product Images') {
        const result = fixUpdateProductImages(node);
        totalChanges += result.changes;
        return result.node;
      }
      
      // Update Product Text (für später)
      if (node.name === 'Update Product Text') {
        const result = fixUpdateProductText(node);
        totalChanges += result.changes;
        return result.node;
      }
      
      // Log to Shop Sheet
      if (node.name === 'Log to Shop Sheet') {
        const result = fixLogToShopSheet(node);
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
    
    // 3. Aktualisiere Workflow
    console.log('💾 Aktualisiere Workflow...');
    
    // Erstelle Update-Payload
    // n8n API Update: tags sind read-only, settings müssen vorhanden sein aber leer
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: {}  // Leere settings - werden vom Server beibehalten
      // tags NICHT senden - sind read-only
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    
    console.log('✅ Workflow erfolgreich aktualisiert!\n');
    console.log('📊 ZUSAMMENFASSUNG:');
    console.log(`   Korrekturen: ${totalChanges}`);
    console.log('\n🎯 FOKUS: Adult Flags für Google-Genehmigung aller Artikel!\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Ausführung
fixWorkflow();
