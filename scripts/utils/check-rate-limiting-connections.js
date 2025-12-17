/**
 * CHECK RATE LIMITING CONNECTIONS
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

async function checkConnections() {
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const connections = workflow.connections || {};
    
    // Finde alle Rate Limiting Nodes
    const rateLimitingNodes = Object.keys(connections).filter(name => 
      name.includes('Rate Limiting') || name.includes('Rate Limit')
    );
    
    console.log('\n🔍 RATE LIMITING VERKABELUNG:\n');
    
    rateLimitingNodes.forEach(nodeName => {
      const conns = connections[nodeName];
      console.log(`\n📌 ${nodeName}:`);
      
      if (conns && conns.main && conns.main[0]) {
        conns.main[0].forEach(conn => {
          console.log(`   → ${conn.node}`);
          
          if (conn.node === 'Aggregate Results2') {
            console.log('   ✅ Verbunden mit Aggregate Results2');
          } else if (conn.node.includes('Log')) {
            console.log('   ⚠️  Verbunden mit Log-Node (direktes Logging)');
          }
        });
      } else {
        console.log('   ❌ Keine ausgehenden Verbindungen');
      }
    });
    
    // Prüfe Aggregate Results2
    if (connections['Aggregate Results2']) {
      console.log('\n📌 Aggregate Results2:');
      const aggConns = connections['Aggregate Results2'];
      if (aggConns && aggConns.main && aggConns.main[0]) {
        aggConns.main[0].forEach(conn => {
          console.log(`   → ${conn.node}`);
        });
      }
    }
    
    // Prüfe Log to Shop Sheet
    if (connections['Log to Shop Sheet']) {
      console.log('\n📌 Log to Shop Sheet Input:');
      // Prüfe welche Nodes zu Log to Shop Sheet führen
      Object.entries(connections).forEach(([sourceNode, sourceConns]) => {
        if (sourceConns && sourceConns.main) {
          sourceConns.main.forEach(connArray => {
            if (connArray) {
              connArray.forEach(conn => {
                if (conn.node === 'Log to Shop Sheet') {
                  console.log(`   ← ${sourceNode}`);
                  if (sourceNode.includes('Rate Limiting')) {
                    console.log('   ⚠️  Direkter Input von Rate Limiting');
                  }
                }
              });
            }
          });
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
  }
}

checkConnections();
