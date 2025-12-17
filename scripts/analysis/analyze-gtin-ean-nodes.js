/**
 * ANALYZE GTIN/EAN NODES
 * Analysiert die neuen GTIN/EAN Nodes und zeigt fehlende Konfigurationen
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

async function analyzeGtinEanNodes() {
  try {
    console.log('\n🔍 Analysiere GTIN/EAN Nodes...\n');
    
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || {};
    
    // Finde GTIN/EAN Nodes
    const gtinNodes = nodes.filter(n => 
      n.name.includes('GTIN') || 
      n.name.includes('GTN') || 
      n.name.includes('EAN')
    );
    
    console.log(`✅ ${gtinNodes.length} GTIN/EAN Nodes gefunden:\n`);
    gtinNodes.forEach(n => {
      console.log(`   - ${n.name} (${n.type})`);
    });
    
    // Finde "Route by Priority" Node
    const routeNode = nodes.find(n => n.name.includes('Route by Priority'));
    
    if (routeNode) {
      console.log(`\n📌 Route by Priority Node gefunden`);
      console.log(`   Type: ${routeNode.type}`);
      console.log(`   Parameters: ${JSON.stringify(Object.keys(routeNode.parameters || {}), null, 2)}`);
      
      // Prüfe Routing Rules
      if (routeNode.parameters.rules) {
        console.log(`\n   Routing Rules:`);
        routeNode.parameters.rules.values.forEach((rule, idx) => {
          console.log(`   ${idx + 1}. ${rule.conditions ? JSON.stringify(rule.conditions, null, 2) : 'Keine Bedingungen'}`);
        });
      }
    }
    
    // Analysiere Prepare GTIN/EAN
    const prepareNode = gtinNodes.find(n => n.name.includes('Prepare'));
    if (prepareNode) {
      console.log(`\n📌 Prepare GTIN/EAN Node:`);
      console.log(`   Type: ${prepareNode.type}`);
      if (prepareNode.type === 'n8n-nodes-base.code') {
        console.log(`   Code vorhanden: ${prepareNode.parameters.jsCode ? 'Ja' : 'NEIN ❌'}`);
        if (prepareNode.parameters.jsCode) {
          console.log(`   Code Länge: ${prepareNode.parameters.jsCode.length} Zeichen`);
        }
      }
    }
    
    // Analysiere Update GTIN/EAN
    const updateNode = gtinNodes.find(n => n.name.includes('Update'));
    if (updateNode) {
      console.log(`\n📌 Update GTIN/EAN Node:`);
      console.log(`   Type: ${updateNode.type}`);
      if (updateNode.type === 'n8n-nodes-base.httpRequest') {
        console.log(`   URL: ${updateNode.parameters.url || 'FEHLT ❌'}`);
        console.log(`   Method: ${updateNode.parameters.method || 'FEHLT ❌'}`);
        console.log(`   Body Parameters: ${updateNode.parameters.bodyParameters ? 'Vorhanden' : 'FEHLT ❌'}`);
        
        if (updateNode.parameters.bodyParameters && updateNode.parameters.bodyParameters.parameters) {
          console.log(`   Body Parameter Namen:`);
          updateNode.parameters.bodyParameters.parameters.forEach(param => {
            console.log(`     - ${param.name}: ${param.value || 'LEER ❌'}`);
          });
        }
      }
    }
    
    // Analysiere Rate Limiting GTIN/EAN
    const rateLimitNode = gtinNodes.find(n => n.name.includes('Rate Limit'));
    if (rateLimitNode) {
      console.log(`\n📌 Rate Limiting GTIN/EAN Node:`);
      console.log(`   Type: ${rateLimitNode.type}`);
      if (rateLimitNode.type === 'n8n-nodes-base.wait') {
        console.log(`   Amount: ${rateLimitNode.parameters.amount || 'FEHLT ❌'}`);
        console.log(`   Unit: ${rateLimitNode.parameters.unit || 'FEHLT ❌'}`);
      }
    }
    
    // Prüfe Connections
    console.log(`\n🔗 Connections:\n`);
    gtinNodes.forEach(node => {
      const conns = connections[node.name];
      if (conns) {
        console.log(`   ${node.name}:`);
        Object.entries(conns).forEach(([outputType, connArrays]) => {
          if (connArrays && connArrays[0]) {
            connArrays[0].forEach(conn => {
              console.log(`      → ${conn.node}`);
            });
          }
        });
      }
    });
    
    // Prüfe Input-Connections
    console.log(`\n   Input Connections:\n`);
    gtinNodes.forEach(node => {
      let hasInput = false;
      Object.entries(connections).forEach(([sourceNode, sourceConns]) => {
        if (sourceNode !== node.name && sourceConns) {
          Object.values(sourceConns).forEach(connArrays => {
            if (connArrays) {
              connArrays.forEach(connArray => {
                if (connArray) {
                  connArray.forEach(conn => {
                    if (conn.node === node.name) {
                      if (!hasInput) {
                        console.log(`   ${node.name}:`);
                        hasInput = true;
                      }
                      console.log(`      ← ${sourceNode}`);
                    }
                  });
                }
              });
            }
          });
        }
      });
      if (!hasInput) {
        console.log(`   ${node.name}: ❌ KEINE EINGANGSVERBINDUNG`);
      }
    });
    
    return { workflow, gtinNodes, prepareNode, updateNode, rateLimitNode, routeNode };
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    throw error;
  }
}

analyzeGtinEanNodes().then(() => {
  console.log('\n✅ Analyse abgeschlossen\n');
}).catch(err => {
  console.error('\n❌ Fehler:', err);
  process.exit(1);
});
