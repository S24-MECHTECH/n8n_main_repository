/**
 * ANALYZE ENTIRE WORKFLOW
 * Analysiert den kompletten Workflow: Connections, Nodes, Logik
 * NUR ANALYSIEREN - KEINE ÄNDERUNGEN!
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

async function analyzeEntireWorkflow() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VOLLSTÄNDIGE WORKFLOW-ANALYSE');
  console.log('='.repeat(80) + '\n');
  console.log('⚠️  NUR ANALYSE - KEINE ÄNDERUNGEN!\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    console.log(`📌 Workflow: ${workflow.name}`);
    console.log(`   ID: ${WORKFLOW_ID}`);
    console.log(`   Nodes: ${workflow.nodes.length}\n`);
    
    // 1. FIND ALL NODES
    console.log('='.repeat(80));
    console.log('1️⃣  ALLE NODES');
    console.log('='.repeat(80) + '\n');
    
    const nodes = workflow.nodes;
    const nodeMap = {};
    nodes.forEach(node => {
      nodeMap[node.name] = node;
    });
    
    // Kategorisiere Nodes
    const prepareNodes = nodes.filter(n => n.name.toLowerCase().includes('prepare'));
    const updateNodes = nodes.filter(n => n.name.toLowerCase().includes('update'));
    const routeNodes = nodes.filter(n => n.name.toLowerCase().includes('route') || n.name.toLowerCase().includes('priority'));
    const otherNodes = nodes.filter(n => 
      !n.name.toLowerCase().includes('prepare') &&
      !n.name.toLowerCase().includes('update') &&
      !n.name.toLowerCase().includes('route') &&
      !n.name.toLowerCase().includes('priority')
    );
    
    console.log(`📊 Node-Kategorien:`);
    console.log(`   Prepare Nodes: ${prepareNodes.length}`);
    console.log(`   Update Nodes: ${updateNodes.length}`);
    console.log(`   Route/Priority Nodes: ${routeNodes.length}`);
    console.log(`   Andere Nodes: ${otherNodes.length}\n`);
    
    // Zeige alle Nodes
    console.log('📋 ALLE NODES:\n');
    nodes.forEach((node, index) => {
      const nodeType = node.type.replace('n8n-nodes-base.', '');
      console.log(`   ${index + 1}. ${node.name} (${nodeType})`);
    });
    console.log();
    
    // 2. ANALYZE CONNECTIONS
    console.log('='.repeat(80));
    console.log('2️⃣  CONNECTIONS ANALYSE');
    console.log('='.repeat(80) + '\n');
    
    const connections = workflow.connections || {};
    
    // Finde alle Prepare Nodes und ihre Connections
    console.log('🔗 PREPARE NODES CONNECTIONS:\n');
    prepareNodes.forEach(node => {
      const nodeConn = connections[node.name];
      if (nodeConn && nodeConn.main && nodeConn.main[0]) {
        const outputs = nodeConn.main[0].map(c => c.node);
        console.log(`   ${node.name}`);
        console.log(`      → ${outputs.join(', ')}`);
      } else {
        console.log(`   ${node.name}`);
        console.log(`      ❌ KEINE OUTPUT CONNECTIONS!`);
      }
    });
    console.log();
    
    // Finde alle Update Nodes und ihre Connections
    console.log('🔗 UPDATE NODES CONNECTIONS:\n');
    updateNodes.forEach(node => {
      const nodeConn = connections[node.name];
      const inputs = nodes.filter(n => {
        const conn = connections[n.name];
        return conn && conn.main && conn.main[0] && conn.main[0].some(c => c.node === node.name);
      });
      
      if (nodeConn && nodeConn.main && nodeConn.main[0]) {
        const outputs = nodeConn.main[0].map(c => c.node);
        console.log(`   ${node.name}`);
        console.log(`      ← Von: ${inputs.map(n => n.name).join(', ') || 'KEINE INPUTS'}`);
        console.log(`      → ${outputs.join(', ')}`);
      } else {
        console.log(`   ${node.name}`);
        console.log(`      ← Von: ${inputs.map(n => n.name).join(', ') || 'KEINE INPUTS'}`);
        console.log(`      ❌ KEINE OUTPUT CONNECTIONS!`);
      }
    });
    console.log();
    
    // 3. FIND PROBLEM AREAS
    console.log('='.repeat(80));
    console.log('3️⃣  PROBLEM-BEREICHE');
    console.log('='.repeat(80) + '\n');
    
    // Nodes ohne Inputs (außer Start/Trigger)
    console.log('❌ NODES OHNE INPUT CONNECTIONS:\n');
    let problemCount = 0;
    nodes.forEach(node => {
      if (node.type.includes('trigger') || node.type.includes('manual')) {
        return; // Trigger haben keine Inputs
      }
      
      const hasInput = nodes.some(otherNode => {
        const conn = connections[otherNode.name];
        return conn && conn.main && conn.main[0] && conn.main[0].some(c => c.node === node.name);
      });
      
      if (!hasInput) {
        console.log(`   ⚠️  ${node.name} - Hat keine Input Connections!`);
        problemCount++;
      }
    });
    if (problemCount === 0) {
      console.log('   ✅ Alle Nodes haben Inputs\n');
    } else {
      console.log();
    }
    
    // Nodes ohne Outputs
    console.log('❌ NODES OHNE OUTPUT CONNECTIONS:\n');
    problemCount = 0;
    nodes.forEach(node => {
      if (node.type.includes('googleSheets') || node.type.includes('googleDrive')) {
        return; // End-Nodes können keine Outputs haben
      }
      
      const nodeConn = connections[node.name];
      const hasOutput = nodeConn && nodeConn.main && nodeConn.main[0] && nodeConn.main[0].length > 0;
      
      if (!hasOutput) {
        console.log(`   ⚠️  ${node.name} - Hat keine Output Connections!`);
        problemCount++;
      }
    });
    if (problemCount === 0) {
      console.log('   ✅ Alle Nodes haben Outputs\n');
    } else {
      console.log();
    }
    
    // 4. ANALYZE PREPARE CHAIN
    console.log('='.repeat(80));
    console.log('4️⃣  PREPARE CHAIN ANALYSE');
    console.log('='.repeat(80) + '\n');
    
    // Finde die Prepare-Kette
    const prepareChain = [];
    const prepareChainNames = [
      'Prepare Products Loop',
      'Prepare Images Loop',
      'Prepare Text Loop',
      'Prepare Merchant Quality Loop',
      'Prepare Multi Country Loop',
      'Prepare GTN/EAN_Loop'
    ];
    
    console.log('🔍 Prüfe Prepare-Kette:\n');
    prepareChainNames.forEach((nodeName, index) => {
      const node = nodeMap[nodeName];
      if (!node) {
        console.log(`   ❌ ${nodeName}: NODE NICHT GEFUNDEN!`);
        return;
      }
      
      const nodeConn = connections[nodeName];
      const nextNodes = nodeConn && nodeConn.main && nodeConn.main[0] ? 
        nodeConn.main[0].map(c => c.node) : [];
      
      const expectedNext = prepareChainNames[index + 1];
      const hasCorrectNext = nextNodes.includes(expectedNext);
      
      console.log(`   ${index + 1}. ${nodeName}`);
      console.log(`      Aktuell verbunden mit: ${nextNodes.join(', ') || 'KEINE'}`);
      if (expectedNext) {
        console.log(`      Erwartet nächster: ${expectedNext}`);
        console.log(`      ${hasCorrectNext ? '✅' : '❌'} ${hasCorrectNext ? 'Korrekt' : 'FALSCH!'}`);
      }
      console.log();
    });
    
    // 5. ANALYZE UPDATE NODES AFTER PREPARE
    console.log('='.repeat(80));
    console.log('5️⃣  UPDATE NODES NACH PREPARE');
    console.log('='.repeat(80) + '\n');
    
    updateNodes.forEach(node => {
      const inputs = nodes.filter(n => {
        const conn = connections[n.name];
        return conn && conn.main && conn.main[0] && conn.main[0].some(c => c.node === node.name);
      });
      
      console.log(`   ${node.name}`);
      console.log(`      Input von: ${inputs.map(n => n.name).join(', ') || 'KEINE'}`);
      
      // Prüfe ob von Prepare-Node kommt
      const fromPrepare = inputs.some(n => n.name.toLowerCase().includes('prepare'));
      console.log(`      ${fromPrepare ? '✅' : '❌'} Kommt ${fromPrepare ? 'von' : 'NICHT von'} Prepare-Node`);
      console.log();
    });
    
    // 6. CHECK ERRORS (rotes Dreieck = Node hat Fehler)
    console.log('='.repeat(80));
    console.log('6️⃣  FEHLER-PRÜFUNG');
    console.log('='.repeat(80) + '\n');
    
    updateNodes.forEach(node => {
      // Prüfe auf häufige Fehler-Indikatoren
      const params = node.parameters || {};
      const auth = params.authentication || 'none';
      const credType = params.nodeCredentialType || 'none';
      const method = params.method || 'GET';
      const url = params.url || '';
      const hasBody = params.sendBody || false;
      
      let hasErrors = false;
      const errors = [];
      
      // Prüfe Authentication
      if (node.type.includes('httpRequest')) {
        if (auth === 'none' || (auth === 'predefinedCredentialType' && credType === 'none')) {
          errors.push('Authentication fehlt');
          hasErrors = true;
        } else if (auth === 'predefinedCredentialType' && credType !== 'googleOAuth2Api' && url.includes('googleapis.com')) {
          errors.push(`Falsche Credential-Type: ${credType} (sollte googleOAuth2Api sein)`);
          hasErrors = true;
        }
      }
      
      // Prüfe Method/Body
      if (method === 'PATCH' && !hasBody) {
        errors.push('PATCH ohne Body');
        hasErrors = true;
      }
      
      if (hasErrors) {
        console.log(`   🔴 ${node.name}:`);
        errors.forEach(err => console.log(`      ❌ ${err}`));
        console.log();
      }
    });
    
    // 7. SUMMARY
    console.log('='.repeat(80));
    console.log('7️⃣  ZUSAMMENFASSUNG');
    console.log('='.repeat(80) + '\n');
    
    console.log('📊 WORKFLOW-STRUKTUR:\n');
    console.log(`   Gesamt Nodes: ${nodes.length}`);
    console.log(`   Prepare Nodes: ${prepareNodes.length}`);
    console.log(`   Update Nodes: ${updateNodes.length}`);
    console.log(`   Route/Priority Nodes: ${routeNodes.length}`);
    console.log(`   Andere Nodes: ${otherNodes.length}\n`);
    
    console.log('🔗 CONNECTION-STATUS:\n');
    const allNodesWithInputs = nodes.filter(node => {
      if (node.type.includes('trigger') || node.type.includes('manual')) return true;
      return nodes.some(otherNode => {
        const conn = connections[otherNode.name];
        return conn && conn.main && conn.main[0] && conn.main[0].some(c => c.node === node.name);
      });
    }).length;
    
    const allNodesWithOutputs = nodes.filter(node => {
      if (node.type.includes('googleSheets') || node.type.includes('googleDrive')) return true;
      const nodeConn = connections[node.name];
      return nodeConn && nodeConn.main && nodeConn.main[0] && nodeConn.main[0].length > 0;
    }).length;
    
    console.log(`   Nodes mit Inputs: ${allNodesWithInputs}/${nodes.length}`);
    console.log(`   Nodes mit Outputs: ${allNodesWithOutputs}/${nodes.length}\n`);
    
    console.log('💡 EMPFOHLENE NÄCHSTE SCHRITTE:\n');
    console.log('   1. Prüfe welche Connections fehlen');
    console.log('   2. Prüfe welche Prepare→Update Connections korrekt sein sollten');
    console.log('   3. Erstelle Plan zur Wiederherstellung der Connections');
    console.log('   4. Warte auf Ihre Zustimmung bevor Änderungen\n');
    
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

analyzeEntireWorkflow();
