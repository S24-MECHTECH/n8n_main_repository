/**
 * CHECK SWITCH OUTPUT CONNECTIONS
 * Prüft ob Switch Nodes Outputs verbunden sind
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

function getApiKey() {
  if (process.env.N8N_API_KEY) return process.env.N8N_API_KEY;
  
  const configPaths = [
    path.join(__dirname, '..', '..', '.cursor', 'mcp.json'),
    path.join(__dirname, '..', '..', '.cursor', 'FUNKTIONIERENDE_CONFIG.json'),
    path.join(process.env.USERPROFILE || process.env.HOME, '.cursor', 'mcp.json'),
    path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json')
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.mcpServers?.['n8n-mcp']?.env?.N8N_API_KEY) {
          return config.mcpServers['n8n-mcp'].env.N8N_API_KEY;
        }
      }
    } catch (error) {}
  }
  return null;
}

const N8N_API_KEY = getApiKey();

function n8nRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, N8N_URL);
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

const switchNodes = [
  'Switch Action Handler Adult Flags',
  'Switch Action Handler Images',
  'Switch Action Handler Text',
  'Switch Action Handler Merchant Quality',
  'Switch Action Handler Multi Country',
  'Switch Action Handler GTN/EAN'
];

async function checkSwitchOutputs() {
  console.log('\n' + '='.repeat(80));
  console.log('CHECK SWITCH OUTPUT CONNECTIONS');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY nicht gefunden!');
    }
    
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || {};
    
    console.log('PRÜFE SWITCH OUTPUT CONNECTIONS...\n');
    
    let totalOutputs = 0;
    let connectedOutputs = 0;
    
    for (const switchName of switchNodes) {
      const switchNode = nodes.find(n => n.name === switchName);
      if (!switchNode) {
        console.log(`❌ ${switchName} - Node nicht gefunden!\n`);
        continue;
      }
      
      console.log(`📋 ${switchName}:`);
      
      // Switch Nodes haben 4 Outputs: RETRY (0), AUTO_FIX (1), REROUTE (2), ALERT (3/fallback)
      const switchConnections = connections[switchName]?.main || [];
      
      for (let outputIndex = 0; outputIndex < 4; outputIndex++) {
        totalOutputs++;
        const outputConnections = switchConnections[outputIndex] || [];
        
        const outputNames = ['RETRY', 'AUTO_FIX', 'REROUTE', 'ALERT'];
        const outputName = outputNames[outputIndex] || `Output ${outputIndex}`;
        
        if (outputConnections.length > 0) {
          console.log(`   ✅ ${outputName} (Output ${outputIndex}): ${outputConnections.length} Connection(s)`);
          outputConnections.forEach(conn => {
            const targetNode = typeof conn === 'object' ? conn.node : conn;
            console.log(`      → ${targetNode}`);
          });
          connectedOutputs++;
        } else {
          console.log(`   ❌ ${outputName} (Output ${outputIndex}): NICHT VERBUNDEN!`);
        }
      }
      console.log('');
    }
    
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    console.log(`Switch Outputs: ${connectedOutputs}/${totalOutputs} verbunden`);
    
    if (connectedOutputs === 0) {
      console.log('\n❌ PROBLEM IDENTIFIZIERT:');
      console.log('   → Switch Nodes haben KEINE Output Connections!');
      console.log('   → Workflow kann nicht weiterlaufen nach Switch Nodes!');
      console.log('   → MUSS VERBUNDEN WERDEN:\n');
      console.log('     RETRY Output → Zurück zu Rate Limiting');
      console.log('     AUTO_FIX Output → Zurück zu Rate Limiting');
      console.log('     REROUTE Output → Zu alternativem Handler');
      console.log('     ALERT Output → Zu Alert Handler/Log\n');
    } else if (connectedOutputs < totalOutputs) {
      console.log('\n⚠️  PROBLEM:');
      console.log(`   → ${totalOutputs - connectedOutputs} Switch Output(s) nicht verbunden!`);
      console.log('   → Workflow kann bei einigen Actions nicht weiterlaufen!\n');
    } else {
      console.log('\n✅ ALLE SWITCH OUTPUTS SIND VERBUNDEN!\n');
    }
    
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  checkSwitchOutputs();
}

module.exports = { checkSwitchOutputs };
