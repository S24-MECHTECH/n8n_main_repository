/**
 * ANALYZE PREPARE LOOPS
 * Analysiert die Verkabelung aller Prepare-Stränge
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

async function analyzePrepareLoops() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ANALYSE PREPARE LOOPS');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    // Finde alle Prepare-Nodes
    const prepareNodes = workflow.nodes.filter(n => 
      n.name.toLowerCase().includes('prepare') && 
      (n.name.toLowerCase().includes('loop') || n.name.toLowerCase().includes('strang'))
    );
    
    console.log(`📌 Gefundene Prepare-Nodes (${prepareNodes.length}):\n`);
    prepareNodes.forEach((node, i) => {
      console.log(`   ${i + 1}. ${node.name} (${node.type})`);
    });
    
    // Analysiere Connections
    console.log('\n🔗 VERKABELUNG ANALYSE:\n');
    
    const connections = workflow.connections || {};
    
    // Finde Startpunkt (wahrscheinlich "Prepare Products Loop" oder ähnlich)
    const prepareProductsLoop = workflow.nodes.find(n => 
      n.name.toLowerCase().includes('prepare') && 
      n.name.toLowerCase().includes('product') && 
      !n.name.toLowerCase().includes('gtn')
    );
    
    if (!prepareProductsLoop) {
      console.log('❌ Prepare Products Loop nicht gefunden!');
      return;
    }
    
    console.log(`📍 Startpunkt: ${prepareProductsLoop.name} (ID: ${prepareProductsLoop.id})\n`);
    
    // Funktion: Finde alle Nodes die von einem Node kommen
    function findOutputNodes(nodeId, connections) {
      const outputs = [];
      Object.keys(connections).forEach(sourceNodeId => {
        if (sourceNodeId === nodeId) {
          Object.values(connections[sourceNodeId]).forEach(outputConnections => {
            outputConnections.forEach(conn => {
              outputs.push(conn);
            });
          });
        }
      });
      return outputs;
    }
    
    // Funktion: Finde alle Nodes die zu einem Node gehen
    function findInputNodes(nodeId, nodes) {
      const inputs = [];
      const connections = workflow.connections || {};
      Object.keys(connections).forEach(sourceNodeId => {
        Object.values(connections[sourceNodeId]).forEach(outputConnections => {
          outputConnections.forEach(conn => {
            if (conn.node === nodeId) {
              const sourceNode = nodes.find(n => n.id === sourceNodeId);
              if (sourceNode) inputs.push(sourceNode);
            }
          });
        });
      });
      return inputs;
    }
    
    // Funktion: Finde Nachfolger
    function findNextNodes(nodeId) {
      const connections = workflow.connections || {};
      const nextNodes = [];
      
      if (connections[nodeId]) {
        Object.values(connections[nodeId]).forEach(outputConnections => {
          outputConnections.forEach(conn => {
            const targetNode = workflow.nodes.find(n => n.id === conn.node);
            if (targetNode) {
              nextNodes.push({
                node: targetNode,
                outputIndex: conn.output || 0,
                inputIndex: conn.input || 0
              });
            }
          });
        });
      }
      
      return nextNodes;
    }
    
    // Analysiere Flow von Prepare Products Loop
    console.log('📊 FLOW-ANALYSE:\n');
    
    function traceFlow(nodeId, visited = new Set(), depth = 0) {
      if (visited.has(nodeId)) {
        return;
      }
      visited.add(nodeId);
      
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      const indent = '  '.repeat(depth);
      const nodeType = node.type.includes('code') ? 'CODE' : 
                      node.type.includes('http') ? 'HTTP' :
                      node.type.includes('set') ? 'SET' :
                      node.type.includes('switch') ? 'SWITCH' :
                      node.type.includes('wait') ? 'WAIT' :
                      node.type.includes('if') ? 'IF' :
                      node.type;
      
      console.log(`${indent}${node.name} [${nodeType}]`);
      
      const nextNodes = findNextNodes(nodeId);
      if (nextNodes.length === 0) {
        console.log(`${indent}  └─ ENDE (keine Ausgänge)`);
      } else {
        nextNodes.forEach((next, i) => {
          const isLast = i === nextNodes.length - 1;
          const prefix = isLast ? '└─' : '├─';
          console.log(`${indent}  ${prefix}─> ${next.node.name} [output:${next.outputIndex}, input:${next.inputIndex}]`);
          
          // Nur weiterverfolgen wenn es ein Prepare-Node ist oder Rate Limiting
          if (next.node.name.toLowerCase().includes('prepare') || 
              next.node.name.toLowerCase().includes('rate limiting') ||
              next.node.name.toLowerCase().includes('update') ||
              depth < 5) {
            traceFlow(next.node.id, visited, depth + 1);
          }
        });
      }
    }
    
    traceFlow(prepareProductsLoop.id);
    
    // Finde alle Prepare-Loops und deren Position
    console.log('\n\n🔍 PREPARE-LOOPS STRUKTUR:\n');
    
    const prepareLoops = workflow.nodes.filter(n => 
      n.name.toLowerCase().includes('prepare') && 
      (n.name.toLowerCase().includes('loop') || n.type.includes('code'))
    ).sort((a, b) => a.name.localeCompare(b.name));
    
    prepareLoops.forEach(loop => {
      const inputs = findInputNodes(loop.id, workflow.nodes);
      const outputs = findNextNodes(loop.id);
      
      console.log(`\n📌 ${loop.name}:`);
      console.log(`   Inputs: ${inputs.length > 0 ? inputs.map(n => n.name).join(', ') : 'KEINE'}`);
      console.log(`   Outputs: ${outputs.length > 0 ? outputs.map(n => n.name).join(', ') : 'KEINE'}`);
    });
    
    // Problem-Analyse
    console.log('\n\n⚠️  PROBLEM-ANALYSE:\n');
    
    // Prüfe ob Prepare Products Loop direkt zu Rate Limiting geht, statt zu nächstem Prepare-Loop
    const productsLoopOutputs = findNextNodes(prepareProductsLoop.id);
    const goesToRateLimiting = productsLoopOutputs.some(o => 
      o.node.name.toLowerCase().includes('rate limiting')
    );
    const goesToNextPrepare = productsLoopOutputs.some(o => 
      o.node.name.toLowerCase().includes('prepare') && 
      !o.node.name.toLowerCase().includes('product')
    );
    
    if (goesToRateLimiting && !goesToNextPrepare) {
      console.log('❌ PROBLEM GEFUNDEN:');
      console.log('   Prepare Products Loop geht direkt zu Rate Limiting!');
      console.log('   Es sollte zu den anderen Prepare-Loops gehen (Images, Text, etc.)\n');
      console.log('💡 LÖSUNG:');
      console.log('   Prepare Products Loop → Prepare Images Loop → Prepare Text Loop → ... → Rate Limiting\n');
    }
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

analyzePrepareLoops();

