/**
 * FIX PREPARE PRODUCTS LOOP - SEQUENTIELL
 * Ändert Prepare Products Loop so dass Items sequenziell weitergegeben werden
 * 
 * WICHTIG: Dieser Node sollte ein Array zurückgeben (um Items aufzuteilen),
 * ABER die nachfolgenden Nodes müssen sequenziell arbeiten (ein Item nach dem anderen)
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

async function fixPrepareProductsLoopSequential() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX PREPARE PRODUCTS LOOP - SEQUENTIELL');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    const node = workflow.nodes.find(n => n.name === 'Prepare Products Loop');
    
    if (!node) {
      console.log('❌ Node "Prepare Products Loop" nicht gefunden!\n');
      return;
    }
    
    console.log(`📌 Node gefunden: ${node.name}\n`);
    
    // NEUER CODE: Gibt Array zurück (für n8n Split)
    // n8n wird dann jedes Item einzeln an den nächsten Node weitergeben
    const newCode = `// ============================================================================
// PREPARE PRODUCTS LOOP - GIBT ARRAY ZURÜCK FÜR SPLIT
// ============================================================================
// ✅ Dieser Node gibt ein Array zurück (für n8n Split/Iteration)
// → n8n wird dann JEDES Item einzeln an den nächsten Node weitergeben
// → Die nachfolgenden Nodes (Prepare Images, etc.) müssen sequenziell arbeiten

const inputData = $input.first().json;
const config = $('Shop Configuration2').first().json;

// Get products from input (Gemini Decision passes them)
const productsToFix = inputData.products || [];
const maxProducts = inputData.products_to_process || productsToFix.length;

// Shop info from config
const shopId = inputData.shop_id || config.shop1_id;
const shopName = shopId === config.shop1_id ? config.shop1_name : config.shop2_name;
const shopUrl = shopId === config.shop1_id ? config.shop1_url : config.shop2_url;

const productsSlice = productsToFix.slice(0, maxProducts);

// ✅ Gibt Array zurück - n8n wird jedes Item einzeln weiterleiten
return productsSlice.map((product, index) => ({
  json: {
    shop_id: shopId,
    shop_name: shopName,
    shop_url: shopUrl,
    product_id: product.productId || product.id,
    offer_id: product.offerId,
    title: product.title,
    originalProduct: product, // Behalte original product data
    action: 'prepare',
    priority: 'prepare',
    index: index + 1,
    total: productsSlice.length
  }
}));`;
    
    const currentCode = node.parameters?.jsCode || '';
    
    if (currentCode === newCode) {
      console.log('✅ Code ist bereits korrekt!\n');
    } else {
      node.parameters.jsCode = newCode;
      console.log('✅ Code aktualisiert\n');
    }
    
    // Prüfe Connections
    console.log('🔗 PRÜFE CONNECTIONS:\n');
    
    const connections = workflow.connections;
    const nodeConnections = connections[node.name];
    
    if (nodeConnections && nodeConnections.main && nodeConnections.main[0]) {
      const nextNodes = nodeConnections.main[0].map(conn => conn.node);
      console.log(`   Verbunden mit: ${nextNodes.join(', ')}`);
      
      // Prüfe ob Prepare Images Loop verbunden ist
      const hasImagesLoop = nextNodes.some(name => name.includes('Prepare Images'));
      if (hasImagesLoop) {
        console.log('   ✅ Prepare Images Loop ist verbunden\n');
      } else {
        console.log('   ⚠️  Prepare Images Loop ist NICHT direkt verbunden!');
        console.log('   → Prüfe ob die Connection über andere Nodes geht\n');
      }
    } else {
      console.log('   ❌ KEINE CONNECTIONS gefunden!');
      console.log('   → Node ist nicht verbunden!\n');
    }
    
    // Aktualisiere Workflow
    console.log('💾 Aktualisiere Workflow...\n');
    
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
    
    console.log('📊 ZUSAMMENFASSUNG:\n');
    console.log('   ⚠️  WICHTIG: Prepare Products Loop gibt ein Array zurück');
    console.log('   → Das ist KORREKT für die Initial-Split');
    console.log('   → n8n wird jedes Item einzeln an den nächsten Node weitergeben');
    console.log('\n   ✅ Die nachfolgenden Nodes (Prepare Images, etc.)');
    console.log('      müssen sequenziell arbeiten (ein Item nach dem anderen)');
    console.log('      → Diese wurden bereits korrigiert\n');
    
    console.log('💡 WENN ES IMMER NOCH NICHT FUNKTIONIERT:');
    console.log('   1. Prüfe ob die Connections korrekt sind');
    console.log('   2. Prüfe ob "Prepare Images Loop" richtig verbunden ist');
    console.log('   3. Prüfe ob "Prepare Images Loop" sequenziell arbeitet (verwendet $input.first())\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fixPrepareProductsLoopSequential();
