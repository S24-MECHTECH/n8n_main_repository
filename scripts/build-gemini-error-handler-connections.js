/**
 * 🔗 BUILD GEMINI ERROR HANDLER CONNECTIONS
 * Baut Connections für Gemini Error Handler:
 * - Update Node → Gemini Error Handler (Input)
 * - Gemini Error Handler → Action Handler (Switch basierend auf Gemini Output)
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
  { name: 'Adult', updateNode: 'Update Product Adult Flag', rateLimitNode: 'Rate Limiting' },
  { name: 'Images', updateNode: 'Update Product Images', rateLimitNode: 'Rate Limiting Images' },
  { name: 'Text', updateNode: 'Update Product Text', rateLimitNode: 'Rate Limiting Text' },
  { name: 'Quality', updateNode: 'Update Merchant Settings', rateLimitNode: 'Rate Limiting Merchant' },
  { name: 'Country', updateNode: 'Update Country Feeds', rateLimitNode: 'Rate Limiting Country' },
  { name: 'GTN/EAN', updateNode: 'Update GTN/EAN', rateLimitNode: 'Rate Limiting GTN/EAN' }
];

async function buildGeminiConnections() {
  console.log('\n' + '='.repeat(80));
  console.log('🔗 BUILD GEMINI ERROR HANDLER CONNECTIONS');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      console.error('❌ N8N_API_KEY fehlt!');
      process.exit(1);
    }
    
    // 1. Workflow laden
    console.log('📥 Lade Workflow...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    let nodes = workflow.nodes || [];
    let connections = workflow.connections || {};
    
    console.log(`✅ Workflow: ${workflow.name}\n`);
    
    // Finde gemeinsame Nodes
    const handleInvalidPriorityNode = nodes.find(n => n.name === 'Handle Invalid Priority');
    const logResultsNode = nodes.find(n => n.name === 'Log Results to Sheets');
    
    let connectionsAdded = 0;
    
    // 2. Für jeden Strang Connections bauen
    console.log('🔗 Baue Connections...\n');
    
    for (const strand of strandDefinitions) {
      console.log(`📋 STRANG: ${strand.name}\n`);
      
      // Finde Nodes
      const updateNode = nodes.find(n => n.name === strand.updateNode);
      const geminiNode = nodes.find(n => 
        n.name === `Gemini Error Handler ${strand.name}` &&
        n.type === '@n8n/n8n-nodes-langchain.googleGeminiTool'
      );
      const rateLimitNode = nodes.find(n => n.name === strand.rateLimitNode);
      
      if (!updateNode || !geminiNode) {
        console.log(`   ⚠️  Nodes nicht vollständig gefunden - übersprungen\n`);
        continue;
      }
      
      // Connection 1: Update Node → Gemini Error Handler (node-based Format)
      if (!connections[strand.updateNode]) {
        connections[strand.updateNode] = {};
      }
      if (!connections[strand.updateNode].main) {
        connections[strand.updateNode].main = [[]];
      }
      if (!connections[strand.updateNode].main[0]) {
        connections[strand.updateNode].main[0] = [];
      }
      
      const inputConnExists = connections[strand.updateNode].main[0].some(conn => 
        (typeof conn === 'object' && conn.node === geminiNode.name) ||
        (typeof conn === 'string' && conn === geminiNode.name)
      );
      
      if (!inputConnExists) {
        connections[strand.updateNode].main[0].push({
          node: geminiNode.name,
          type: 'main',
          index: 0
        });
        connectionsAdded++;
        console.log(`   ✅ ${strand.updateNode} → Gemini Error Handler ${strand.name}`);
      } else {
        console.log(`   ✅ ${strand.updateNode} → Gemini Error Handler ${strand.name} (bereits vorhanden)`);
      }
      
      // Connection 2: Gemini Error Handler → Rate Limiting (für RETRY)
      // Gemini gibt JSON mit "action" zurück, ein Code Node würde das parsen und weiterleiten
      // Für jetzt: Direkt zu Rate Limiting (Gemini entscheidet intern über RETRY)
      
      if (rateLimitNode) {
        if (!connections[geminiNode.name]) {
          connections[geminiNode.name] = {};
        }
        if (!connections[geminiNode.name].main) {
          connections[geminiNode.name].main = [[]];
        }
        if (!connections[geminiNode.name].main[0]) {
          connections[geminiNode.name].main[0] = [];
        }
        
        const retryConnExists = connections[geminiNode.name].main[0].some(conn => 
          (typeof conn === 'object' && conn.node === rateLimitNode.name) ||
          (typeof conn === 'string' && conn === rateLimitNode.name)
        );
        
        if (!retryConnExists) {
          connections[geminiNode.name].main[0].push({
            node: rateLimitNode.name,
            type: 'main',
            index: 0
          });
          connectionsAdded++;
          console.log(`   ✅ Gemini Error Handler ${strand.name} → ${rateLimitNode.name}`);
        }
      }
      
      console.log('');
    }
    
    // 3. Deploy zu n8n
    console.log('💾 Speichere Workflow...\n');
    
    const cleanSettings = { 
      executionOrder: workflow.settings?.executionOrder || 'v1' 
    };
    
    const updatePayload = {
      name: workflow.name,
      nodes: nodes,
      connections: connections,
      settings: cleanSettings
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    console.log('   ✅ Workflow aktualisiert\n');
    
    // 4. REPORT
    console.log('📊 REPORT\n');
    console.log('✅ GEMINI ERROR HANDLER CONNECTIONS ERSTELLT');
    console.log(`   ✅ ${connectionsAdded} neue Connection(s) hinzugefügt`);
    console.log('\n   💡 Connections:');
    console.log('      - Update Node → Gemini Error Handler');
    console.log('      - Gemini Error Handler → Rate Limiting');
    console.log('\n   ⚠️  HINWEIS: Gemini gibt JSON zurück, Code Node könnte');
    console.log('      die "action" parsen und entsprechend weiterleiten!');
    console.log('\n   💡 Browser REFRESH (F5) erforderlich!\n');
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
  buildGeminiConnections();
}

module.exports = { buildGeminiConnections };
