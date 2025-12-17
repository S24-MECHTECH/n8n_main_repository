/**
 * FIX PREPARE CHAIN CONNECTIONS
 * Stellt die korrekten Connections zwischen allen Prepare-Nodes wieder her
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

async function fixPrepareChainConnections() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX PREPARE CHAIN CONNECTIONS');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    // Finde alle Prepare-Nodes
    const prepareNodes = [
      'Prepare Products Loop',
      'Prepare Images Loop',
      'Prepare Text Loop',
      'Prepare Merchant Quality Loop',
      'Prepare Multi Country Loop',
      'Prepare GTN/EAN_Loop'
    ];
    
    console.log('🔍 Finde Nodes...\n');
    
    const nodeMap = {};
    prepareNodes.forEach(name => {
      const node = workflow.nodes.find(n => n.name === name);
      if (node) {
        nodeMap[name] = node;
        console.log(`   ✅ ${name} gefunden`);
      } else {
        console.log(`   ❌ ${name} NICHT gefunden`);
      }
    });
    
    console.log();
    
    // Prüfe aktuelle Connections
    console.log('📋 AKTUELLE CONNECTIONS:\n');
    const connections = workflow.connections || {};
    
    prepareNodes.forEach(name => {
      const nodeConn = connections[name];
      if (nodeConn && nodeConn.main && nodeConn.main[0]) {
        const nextNodes = nodeConn.main[0].map(c => c.node);
        console.log(`   ${name} → ${nextNodes.join(', ')}`);
      } else {
        console.log(`   ${name} → KEINE CONNECTIONS`);
      }
    });
    
    console.log();
    
    // Erstelle korrekte Chain
    // Prepare Products Loop → Prepare Images Loop → Prepare Text Loop → 
    // Prepare Merchant Quality Loop → Prepare Multi Country Loop → Prepare GTN/EAN_Loop → Rate Limiting
    
    // Finde "Rate Limiting" oder ähnlichen Node
    const rateLimitingNode = workflow.nodes.find(n => 
      n.name.includes('Rate Limiting') || 
      n.name.includes('Rate Limit')
    );
    
    if (!rateLimitingNode) {
      console.log('⚠️  Rate Limiting Node nicht gefunden, suche nach Aggregate Results2...\n');
      const aggregateNode = workflow.nodes.find(n => n.name.includes('Aggregate Results'));
      if (aggregateNode) {
        console.log(`   Gefunden: ${aggregateNode.name}\n`);
      }
    }
    
    // Korrigiere Connections
    console.log('🔧 Korrigiere Connections...\n');
    
    if (!connections) {
      workflow.connections = {};
    }
    
    // Chain: Prepare Products → Prepare Images
    if (nodeMap['Prepare Products Loop'] && nodeMap['Prepare Images Loop']) {
      if (!connections['Prepare Products Loop']) {
        connections['Prepare Products Loop'] = { main: [[]] };
      }
      connections['Prepare Products Loop'].main[0] = [{
        node: 'Prepare Images Loop',
        type: 'main',
        index: 0
      }];
      console.log('   ✅ Prepare Products Loop → Prepare Images Loop');
    }
    
    // Chain: Prepare Images → Prepare Text
    if (nodeMap['Prepare Images Loop'] && nodeMap['Prepare Text Loop']) {
      if (!connections['Prepare Images Loop']) {
        connections['Prepare Images Loop'] = { main: [[]] };
      }
      connections['Prepare Images Loop'].main[0] = [{
        node: 'Prepare Text Loop',
        type: 'main',
        index: 0
      }];
      console.log('   ✅ Prepare Images Loop → Prepare Text Loop');
    }
    
    // Chain: Prepare Text → Prepare Merchant Quality
    if (nodeMap['Prepare Text Loop'] && nodeMap['Prepare Merchant Quality Loop']) {
      if (!connections['Prepare Text Loop']) {
        connections['Prepare Text Loop'] = { main: [[]] };
      }
      connections['Prepare Text Loop'].main[0] = [{
        node: 'Prepare Merchant Quality Loop',
        type: 'main',
        index: 0
      }];
      console.log('   ✅ Prepare Text Loop → Prepare Merchant Quality Loop');
    }
    
    // Chain: Prepare Merchant Quality → Prepare Multi Country
    if (nodeMap['Prepare Merchant Quality Loop'] && nodeMap['Prepare Multi Country Loop']) {
      if (!connections['Prepare Merchant Quality Loop']) {
        connections['Prepare Merchant Quality Loop'] = { main: [[]] };
      }
      connections['Prepare Merchant Quality Loop'].main[0] = [{
        node: 'Prepare Multi Country Loop',
        type: 'main',
        index: 0
      }];
      console.log('   ✅ Prepare Merchant Quality Loop → Prepare Multi Country Loop');
    }
    
    // Chain: Prepare Multi Country → Prepare GTN/EAN
    if (nodeMap['Prepare Multi Country Loop'] && nodeMap['Prepare GTN/EAN_Loop']) {
      if (!connections['Prepare Multi Country Loop']) {
        connections['Prepare Multi Country Loop'] = { main: [[]] };
      }
      connections['Prepare Multi Country Loop'].main[0] = [{
        node: 'Prepare GTN/EAN_Loop',
        type: 'main',
        index: 0
      }];
      console.log('   ✅ Prepare Multi Country Loop → Prepare GTN/EAN_Loop');
    }
    
    // Chain: Prepare GTN/EAN → Rate Limiting (oder Aggregate Results2)
    const targetNode = rateLimitingNode || workflow.nodes.find(n => n.name.includes('Aggregate Results2') || n.name.includes('Rate Limiting'));
    if (nodeMap['Prepare GTN/EAN_Loop'] && targetNode) {
      if (!connections['Prepare GTN/EAN_Loop']) {
        connections['Prepare GTN/EAN_Loop'] = { main: [[]] };
      }
      connections['Prepare GTN/EAN_Loop'].main[0] = [{
        node: targetNode.name,
        type: 'main',
        index: 0
      }];
      console.log(`   ✅ Prepare GTN/EAN_Loop → ${targetNode.name}`);
    }
    
    console.log();
    
    // Aktualisiere Workflow
    console.log('💾 Aktualisiere Workflow...\n');
    
    const cleanSettings = workflow.settings ? 
      { executionOrder: workflow.settings.executionOrder || 'v1' } : 
      { executionOrder: 'v1' };
    
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: connections,
      settings: cleanSettings
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    
    console.log('✅ Workflow erfolgreich aktualisiert!\n');
    
    console.log('📊 KORREKTE CHAIN:\n');
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
    console.log(`   ${targetNode?.name || 'Rate Limiting/Aggregate'}\n`);
    
    console.log('💡 JETZT SOLLTE ES FUNKTIONIEREN:');
    console.log('   → Jedes Item wird sequenziell durch alle Prepare-Nodes geschickt');
    console.log('   → Artikel 1: Prepare Products → Images → Text → ...');
    console.log('   → Artikel 2: Prepare Products → Images → Text → ...');
    console.log('   → etc.\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fixPrepareChainConnections();
