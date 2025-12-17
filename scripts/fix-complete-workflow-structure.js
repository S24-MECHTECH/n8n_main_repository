/**
 * FIX COMPLETE WORKFLOW STRUCTURE
 * Verbindet Prepare GTN/EAN → Rate Limiting → Update Chain sequenziell
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

// API Key finden
function getApiKey() {
  if (process.argv[2]) return process.argv[2];
  if (process.env.N8N_API_KEY) return process.env.N8N_API_KEY;
  
  const configPaths = [
    path.join(__dirname, '..', '..', '.cursor', 'mcp.json'),
    path.join(__dirname, '..', '..', '.cursor', 'FUNKTIONIERENDE_CONFIG.json'),
    path.join(__dirname, '..', '..', '.cursor', 'mcp-config.json'),
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
        const authHeader = config.mcpServers?.['n8n-mcp']?.args?.find(arg => arg.startsWith('authorization:Bearer '));
        if (authHeader) return authHeader.replace('authorization:Bearer ', '');
      }
    } catch (error) {}
  }
  return null;
}

const N8N_API_KEY = getApiKey();
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

async function fixCompleteWorkflowStructure() {
  console.log('\n' + '='.repeat(80));
  console.log('🔗 FIX COMPLETE WORKFLOW STRUCTURE');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes;
    let connections = workflow.connections || {};
    let changes = 0;
    
    console.log(`✅ Workflow geladen: ${workflow.name}\n`);
    
    // 1. Prepare GTN/EAN → Rate Limiting → Update Product Adult Flag
    console.log('🔗 FIX 1: Prepare GTN/EAN → Rate Limiting → Update Chain...\n');
    
    const prepareGTN = nodes.find(n => n.name === 'Prepare GTN/EAN_Loop');
    const rateLimitingGTN = nodes.find(n => 
      n.name.toLowerCase().includes('rate limiting') && 
      (n.name.toLowerCase().includes('gtn') || n.name.toLowerCase().includes('gtin'))
    );
    const firstUpdate = nodes.find(n => n.name === 'Update Product Adult Flag');
    
    if (prepareGTN && rateLimitingGTN && firstUpdate) {
      // Prepare GTN/EAN → Rate Limiting (falls nicht schon verbunden)
      if (!connections['Prepare GTN/EAN_Loop']) {
        connections['Prepare GTN/EAN_Loop'] = { main: [[]] };
      }
      
      const prepConn = connections['Prepare GTN/EAN_Loop'].main[0] || [];
      const hasRateConn = prepConn.some(c => c.node === rateLimitingGTN.name);
      
      if (!hasRateConn) {
        connections['Prepare GTN/EAN_Loop'].main[0] = [
          { node: rateLimitingGTN.name, type: 'main', index: 0 }
        ];
        console.log(`   ✅ Prepare GTN/EAN_Loop → ${rateLimitingGTN.name}`);
        changes++;
      } else {
        console.log(`   ⏭️  Prepare GTN/EAN_Loop → ${rateLimitingGTN.name} (bereits verbunden)`);
      }
      
      // Rate Limiting → Update Product Adult Flag
      if (!connections[rateLimitingGTN.name]) {
        connections[rateLimitingGTN.name] = { main: [[]] };
      }
      
      const rateConn = connections[rateLimitingGTN.name].main[0] || [];
      const hasUpdateConn = rateConn.some(c => c.node === firstUpdate.name);
      
      if (!hasUpdateConn) {
        connections[rateLimitingGTN.name].main[0] = [
          { node: firstUpdate.name, type: 'main', index: 0 }
        ];
        console.log(`   ✅ ${rateLimitingGTN.name} → ${firstUpdate.name}`);
        changes++;
      } else {
        console.log(`   ⏭️  ${rateLimitingGTN.name} → ${firstUpdate.name} (bereits verbunden)`);
      }
    }
    
    console.log();
    
    // 2. Update Chain sequenziell (bereits gemacht, aber prüfen ob alles korrekt ist)
    console.log('🔗 FIX 2: Prüfe Update Chain...\n');
    
    const updateChain = [
      'Update Product Adult Flag',
      'Update Product Images',
      'Update Product Text',
      'Update Merchant Settings',
      'Update Country Feeds',
      'Update GTN/EAN'
    ];
    
    for (let i = 0; i < updateChain.length - 1; i++) {
      const current = updateChain[i];
      const next = updateChain[i + 1];
      
      const currentConn = connections[current]?.main?.[0] || [];
      const isConnected = currentConn.some(c => c.node === next);
      
      if (isConnected) {
        console.log(`   ✅ ${current} → ${next} (korrekt verbunden)`);
      } else {
        console.log(`   ❌ ${current} → ${next} (FEHLT!)`);
        // Verbinde es
        if (!connections[current]) {
          connections[current] = { main: [[]] };
        }
        connections[current].main[0] = [
          { node: next, type: 'main', index: 0 },
          ...currentConn.filter(c => c.node !== next)
        ];
        console.log(`   ✅ ${current} → ${next} (HINZUGEFÜGT)`);
        changes++;
      }
    }
    
    // Letzter Update → Rate Limiting
    const lastUpdate = updateChain[updateChain.length - 1];
    const lastUpdateConn = connections[lastUpdate]?.main?.[0] || [];
    const hasFinalRateConn = lastUpdateConn.some(c => 
      c.node === rateLimitingGTN?.name || 
      (c.node.toLowerCase().includes('rate') && c.node.toLowerCase().includes('gtn'))
    );
    
    if (rateLimitingGTN && !hasFinalRateConn) {
      if (!connections[lastUpdate]) {
        connections[lastUpdate] = { main: [[]] };
      }
      connections[lastUpdate].main[0] = [
        ...lastUpdateConn,
        { node: rateLimitingGTN.name, type: 'main', index: 0 }
      ];
      console.log(`   ✅ ${lastUpdate} → ${rateLimitingGTN.name} (am Ende)`);
      changes++;
    }
    
    console.log();
    
    // Speichere Workflow
    if (changes > 0) {
      console.log(`💾 Speichere ${changes} Änderungen...\n`);
      
      const cleanSettings = workflow.settings ? 
        { executionOrder: workflow.settings.executionOrder || 'v1' } : 
        { executionOrder: 'v1' };
      
      const updatePayload = {
        name: workflow.name,
        nodes: nodes,
        connections: connections,
        settings: cleanSettings
      };
      
      await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
      
      console.log('✅ Workflow erfolgreich aktualisiert!\n');
      console.log(`📊 KOMPLETTE STRUKTUR:`);
      console.log(`   Prepare Products Loop`);
      console.log(`   ↓`);
      console.log(`   Prepare Images Loop`);
      console.log(`   ↓`);
      console.log(`   ... (alle Prepare Nodes)`);
      console.log(`   ↓`);
      console.log(`   Prepare GTN/EAN_Loop`);
      console.log(`   ↓`);
      console.log(`   Rate Limiting GTN/EAN`);
      console.log(`   ↓`);
      console.log(`   Update Product Adult Flag`);
      console.log(`   ↓`);
      console.log(`   Update Product Images`);
      console.log(`   ↓`);
      console.log(`   ... (alle Update Nodes)`);
      console.log(`   ↓`);
      console.log(`   Update GTN/EAN`);
      console.log(`   ↓`);
      console.log(`   Rate Limiting GTN/EAN (am Ende)\n`);
    } else {
      console.log('✅ Keine Änderungen notwendig - Workflow-Struktur ist bereits korrekt!\n');
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

fixCompleteWorkflowStructure();
