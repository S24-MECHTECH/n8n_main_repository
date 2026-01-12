/**
 * ✅ VERIFY SWITCH NODES FINAL
 * Verifiziert dass alle Switch Nodes korrekt konfiguriert sind
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

async function verifySwitchNodes() {
  console.log('\n' + '='.repeat(80));
  console.log('✅ VERIFY SWITCH NODES FINAL');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      console.error('❌ N8N_API_KEY fehlt!');
      process.exit(1);
    }
    
    // 1. Workflow laden
    console.log('📥 Lade Workflow...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || {};
    
    console.log(`✅ Workflow: ${workflow.name}\n`);
    
    // 2. Finde alle Switch Nodes
    const switchNodes = nodes.filter(n => 
      n.type === 'n8n-nodes-base.switch' && 
      n.name && n.name.includes('Error Handler')
    );
    
    console.log(`🔍 Gefundene Switch Nodes: ${switchNodes.length}\n`);
    
    let allCorrect = true;
    
    // 3. Verifiziere jeden Switch Node
    for (const switchNode of switchNodes) {
      console.log(`📋 ${switchNode.name}:`);
      
      const params = switchNode.parameters || {};
      
      // Prüfe Mode
      if (params.mode !== 'rules') {
        console.log(`   ❌ Mode: ${params.mode || 'undefined'} (sollte: rules)`);
        allCorrect = false;
      } else {
        console.log(`   ✅ Mode: ${params.mode}`);
      }
      
      // Prüfe Rules
      if (!params.rules || !params.rules.values || params.rules.values.length !== 3) {
        console.log(`   ❌ Rules: ${params.rules?.values?.length || 0} rules (sollte: 3)`);
        allCorrect = false;
      } else {
        console.log(`   ✅ Rules: ${params.rules.values.length} rules`);
        params.rules.values.forEach((rule, idx) => {
          const outputKey = rule.outputKey || 'undefined';
          const codes = ['RETRY (429)', 'REROUTE (400)', 'SKIP (500)'];
          console.log(`      ${idx + 1}. ${outputKey} - ${codes[idx] || 'unknown'}`);
        });
      }
      
      // Prüfe Fallback
      if (!params.fallbackOutput || params.fallbackOutput !== 'ALERT') {
        console.log(`   ❌ Fallback: ${params.fallbackOutput || 'undefined'} (sollte: ALERT)`);
        allCorrect = false;
      } else {
        console.log(`   ✅ Fallback: ${params.fallbackOutput}`);
      }
      
      // Prüfe Connection
      const hasConnection = connections.main?.[0]?.some(conn => 
        conn[1]?.node === switchNode.id
      );
      if (!hasConnection) {
        console.log(`   ⚠️  Connection: Keine Input-Connection gefunden`);
      } else {
        console.log(`   ✅ Connection: Input-Connection vorhanden`);
      }
      
      console.log('');
    }
    
    console.log('='.repeat(80));
    if (allCorrect) {
      console.log('✅ ALLE SWITCH NODES SIND KORREKT KONFIGURIERT!\n');
    } else {
      console.log('⚠️  EINIGE SWITCH NODES BENÖTIGEN NOCH KORREKTUREN\n');
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
  verifySwitchNodes();
}

module.exports = { verifySwitchNodes };
