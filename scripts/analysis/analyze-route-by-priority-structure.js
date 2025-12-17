/**
 * ANALYZE ROUTE BY PRIORITY STRUCTURE
 * Analysiert wie Route by Priority Nodes verbunden sind
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

async function analyzeRouteByPriorityStructure() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ROUTE BY PRIORITY STRUKTUR ANALYSE');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const connections = workflow.connections || {};
    const nodes = workflow.nodes;
    
    // Finde alle Route by Priority Nodes
    const routeNodes = nodes.filter(n => 
      n.name.toLowerCase().includes('route') && n.name.toLowerCase().includes('priority') ||
      n.name.toLowerCase().includes('route by priority')
    );
    
    console.log(`📊 Route by Priority Nodes gefunden: ${routeNodes.length}\n`);
    
    if (routeNodes.length === 0) {
      console.log('⚠️  Keine Route by Priority Nodes gefunden!\n');
      console.log('🔍 Suche nach ähnlichen Nodes...\n');
      const switchNodes = nodes.filter(n => 
        n.type.includes('switch') || n.type.includes('if')
      );
      switchNodes.forEach(node => {
        console.log(`   - ${node.name} (${node.type})`);
      });
      return;
    }
    
    // Analysiere jede Route by Priority Node
    routeNodes.forEach((routeNode, index) => {
      console.log('='.repeat(80));
      console.log(`${index + 1}. ${routeNode.name}`);
      console.log('='.repeat(80) + '\n');
      
      // Finde Inputs (von wo kommt sie?)
      const inputs = nodes.filter(n => {
        const conn = connections[n.name];
        return conn && conn.main && conn.main[0] && 
               conn.main[0].some(c => c.node === routeNode.name);
      });
      
      console.log('📥 INPUTS (von wo kommt die Route Node?):');
      if (inputs.length > 0) {
        inputs.forEach(input => {
          console.log(`   ← ${input.name}`);
        });
      } else {
        console.log('   ❌ KEINE INPUTS!');
      }
      console.log();
      
      // Finde Outputs (wohin geht sie?)
      const routeConn = connections[routeNode.name];
      const outputs = routeConn && routeConn.main && routeConn.main[0] ? 
        routeConn.main[0].map(c => {
          const targetNode = nodes.find(n => n.name === c.node);
          return {
            node: c.node,
            type: c.type || 'main',
            index: c.index || 0,
            nodeType: targetNode ? targetNode.type : 'unknown'
          };
        }) : [];
      
      console.log('📤 OUTPUTS (wohin geht die Route Node?):');
      if (outputs.length > 0) {
        // Gruppiere nach Kategorie
        const updateNodes = [];
        const rateLimitingNodes = [];
        const otherNodes = [];
        
        outputs.forEach(output => {
          const targetNode = nodes.find(n => n.name === output.node);
          if (!targetNode) {
            otherNodes.push(output);
            return;
          }
          
          if (targetNode.name.toLowerCase().includes('update')) {
            updateNodes.push(output);
          } else if (targetNode.name.toLowerCase().includes('rate') || 
                     targetNode.name.toLowerCase().includes('wait')) {
            rateLimitingNodes.push(output);
          } else {
            otherNodes.push(output);
          }
        });
        
        console.log(`   Gesamt: ${outputs.length} Verbindungen\n`);
        
        if (updateNodes.length > 0) {
          console.log('   🔄 UPDATE NODES:');
          updateNodes.forEach(output => {
            console.log(`      → ${output.node}`);
          });
          console.log();
        }
        
        if (rateLimitingNodes.length > 0) {
          console.log('   ⏱️  RATE LIMITING NODES:');
          rateLimitingNodes.forEach(output => {
            console.log(`      → ${output.node}`);
          });
          console.log();
        }
        
        if (otherNodes.length > 0) {
          console.log('   📋 ANDERE NODES:');
          otherNodes.forEach(output => {
            console.log(`      → ${output.node}`);
          });
          console.log();
        }
        
        // Prüfe ob Struktur wie erwartet ist
        console.log('🔍 STRUKTUR-ANALYSE:\n');
        
        const hasDirectUpdate = updateNodes.length > 0;
        const hasDirectRateLimiting = rateLimitingNodes.length > 0;
        
        console.log(`   Direkt zu Update Nodes: ${hasDirectUpdate ? '✅ JA' : '❌ NEIN'}`);
        console.log(`   Direkt zu Rate Limiting: ${hasDirectRateLimiting ? '✅ JA' : '❌ NEIN'}`);
        console.log();
        
        // Prüfe ob Update Nodes nach Rate Limiting gehen
        if (hasDirectUpdate) {
          console.log('   📊 PRÜFE UPDATE → RATE LIMITING VERBINDUNGEN:\n');
          updateNodes.forEach(updateOutput => {
            const updateNode = nodes.find(n => n.name === updateOutput.node);
            if (updateNode) {
              const updateConn = connections[updateNode.name];
              const updateOutputs = updateConn && updateConn.main && updateConn.main[0] ? 
                updateConn.main[0].map(c => c.node) : [];
              
              const goesToRateLimiting = updateOutputs.some(name => 
                name.toLowerCase().includes('rate') || name.toLowerCase().includes('wait')
              );
              
              console.log(`      ${updateOutput.node}:`);
              console.log(`         → ${updateOutputs.join(', ') || 'KEINE OUTPUTS'}`);
              console.log(`         Geht zu Rate Limiting: ${goesToRateLimiting ? '✅' : '❌'}\n`);
            }
          });
        }
        
        // Empfehlung basierend auf User-Frage
        console.log('💡 EMPFOHLENE STRUKTUR (basierend auf Ihrer Frage):\n');
        console.log('   Route by Priority (z.B. Adult Flags)');
        console.log('   ↓');
        console.log('   Update Product Adult Flag');
        console.log('   ↓');
        console.log('   Rate Limiting');
        console.log('   ↓');
        console.log('   (Weiter zu nächster Route oder Aggregate)\n');
        
        console.log(`   Aktuelle Struktur hat ${outputs.length} direkte Verbindungen von Route by Priority.\n`);
        
      } else {
        console.log('   ❌ KEINE OUTPUTS!');
      }
    });
    
    // Finde alle Update Nodes die mit Route Nodes zusammenhängen könnten
    console.log('\n' + '='.repeat(80));
    console.log('📋 ALLE UPDATE NODES (für Kontext)');
    console.log('='.repeat(80) + '\n');
    
    const updateNodes = nodes.filter(n => n.name.toLowerCase().includes('update'));
    const updateNodeCategories = {};
    
    updateNodes.forEach(node => {
      const name = node.name.toLowerCase();
      let category = 'other';
      
      if (name.includes('adult')) category = 'adult';
      else if (name.includes('image')) category = 'images';
      else if (name.includes('text')) category = 'text';
      else if (name.includes('merchant')) category = 'merchant';
      else if (name.includes('country') || name.includes('multi')) category = 'country';
      else if (name.includes('gtin') || name.includes('ean') || name.includes('gtn')) category = 'gtin';
      
      if (!updateNodeCategories[category]) {
        updateNodeCategories[category] = [];
      }
      updateNodeCategories[category].push(node);
    });
    
    Object.keys(updateNodeCategories).forEach(category => {
      console.log(`📁 ${category.toUpperCase()} Update Nodes:`);
      updateNodeCategories[category].forEach(node => {
        const nodeConn = connections[node.name];
        const inputs = nodes.filter(n => {
          const conn = connections[n.name];
          return conn && conn.main && conn.main[0] && 
                 conn.main[0].some(c => c.node === node.name);
        });
        const outputs = nodeConn && nodeConn.main && nodeConn.main[0] ? 
          nodeConn.main[0].map(c => c.node) : [];
        
        console.log(`   ${node.name}`);
        console.log(`      ← Von: ${inputs.map(n => n.name).join(', ') || 'KEINE'}`);
        console.log(`      → ${outputs.join(', ') || 'KEINE'}\n`);
      });
    });
    
    console.log('='.repeat(80) + '\n');
    
    // Zusammenfassung
    console.log('📊 ZUSAMMENFASSUNG:\n');
    console.log(`   Route by Priority Nodes: ${routeNodes.length}`);
    console.log(`   Update Nodes: ${updateNodes.length}`);
    console.log(`   Kategorien: ${Object.keys(updateNodeCategories).length}\n`);
    
    console.log('💡 ANTWORT AUF IHRE FRAGE:\n');
    console.log('   Sie fragen: "Ist es richtig wenn ich von Route by Priority direkt auf');
    console.log('   Update Product Adult Flag ziehe und das gleiche mit Rate Limiting mache?"\n');
    console.log('   ✅ JA, das ist RICHTIG!');
    console.log('   Die Struktur sollte sein:\n');
    console.log('      Route by Priority (Adult Flags)');
    console.log('         ↓');
    console.log('      Update Product Adult Flag');
    console.log('         ↓');
    console.log('      Rate Limiting');
    console.log('         ↓');
    console.log('      (Weiter...)\n');
    console.log('   Für jede Kategorie (Adult, Images, Text, etc.) wiederholen!\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

analyzeRouteByPriorityStructure();
