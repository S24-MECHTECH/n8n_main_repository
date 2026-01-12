/**
 * CHECK WORKFLOW STATUS
 * Prüft ob Switch Nodes vorhanden sind und richtig verkabelt
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

const expectedSwitchNodes = [
  'Switch Action Handler Adult Flags',
  'Switch Action Handler Images',
  'Switch Action Handler Text',
  'Switch Action Handler Merchant Quality',
  'Switch Action Handler Multi Country',
  'Switch Action Handler GTN/EAN'
];

const expectedGeminiNodes = [
  'Gemini Error Handler Adult Flags',
  'Gemini Error Handler Images',
  'Gemini Error Handler Text',
  'Gemini Error Handler Merchant Quality',
  'Gemini Error Handler Multi Country',
  'Gemini Error Handler GTN/EAN'
];

const expectedRateLimitingNodes = [
  'Rate Limiting',
  'Rate Limiting Images',
  'Rate Limiting Text',
  'Rate Limiting Merchant',
  'Rate Limiting Country',
  'Rate Limiting GTN/EAN'
];

async function checkWorkflowStatus() {
  console.log('\n' + '='.repeat(80));
  console.log('WORKFLOW STATUS CHECK');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY nicht gefunden!');
    }
    
    // 1. Lade Workflow
    console.log('1. LADE WORKFLOW...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || {};
    
    console.log(`   Workflow: ${workflow.name}`);
    console.log(`   Active: ${workflow.active ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   Nodes: ${nodes.length}\n`);
    
    // 2. Prüfe Switch Nodes
    console.log('2. PRÜFE SWITCH NODES...\n');
    const switchNodes = nodes.filter(n => expectedSwitchNodes.includes(n.name));
    console.log(`   Gefunden: ${switchNodes.length}/${expectedSwitchNodes.length} Switch Nodes`);
    
    for (const expectedName of expectedSwitchNodes) {
      const found = nodes.find(n => n.name === expectedName);
      if (found) {
        console.log(`   ✅ ${expectedName}`);
      } else {
        console.log(`   ❌ ${expectedName} - FEHLT!`);
      }
    }
    console.log('');
    
    // 3. Prüfe Gemini Nodes
    console.log('3. PRÜFE GEMINI ERROR HANDLER NODES...\n');
    for (const expectedName of expectedGeminiNodes) {
      const found = nodes.find(n => n.name === expectedName);
      if (found) {
        const nodeType = found.type || 'unknown';
        console.log(`   ✅ ${expectedName} (${nodeType})`);
      } else {
        console.log(`   ❌ ${expectedName} - FEHLT!`);
      }
    }
    console.log('');
    
    // 4. Prüfe Rate Limiting → Gemini Connections
    console.log('4. PRÜFE CONNECTIONS: Rate Limiting → Gemini Error Handler...\n');
    let rateLimitingConnections = 0;
    for (const rateLimitName of expectedRateLimitingNodes) {
      const rateLimitNode = nodes.find(n => n.name === rateLimitName);
      if (!rateLimitNode) {
        console.log(`   ⚠️  ${rateLimitName} - Node nicht gefunden`);
        continue;
      }
      
      const nodeConnections = connections[rateLimitName]?.main?.[0] || [];
      const geminiName = expectedGeminiNodes.find(g => 
        g.includes(rateLimitName.replace('Rate Limiting', '').trim() || 'Adult Flags')
      );
      
      if (!geminiName) continue;
      
      const hasConnection = nodeConnections.some(conn => {
        const targetNode = typeof conn === 'object' ? conn.node : conn;
        return targetNode === geminiName;
      });
      
      if (hasConnection) {
        console.log(`   ✅ ${rateLimitName} → ${geminiName}`);
        rateLimitingConnections++;
      } else {
        console.log(`   ❌ ${rateLimitName} → ${geminiName} - NICHT VERBUNDEN!`);
      }
    }
    console.log(`\n   ${rateLimitingConnections}/${expectedRateLimitingNodes.length} Connections OK\n`);
    
    // 5. Prüfe Gemini → Switch Connections
    console.log('5. PRÜFE CONNECTIONS: Gemini Error Handler → Switch...\n');
    let geminiSwitchConnections = 0;
    for (let i = 0; i < expectedGeminiNodes.length; i++) {
      const geminiName = expectedGeminiNodes[i];
      const switchName = expectedSwitchNodes[i];
      
      const geminiNode = nodes.find(n => n.name === geminiName);
      const switchNode = nodes.find(n => n.name === switchName);
      
      if (!geminiNode) {
        console.log(`   ⚠️  ${geminiName} - Node nicht gefunden`);
        continue;
      }
      
      if (!switchNode) {
        console.log(`   ❌ ${switchName} - Switch Node nicht gefunden!`);
        continue;
      }
      
      const nodeConnections = connections[geminiName]?.main?.[0] || [];
      const hasConnection = nodeConnections.some(conn => {
        const targetNode = typeof conn === 'object' ? conn.node : conn;
        return targetNode === switchName;
      });
      
      if (hasConnection) {
        console.log(`   ✅ ${geminiName} → ${switchName}`);
        geminiSwitchConnections++;
      } else {
        console.log(`   ❌ ${geminiName} → ${switchName} - NICHT VERBUNDEN!`);
      }
    }
    console.log(`\n   ${geminiSwitchConnections}/${expectedGeminiNodes.length} Connections OK\n`);
    
    // 6. SUMMARY
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    const allSwitchNodesPresent = switchNodes.length === expectedSwitchNodes.length;
    const allConnectionsOK = rateLimitingConnections === expectedRateLimitingNodes.length && 
                             geminiSwitchConnections === expectedGeminiNodes.length;
    
    console.log(`Workflow Active: ${workflow.active ? '✅ JA' : '❌ NEIN'}`);
    console.log(`Switch Nodes: ${allSwitchNodesPresent ? '✅ ALLE VORHANDEN' : `❌ ${switchNodes.length}/${expectedSwitchNodes.length}`}`);
    console.log(`Rate Limiting → Gemini: ${rateLimitingConnections === expectedRateLimitingNodes.length ? '✅ OK' : `❌ ${rateLimitingConnections}/${expectedRateLimitingNodes.length}`}`);
    console.log(`Gemini → Switch: ${geminiSwitchConnections === expectedGeminiNodes.length ? '✅ OK' : `❌ ${geminiSwitchConnections}/${expectedGeminiNodes.length}`}`);
    console.log('');
    
    if (workflow.active && allSwitchNodesPresent && allConnectionsOK) {
      console.log('✅ WORKFLOW IST KORREKT KONFIGURIERT UND AKTIV!');
    } else {
      console.log('❌ WORKFLOW HAT PROBLEME!');
      if (!workflow.active) console.log('   → Workflow ist NICHT aktiviert!');
      if (!allSwitchNodesPresent) console.log('   → Switch Nodes fehlen oder sind falsch!');
      if (!allConnectionsOK) console.log('   → Connections sind falsch verkabelt!');
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    return {
      active: workflow.active,
      switchNodesCount: switchNodes.length,
      rateLimitingConnections,
      geminiSwitchConnections,
      allOK: workflow.active && allSwitchNodesPresent && allConnectionsOK
    };
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  checkWorkflowStatus();
}

module.exports = { checkWorkflowStatus };
