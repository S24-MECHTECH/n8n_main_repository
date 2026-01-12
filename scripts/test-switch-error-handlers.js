/**
 * 🧪 TEST SWITCH ERROR HANDLERS
 * Testet die Switch Error Handler mit 5 Test-Artikeln
 * Prüft ob alle Connections korrekt sind
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

const strandDefinitions = [
  { name: 'Adult', updateNode: 'Update Product Adult Flag' },
  { name: 'Images', updateNode: 'Update Product Images' },
  { name: 'Text', updateNode: 'Update Product Text' },
  { name: 'Quality', updateNode: 'Update Merchant Settings' },
  { name: 'Country', updateNode: 'Update Country Feeds' },
  { name: 'GTN/EAN', updateNode: 'Update GTN/EAN' }
];

async function testSwitchHandlers() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST SWITCH ERROR HANDLERS');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      console.error('❌ N8N_API_KEY fehlt!');
      process.exit(1);
    }
    
    // 1. Workflow laden und analysieren
    console.log('📥 Lade Workflow...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || {};
    
    console.log(`✅ Workflow: ${workflow.name}`);
    console.log(`   Nodes: ${nodes.length}`);
    console.log(`   Active: ${workflow.active ? '✅ Ja' : '❌ Nein'}\n`);
    
    // 2. Prüfe Switch Nodes
    console.log('🔍 PRÜFE SWITCH NODES:\n');
    
    let allOk = true;
    const switchNodes = [];
    
    for (const strand of strandDefinitions) {
      const switchNode = nodes.find(n => 
        n.name === `Error Handler ${strand.name}` && 
        n.type === 'n8n-nodes-base.switch'
      );
      
      if (switchNode) {
        switchNodes.push({ strand: strand.name, node: switchNode });
        
        // Prüfe Switch Konfiguration
        const params = switchNode.parameters || {};
        const hasMode = params.mode === 'rules';
        const hasRules = params.rules && params.rules.values && params.rules.values.length === 3;
        const hasFallback = params.fallbackOutput === 'ALERT';
        
        console.log(`📋 ${strand.name}:`);
        console.log(`   Mode: ${hasMode ? '✅' : '❌'} ${params.mode || 'undefined'}`);
        console.log(`   Rules: ${hasRules ? '✅' : '❌'} ${params.rules?.values?.length || 0}/3`);
        console.log(`   Fallback: ${hasFallback ? '✅' : '❌'} ${params.fallbackOutput || 'undefined'}`);
        
        if (!hasMode || !hasRules || !hasFallback) {
          allOk = false;
        }
        console.log('');
      } else {
        console.log(`❌ ${strand.name}: Switch Node nicht gefunden!\n`);
        allOk = false;
      }
    }
    
    // 3. Prüfe Connections
    console.log('🔗 PRÜFE CONNECTIONS:\n');
    
    for (const { strand, node: switchNode } of switchNodes) {
      const strandDef = strandDefinitions.find(s => s.name === strand);
      const updateNode = nodes.find(n => n.name === strandDef.updateNode);
      
      if (!updateNode) {
        console.log(`   ⚠️  ${strand}: Update Node nicht gefunden`);
        continue;
      }
      
      // Prüfe Input Connection (Update → Switch)
      const inputConn = connections[strandDef.updateNode]?.main?.[0]?.some(conn => 
        (typeof conn === 'object' && conn.node === switchNode.name) ||
        (typeof conn === 'string' && conn === switchNode.name)
      );
      
      console.log(`📋 ${strand}:`);
      console.log(`   Input (${strandDef.updateNode} → Switch): ${inputConn ? '✅' : '❌'}`);
      
      // Prüfe Output Connections (Switch → ...)
      const outputCounts = [0, 0, 0, 0]; // RETRY, REROUTE, SKIP, ALERT
      if (connections[switchNode.name]?.main) {
        connections[switchNode.name].main.forEach((output, idx) => {
          if (Array.isArray(output) && output.length > 0) {
            outputCounts[idx] = output.length;
          }
        });
      }
      
      console.log(`   Output 0 (RETRY): ${outputCounts[0] > 0 ? '✅' : '⚠️'} ${outputCounts[0]} Connection(s)`);
      console.log(`   Output 1 (REROUTE): ${outputCounts[1] > 0 ? '✅' : '⚠️'} ${outputCounts[1]} Connection(s)`);
      console.log(`   Output 2 (SKIP): ${outputCounts[2] > 0 ? '✅' : '⚠️'} ${outputCounts[2]} Connection(s)`);
      console.log(`   Output 3 (ALERT): ${outputCounts[3] > 0 ? '✅' : '⚠️'} ${outputCounts[3]} Connection(s)`);
      console.log('');
      
      if (!inputConn || outputCounts.every(c => c === 0)) {
        allOk = false;
      }
    }
    
    // 4. TEST-ZUSAMMENFASSUNG
    console.log('='.repeat(80));
    if (allOk) {
      console.log('✅ ALLE SWITCH ERROR HANDLERS SIND KORREKT KONFIGURIERT!\n');
      console.log('💡 NÄCHSTE SCHRITTE ZUM TESTEN:');
      console.log('   1. Öffne n8n UI: https://n8n.srv1091615.hstgr.cloud');
      console.log('   2. Öffne Workflow: ***MECHTECH_MERCHANT_CENTER_ADMIN');
      console.log('   3. Stelle sicher dass nur 5 Test-Artikel verarbeitet werden');
      console.log('   4. Führe Workflow aus (Test-Modus oder Live)');
      console.log('   5. Beobachte ob Error Handler korrekt reagieren:\n');
      console.log('      - HTTP 429 → RETRY → Rate Limiting');
      console.log('      - HTTP 400 → REROUTE → Handle Invalid Priority');
      console.log('      - HTTP 500 → SKIP → Log Results');
      console.log('      - Andere → ALERT → Log Results\n');
    } else {
      console.log('⚠️  EINIGE PROBLEME GEFUNDEN!\n');
      console.log('   Bitte prüfe die oben genannten Punkte.\n');
    }
    console.log('='.repeat(80) + '\n');
    
    // 5. Versuche Workflow-Status zu prüfen
    try {
      const executions = await n8nRequest(`/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=5`);
      if (executions && executions.data && executions.data.length > 0) {
        console.log('📊 LETZTE EXECUTIONS:\n');
        executions.data.slice(0, 3).forEach((exec, idx) => {
          console.log(`   ${idx + 1}. ${exec.mode || 'unknown'}: ${exec.finished ? '✅ Finished' : '⏳ Running'}`);
          console.log(`      Status: ${exec.finished ? exec.stoppedAt : 'Running'}`);
        });
        console.log('');
      }
    } catch (e) {
      console.log('⚠️  Executions API nicht verfügbar\n');
    }
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  testSwitchHandlers();
}

module.exports = { testSwitchHandlers };
