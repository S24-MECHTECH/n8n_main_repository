/**
 * DEBUG CONNECTIONS - Zeigt rohe Connections-Struktur
 */

const https = require('https');
const http = require('http');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const N8N_API_KEY = process.argv[2];
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

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

async function debugConnections() {
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const connections = workflow.connections || {};
    
    console.log('\n' + '='.repeat(80));
    console.log('DEBUG: CONNECTIONS STRUKTUR');
    console.log('='.repeat(80));
    
    // Zeige alle Nodes mit Connections
    for (const [nodeName, nodeConnections] of Object.entries(connections)) {
      console.log(`\n📦 Node: ${nodeName}`);
      console.log(JSON.stringify(nodeConnections, null, 2));
      
      // Suche speziell nach Error-Connections
      if (nodeConnections.main && Array.isArray(nodeConnections.main)) {
        nodeConnections.main.forEach((output, index) => {
          if (index === 1 && Array.isArray(output) && output.length > 0) {
            console.log(`\n   🔴 ERROR OUTPUT (Index ${index}) gefunden:`);
            console.log(JSON.stringify(output, null, 2));
          }
        });
      }
    }
    
    // Suche nach kritischen Nodes
    const criticalNodes = ['Prepare Products Loop', 'Update Product Adult Flag', 'Update Product Images', 
                          'Update Product Text', 'Get Merchant Products2'];
    
    console.log('\n' + '='.repeat(80));
    console.log('KRITISCHE NODES:');
    console.log('='.repeat(80));
    
    for (const nodeName of criticalNodes) {
      const conn = connections[nodeName];
      if (conn) {
        console.log(`\n📦 ${nodeName}:`);
        console.log(JSON.stringify(conn, null, 2));
      } else {
        console.log(`\n❌ ${nodeName}: Keine Connections gefunden`);
      }
    }
    
  } catch (error) {
    console.error('Fehler:', error.message);
    if (error.stack) console.error(error.stack);
  }
}

debugConnections();
