/**
 * FIX PREPARE LOOPS CONNECTIONS
 * Verkabelt alle Prepare-Loops in der richtigen Reihenfolge
 * Pro Artikel: Prepare Products → Prepare Images → Prepare Text → ... → Rate Limiting
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

async function fixPrepareLoopsConnections() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX PREPARE LOOPS CONNECTIONS');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    // Finde alle Prepare-Loops (in der richtigen Reihenfolge)
    const prepareLoopOrder = [
      'Prepare Products Loop',
      'Prepare Images Loop',
      'Prepare Text Loop',
      'Prepare Merchant Quality Loop',
      'Prepare Multi Country Loop',
      'Prepare GTN/EAN_Loop'
    ];
    
    const prepareLoops = [];
    prepareLoopOrder.forEach(name => {
      const node = workflow.nodes.find(n => n.name === name || n.name.includes(name.split(' ')[1]));
      if (node) {
        prepareLoops.push(node);
      }
    });
    
    console.log(`📌 Gefundene Prepare-Loops (${prepareLoops.length}):\n`);
    prepareLoops.forEach((node, i) => {
      console.log(`   ${i + 1}. ${node.name} (ID: ${node.id.substring(0, 8)}...)`);
    });
    
    // Finde Rate Limiting Node (sollte nach allen Prepare-Loops kommen)
    const rateLimitingNode = workflow.nodes.find(n => 
      n.name.toLowerCase().includes('rate limiting') && 
      !n.name.toLowerCase().includes('gtn')
    );
    
    if (!rateLimitingNode) {
      console.log('\n⚠️  Rate Limiting Node nicht gefunden (ohne GTN/EAN)');
      console.log('   Suche nach erstem Rate Limiting Node...\n');
      const allRateLimiting = workflow.nodes.filter(n => 
        n.name.toLowerCase().includes('rate limiting')
      );
      if (allRateLimiting.length > 0) {
        console.log('   Gefundene Rate Limiting Nodes:');
        allRateLimiting.forEach(n => console.log(`   - ${n.name}`));
      }
    } else {
      console.log(`\n✅ Rate Limiting Node gefunden: ${rateLimitingNode.name}\n`);
    }
    
    // Finde Input-Node für Prepare Products Loop (woher kommen die Daten?)
    // Wahrscheinlich von "Analyze Products2" oder ähnlich
    const analyzeProductsNode = workflow.nodes.find(n => 
      n.name.toLowerCase().includes('analyze products') ||
      n.name.toLowerCase().includes('route by priority')
    );
    
    if (analyzeProductsNode) {
      console.log(`✅ Input-Node gefunden: ${analyzeProductsNode.name}\n`);
    }
    
    // Initialisiere Connections falls nicht vorhanden
    if (!workflow.connections) {
      workflow.connections = {};
    }
    
    console.log('🔧 Erstelle Verbindungen...\n');
    
    // 1. Verkabelung zwischen Prepare-Loops (sequenziell)
    for (let i = 0; i < prepareLoops.length - 1; i++) {
      const currentLoop = prepareLoops[i];
      const nextLoop = prepareLoops[i + 1];
      
      // Erstelle Connection: currentLoop → nextLoop
      if (!workflow.connections[currentLoop.id]) {
        workflow.connections[currentLoop.id] = {};
      }
      if (!workflow.connections[currentLoop.id].main) {
        workflow.connections[currentLoop.id].main = [[]];
      }
      
      // Prüfe ob Connection bereits existiert
      const existingConnections = workflow.connections[currentLoop.id].main[0] || [];
      const alreadyConnected = existingConnections.some(conn => conn.node === nextLoop.id);
      
      if (!alreadyConnected) {
        workflow.connections[currentLoop.id].main[0].push({
          node: nextLoop.id,
          type: 'main',
          index: 0
        });
        console.log(`   ✅ ${currentLoop.name} → ${nextLoop.name}`);
      } else {
        console.log(`   ⚠️  ${currentLoop.name} → ${nextLoop.name} (bereits verbunden)`);
      }
    }
    
    // 2. Letzter Prepare-Loop → Rate Limiting
    if (prepareLoops.length > 0 && rateLimitingNode) {
      const lastLoop = prepareLoops[prepareLoops.length - 1];
      
      if (!workflow.connections[lastLoop.id]) {
        workflow.connections[lastLoop.id] = {};
      }
      if (!workflow.connections[lastLoop.id].main) {
        workflow.connections[lastLoop.id].main = [[]];
      }
      
      const existingConnections = workflow.connections[lastLoop.id].main[0] || [];
      const alreadyConnected = existingConnections.some(conn => conn.node === rateLimitingNode.id);
      
      if (!alreadyConnected) {
        workflow.connections[lastLoop.id].main[0].push({
          node: rateLimitingNode.id,
          type: 'main',
          index: 0
        });
        console.log(`   ✅ ${lastLoop.name} → ${rateLimitingNode.name}`);
      } else {
        console.log(`   ⚠️  ${lastLoop.name} → ${rateLimitingNode.name} (bereits verbunden)`);
      }
    }
    
    // 3. Input zu erstem Prepare-Loop (falls Analyze Products/Route by Priority vorhanden)
    if (analyzeProductsNode && prepareLoops.length > 0) {
      const firstLoop = prepareLoops[0];
      
      if (!workflow.connections[analyzeProductsNode.id]) {
        workflow.connections[analyzeProductsNode.id] = {};
      }
      
      // Prüfe welche Outputs Analyze Products hat
      // Normalerweise sollte es mehrere Outputs haben (für verschiedene Prioritäten)
      // Wir müssen zu allen relevanten Outputs Prepare Products Loop verbinden
      
      // Prüfe ob bereits verbunden
      const existingConnections = workflow.connections[analyzeProductsNode.id].main || [];
      let connected = false;
      
      existingConnections.forEach((outputConnections, outputIndex) => {
        if (outputConnections && outputConnections.some(conn => conn.node === firstLoop.id)) {
          connected = true;
        }
      });
      
      if (!connected) {
        // Verbinde zum ersten verfügbaren Output
        if (!workflow.connections[analyzeProductsNode.id].main) {
          workflow.connections[analyzeProductsNode.id].main = [[]];
        }
        if (!workflow.connections[analyzeProductsNode.id].main[0]) {
          workflow.connections[analyzeProductsNode.id].main[0] = [];
        }
        
        workflow.connections[analyzeProductsNode.id].main[0].push({
          node: firstLoop.id,
          type: 'main',
          index: 0
        });
        console.log(`   ✅ ${analyzeProductsNode.name} → ${firstLoop.name}`);
      } else {
        console.log(`   ⚠️  ${analyzeProductsNode.name} → ${firstLoop.name} (bereits verbunden)`);
      }
    }
    
    console.log('\n💾 Aktualisiere Workflow...');
    
    // Bereinige Settings - entferne zusätzliche Properties die nicht erlaubt sind
    const cleanSettings = workflow.settings ? { executionOrder: workflow.settings.executionOrder || 'v1' } : { executionOrder: 'v1' };
    
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: cleanSettings
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    
    console.log('✅ Workflow erfolgreich aktualisiert!\n');
    console.log('📊 FINALE VERKABELUNG:');
    console.log('\n   Analyze Products / Route by Priority');
    console.log('   ↓');
    console.log('   Prepare Products Loop');
    console.log('   ↓');
    console.log('   Prepare Images Loop');
    console.log('   ↓');
    console.log('   Prepare Text Loop');
    console.log('   ↓');
    console.log('   Prepare Merchant Quality Loop');
    console.log('   ↓');
    console.log('   Prepare Multi Country Loop');
    console.log('   ↓');
    console.log('   Prepare GTN/EAN_Loop');
    console.log('   ↓');
    console.log('   Rate Limiting');
    console.log('\n💡 Jeder Artikel durchläuft jetzt ALLE Prepare-Stränge sequenziell!\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fixPrepareLoopsConnections();

