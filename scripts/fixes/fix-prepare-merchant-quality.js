/**
 * FIX PREPARE MERCHANT QUALITY CONNECTION
 * Fügt Prepare Merchant Quality Loop in die Kette ein
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

async function fixPrepareMerchantQuality() {
  console.log('\n🔧 FIX PREPARE MERCHANT QUALITY CONNECTION\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const connections = workflow.connections || {};
    
    // Finde Nodes
    const prepareTextLoop = workflow.nodes.find(n => n.name === 'Prepare Text Loop');
    const prepareMerchantQualityLoop = workflow.nodes.find(n => n.name === 'Prepare Merchant Quality Loop');
    const prepareMultiCountryLoop = workflow.nodes.find(n => n.name === 'Prepare Multi Country Loop');
    const getMerchantProducts2 = workflow.nodes.find(n => n.name === 'Get Merchant Products2');
    
    if (!prepareTextLoop || !prepareMerchantQualityLoop || !prepareMultiCountryLoop) {
      console.log('❌ Nodes nicht gefunden!');
      return;
    }
    
    console.log('📌 Aktuelle Verkabelung:');
    console.log(`   Prepare Text Loop → ${getMerchantProducts2 ? getMerchantProducts2.name : 'UNBEKANNT'}`);
    console.log(`   Prepare Merchant Quality Loop → KEINE AUSGÄNGE ❌`);
    console.log(`   Prepare Multi Country Loop → (korrekt)\n`);
    
    // Korrigiere: Prepare Text Loop → Prepare Merchant Quality Loop
    if (!connections[prepareTextLoop.id]) {
      connections[prepareTextLoop.id] = {};
    }
    if (!connections[prepareTextLoop.id].main) {
      connections[prepareTextLoop.id].main = [[]];
    }
    
    // Entferne alte Connection zu Get Merchant Products2 (falls vorhanden)
    const textLoopOutputs = connections[prepareTextLoop.id].main[0] || [];
    const filteredOutputs = textLoopOutputs.filter(conn => {
      // Behalte nur wenn es NICHT Get Merchant Products2 ist
      const targetNode = workflow.nodes.find(n => n.id === conn.node);
      return !targetNode || targetNode.name !== 'Get Merchant Products2';
    });
    
    // Füge Connection zu Prepare Merchant Quality Loop hinzu
    const alreadyConnected = filteredOutputs.some(conn => conn.node === prepareMerchantQualityLoop.id);
    if (!alreadyConnected) {
      filteredOutputs.push({
        node: prepareMerchantQualityLoop.id,
        type: 'main',
        index: 0
      });
      console.log('   ✅ Prepare Text Loop → Prepare Merchant Quality Loop');
    }
    
    connections[prepareTextLoop.id].main[0] = filteredOutputs;
    
    // Korrigiere: Prepare Merchant Quality Loop → Prepare Multi Country Loop
    if (!connections[prepareMerchantQualityLoop.id]) {
      connections[prepareMerchantQualityLoop.id] = {};
    }
    if (!connections[prepareMerchantQualityLoop.id].main) {
      connections[prepareMerchantQualityLoop.id].main = [[]];
    }
    
    const merchantQualityOutputs = connections[prepareMerchantQualityLoop.id].main[0] || [];
    const alreadyConnectedToMultiCountry = merchantQualityOutputs.some(conn => conn.node === prepareMultiCountryLoop.id);
    
    if (!alreadyConnectedToMultiCountry) {
      connections[prepareMerchantQualityLoop.id].main[0] = [{
        node: prepareMultiCountryLoop.id,
        type: 'main',
        index: 0
      }];
      console.log('   ✅ Prepare Merchant Quality Loop → Prepare Multi Country Loop');
    } else {
      console.log('   ⚠️  Prepare Merchant Quality Loop → Prepare Multi Country Loop (bereits verbunden)');
    }
    
    // Aktualisiere Workflow
    console.log('\n💾 Aktualisiere Workflow...');
    
    const cleanSettings = workflow.settings ? { executionOrder: workflow.settings.executionOrder || 'v1' } : { executionOrder: 'v1' };
    
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: connections,
      settings: cleanSettings
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    
    console.log('✅ Workflow erfolgreich aktualisiert!\n');
    console.log('📊 KORRIGIERTE KETTE:');
    console.log('\n   Prepare Products Loop');
    console.log('   ↓');
    console.log('   Prepare Images Loop');
    console.log('   ↓');
    console.log('   Prepare Text Loop');
    console.log('   ↓');
    console.log('   Prepare Merchant Quality Loop ✅');
    console.log('   ↓');
    console.log('   Prepare Multi Country Loop');
    console.log('   ↓');
    console.log('   Prepare GTN/EAN_Loop');
    console.log('   ↓');
    console.log('   Rate Limiting\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fixPrepareMerchantQuality();

