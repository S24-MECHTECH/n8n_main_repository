/**
 * ANALYZE WORKFLOW CONNECTIONS
 * Analysiert die Verbindungen (Verkabelung) des Workflows
 */

const https = require('https');
const http = require('http');

// Konfiguration
const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const N8N_API_KEY = process.env.N8N_API_KEY || process.argv[2];
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5'; // ***MECHTECH_MERCHANT_CENTER_ADMIN

if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY fehlt!');
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
 * Analysiere Connections
 */
function analyzeConnections(workflow) {
  const connections = workflow.connections || {};
  const nodes = workflow.nodes || [];
  
  // Erstelle Node-Map
  const nodeMap = {};
  nodes.forEach(node => {
    nodeMap[node.name] = node;
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CONNECTION ANALYSE');
  console.log('='.repeat(80));
  
  // Analysiere jede Node
  const issues = [];
  const nodeOutputs = {}; // Welche Nodes haben Outputs?
  const nodeInputs = {};  // Welche Nodes erwarten Inputs?
  
  // 1. Finde alle Nodes die Input erwarten (nicht Trigger)
  nodes.forEach(node => {
    const nodeType = node.type;
    const isTrigger = nodeType.includes('Trigger') || nodeType.includes('Webhook') || 
                      nodeType.includes('Manual') || nodeType === 'n8n-nodes-base.start';
    
    if (!isTrigger) {
      nodeInputs[node.name] = true;
    }
    
    // Prüfe ob Node Output hat (außer End-Nodes)
    const hasOutput = !nodeType.includes('End') && !nodeType.includes('Stop');
    if (hasOutput) {
      nodeOutputs[node.name] = true;
    }
  });
  
  console.log(`\n📊 Nodes: ${nodes.length}`);
  console.log(`   Nodes mit Output: ${Object.keys(nodeOutputs).length}`);
  console.log(`   Nodes die Input erwarten: ${Object.keys(nodeInputs).length}`);
  
  // 2. Prüfe Connections
  console.log('\n🔗 CONNECTIONS ANALYSE:\n');
  
  // Für jede Node die Output hat, prüfe ob sie verbunden ist
  Object.keys(nodeOutputs).forEach(nodeName => {
    const nodeConn = connections[nodeName];
    
    if (!nodeConn) {
      // Node hat keine Connections definiert
      if (nodeName !== 'Manual Trigger' && !nodeName.includes('Trigger')) {
        issues.push({
          severity: 'warning',
          node: nodeName,
          problem: 'Node hat keine ausgehenden Connections',
          type: nodeMap[nodeName]?.type
        });
      }
    } else {
      // Prüfe ob Connections gültig sind
      Object.entries(nodeConn).forEach(([outputType, outputConns]) => {
        if (outputConns && outputConns.length > 0) {
          outputConns.forEach((connArray, index) => {
            if (connArray && connArray.length > 0) {
              connArray.forEach(conn => {
                if (!nodeMap[conn.node]) {
                  issues.push({
                    severity: 'critical',
                    node: nodeName,
                    problem: `Verbunden mit nicht existierender Node: ${conn.node}`,
                    connection: conn
                  });
                }
              });
            }
          });
        }
      });
    }
  });
  
  // 3. Prüfe Nodes die Input erwarten, aber keine Eingangsverbindung haben
  Object.keys(nodeInputs).forEach(nodeName => {
    // Suche ob irgendeine Node zu dieser Node verbunden ist
    let hasInput = false;
    Object.entries(connections).forEach(([sourceNode, sourceConns]) => {
      if (sourceNode !== nodeName && sourceConns) {
        Object.values(sourceConns).forEach(connArrays => {
          if (connArrays) {
            connArrays.forEach(connArray => {
              if (connArray) {
                connArray.forEach(conn => {
                  if (conn.node === nodeName) {
                    hasInput = true;
                  }
                });
              }
            });
          }
        });
      }
    });
    
    if (!hasInput) {
      issues.push({
        severity: 'critical',
        node: nodeName,
        problem: 'Node erwartet Input, hat aber keine Eingangsverbindung',
        type: nodeMap[nodeName]?.type
      });
    }
  });
  
  // 4. Zeige kritische Nodes (die wahrscheinlich zum "Strang 53" gehören)
  console.log('\n🎯 KRITISCHE NODES (für Adult Flags):\n');
  
  const criticalNodes = [
    'Shop Configuration2',
    'Gemini Daily Decision',
    'Get Merchant Products2',
    'Analyze Products2',
    'Prepare Products Loop',
    'Update Product Adult Flag',
    'Log to Shop Sheet'
  ];
  
  criticalNodes.forEach(nodeName => {
    const node = nodeMap[nodeName];
    if (node) {
      const nodeConn = connections[nodeName];
      console.log(`\n📌 ${nodeName} (${node.type}):`);
      
      if (nodeConn) {
        Object.entries(nodeConn).forEach(([outputType, connArrays]) => {
          if (connArrays && connArrays.length > 0) {
            connArrays.forEach((connArray, index) => {
              if (connArray && connArray.length > 0) {
                console.log(`   Output [${outputType}][${index}]:`);
                connArray.forEach(conn => {
                  console.log(`      → ${conn.node} (type: ${conn.type}, index: ${conn.index})`);
                });
              }
            });
          } else {
            console.log(`   ⚠️  Output [${outputType}]: KEINE VERBINDUNGEN`);
          }
        });
      } else {
        console.log(`   ⚠️  KEINE AUSGEHENDEN VERBINDUNGEN`);
      }
      
      // Prüfe Eingangsverbindungen
      let hasInput = false;
      Object.entries(connections).forEach(([sourceNode, sourceConns]) => {
        if (sourceNode !== nodeName && sourceConns) {
          Object.values(sourceConns).forEach(connArrays => {
            if (connArrays) {
              connArrays.forEach(connArray => {
                if (connArray) {
                  connArray.forEach(conn => {
                    if (conn.node === nodeName) {
                      if (!hasInput) {
                        console.log(`   Input:`);
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
      
      if (!hasInput && nodeName !== 'Manual Trigger') {
        console.log(`   ⚠️  KEINE EINGANGSVERBINDUNG`);
      }
    } else {
      console.log(`\n❌ ${nodeName}: NODE NICHT GEFUNDEN`);
    }
  });
  
  // 5. Zeige Issues
  if (issues.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log(`❌ ${issues.length} PROBLEME GEFUNDEN:\n`);
    
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const warnings = issues.filter(i => i.severity === 'warning');
    
    if (criticalIssues.length > 0) {
      console.log(`🔴 KRITISCHE PROBLEME (${criticalIssues.length}):\n`);
      criticalIssues.forEach(issue => {
        console.log(`   Node: ${issue.node}`);
        console.log(`   Problem: ${issue.problem}`);
        if (issue.type) console.log(`   Type: ${issue.type}`);
        if (issue.connection) console.log(`   Connection: ${JSON.stringify(issue.connection)}`);
        console.log('');
      });
    }
    
    if (warnings.length > 0) {
      console.log(`⚠️  WARNUNGEN (${warnings.length}):\n`);
      warnings.forEach(issue => {
        console.log(`   Node: ${issue.node}`);
        console.log(`   Problem: ${issue.problem}`);
        console.log('');
      });
    }
  } else {
    console.log('\n✅ Keine Connection-Probleme gefunden!');
  }
  
  return issues;
}

/**
 * Hauptfunktion
 */
async function analyzeWorkflow() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 WORKFLOW CONNECTION ANALYSE');
  console.log('='.repeat(80));
  console.log(`Workflow ID: ${WORKFLOW_ID}`);
  console.log(`n8n URL: ${N8N_URL}\n`);
  
  try {
    // Hole Workflow
    console.log('📥 Lade Workflow...');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    console.log(`✅ Workflow geladen: ${workflow.name}`);
    console.log(`   Nodes: ${workflow.nodes?.length || 0}`);
    console.log(`   Connections: ${Object.keys(workflow.connections || {}).length}\n`);
    
    // Analysiere Connections
    const issues = analyzeConnections(workflow);
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 ZUSAMMENFASSUNG');
    console.log('='.repeat(80));
    console.log(`   Kritische Probleme: ${issues.filter(i => i.severity === 'critical').length}`);
    console.log(`   Warnungen: ${issues.filter(i => i.severity === 'warning').length}\n`);
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Ausführung
analyzeWorkflow();
