/**
 * ANALYZE GET WORKFLOW STATUS REAL NODE
 * Analysiert den Node der 53 Items am Error-Ausgang hat
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

async function analyzeWorkflowStatusReal() {
  try {
    console.log('\n🔍 Analysiere Get Workflow Status REAL Node...\n');
    
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || {};
    
    // Finde "Get Workflow Status REAL" Node
    const statusNode = nodes.find(n => 
      n.name.includes('Get Workflow Status REAL') || 
      n.name.includes('Workflow Status REAL')
    );
    
    if (!statusNode) {
      console.log('❌ Node "Get Workflow Status REAL" nicht gefunden!');
      console.log('\nVerfügbare Nodes mit "Status":');
      nodes.filter(n => n.name.toLowerCase().includes('status')).forEach(n => {
        console.log(`   - ${n.name}`);
      });
      return;
    }
    
    console.log(`✅ Node gefunden: ${statusNode.name}`);
    console.log(`   Type: ${statusNode.type}`);
    console.log(`   ID: ${statusNode.id}\n`);
    
    // Analysiere Node-Konfiguration
    console.log('📋 NODE KONFIGURATION:\n');
    
    if (statusNode.type === 'n8n-nodes-base.httpRequest') {
      console.log('🔗 HTTP Request Node\n');
      
      // URL
      console.log(`   URL: ${statusNode.parameters.url || 'FEHLT ❌'}`);
      
      // Method
      console.log(`   Method: ${statusNode.parameters.method || 'FEHLT ❌'}`);
      
      // Authentication
      console.log(`   Authentication: ${statusNode.parameters.authentication || 'Keine'}`);
      if (statusNode.parameters.authentication) {
        console.log(`   Auth Type: ${statusNode.parameters.authentication || 'N/A'}`);
      }
      
      // Headers
      if (statusNode.parameters.options?.headers) {
        console.log(`\n   Headers:`);
        Object.entries(statusNode.parameters.options.headers.values).forEach(([key, value]) => {
          console.log(`     ${key}: ${value || 'LEER ❌'}`);
        });
      } else {
        console.log(`   Headers: FEHLT ❌`);
      }
      
      // Send Headers
      if (statusNode.parameters.sendHeaders) {
        console.log(`   Send Headers: ${statusNode.parameters.sendHeaders}`);
      }
      
      // Body
      if (statusNode.parameters.bodyParameters) {
        console.log(`\n   Body Parameters:`);
        if (statusNode.parameters.bodyParameters.parameters) {
          statusNode.parameters.bodyParameters.parameters.forEach(param => {
            console.log(`     ${param.name}: ${param.value || 'LEER ❌'}`);
          });
        }
      } else if (statusNode.parameters.jsonParameters) {
        console.log(`\n   JSON Body: ${statusNode.parameters.jsonBody || 'FEHLT ❌'}`);
      } else {
        console.log(`\n   Body: Kein Body (GET Request?)`);
      }
      
      // Options
      if (statusNode.parameters.options) {
        console.log(`\n   Options:`);
        if (statusNode.parameters.options.response) {
          console.log(`     Response Format: ${statusNode.parameters.options.response.response?.responseFormat || 'N/A'}`);
          console.log(`     Full Response: ${statusNode.parameters.options.response.response?.fullResponse || 'false'}`);
        }
        if (statusNode.parameters.options.timeout) {
          console.log(`     Timeout: ${statusNode.parameters.options.timeout || 'N/A'}`);
        }
        if (statusNode.parameters.options.retry) {
          console.log(`     Retry: ${JSON.stringify(statusNode.parameters.options.retry)}`);
        }
      }
      
    } else if (statusNode.type === 'n8n-nodes-base.code') {
      console.log('💻 Code Node\n');
      console.log(`   Code vorhanden: ${statusNode.parameters.jsCode ? 'Ja' : 'NEIN ❌'}`);
      if (statusNode.parameters.jsCode) {
        console.log(`   Code Länge: ${statusNode.parameters.jsCode.length} Zeichen`);
        console.log(`   Code (erste 500 Zeichen):`);
        console.log(`   ${statusNode.parameters.jsCode.substring(0, 500)}...`);
      }
    } else {
      console.log(`   Unbekannter Node Type: ${statusNode.type}`);
      console.log(`   Parameters: ${JSON.stringify(Object.keys(statusNode.parameters || {}), null, 2)}`);
    }
    
    // Prüfe Connections
    console.log(`\n🔗 CONNECTIONS:\n`);
    
    const conns = connections[statusNode.name];
    if (conns) {
      Object.entries(conns).forEach(([outputType, connArrays]) => {
        if (connArrays && connArrays.length > 0) {
          connArrays.forEach((connArray, idx) => {
            if (connArray && connArray.length > 0) {
              console.log(`   Output [${outputType}][${idx}]:`);
              connArray.forEach(conn => {
                console.log(`      → ${conn.node}`);
              });
            }
          });
        }
      });
    }
    
    // Prüfe Input-Connections
    console.log(`\n   Input:`);
    let hasInput = false;
    Object.entries(connections).forEach(([sourceNode, sourceConns]) => {
      if (sourceNode !== statusNode.name && sourceConns) {
        Object.values(sourceConns).forEach(connArrays => {
          if (connArrays) {
            connArrays.forEach(connArray => {
              if (connArray) {
                connArray.forEach(conn => {
                  if (conn.node === statusNode.name) {
                    if (!hasInput) {
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
      console.log(`      ❌ KEINE EINGANGSVERBINDUNG`);
    }
    
    // Prüfe auf Error-Ausgang
    if (conns && conns.main) {
      const errorOutput = conns.main.find(arr => arr && arr.some(c => c.node.includes('Error') || c.node.includes('error')));
      if (errorOutput) {
        console.log(`\n⚠️  ERROR AUSGANG GEFUNDEN:`);
        errorOutput.forEach(conn => {
          console.log(`   → ${conn.node}`);
        });
      }
    }
    
    return { workflow, statusNode };
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
}

analyzeWorkflowStatusReal().then(() => {
  console.log('\n✅ Analyse abgeschlossen\n');
}).catch(err => {
  console.error('\n❌ Fehler:', err);
  process.exit(1);
});
