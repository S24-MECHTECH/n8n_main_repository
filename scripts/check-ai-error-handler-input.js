/**
 * 🔍 CHECK AI ERROR HANDLER INPUT
 * Prüft wo der AI Error Handler seinen Input bekommt
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

async function checkInput() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECK AI ERROR HANDLER INPUT');
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
    
    // 2. Finde AI Error Handler Node
    const aiErrorHandlerNode = nodes.find(n => n.name === 'AI Error Handler');
    if (!aiErrorHandlerNode) {
      console.error('❌ AI Error Handler Node nicht gefunden!');
      process.exit(1);
    }
    
    console.log(`✅ AI Error Handler gefunden:`);
    console.log(`   ID: ${aiErrorHandlerNode.id}`);
    console.log(`   Type: ${aiErrorHandlerNode.type}\n`);
    
    // 3. Prüfe Input Connections (welche Nodes verbinden ZU AI Error Handler)
    console.log('🔍 Prüfe INPUT Connections (wer sendet an AI Error Handler?)...\n');
    
    if (!connections.main || !connections.main[0]) {
      console.log('   ⚠️  Keine Connections gefunden!');
    } else {
      // Finde alle Connections, die ZU AI Error Handler gehen
      const inputConnections = connections.main[0].filter(conn => {
        return conn[1]?.node === aiErrorHandlerNode.id;
      });
      
      if (inputConnections.length === 0) {
        console.log('   ❌ KEINE INPUT CONNECTIONS GEFUNDEN!');
        console.log('   ⚠️  AI Error Handler bekommt KEINEN Input!');
      } else {
        console.log(`   ✅ ${inputConnections.length} Input Connection(s) gefunden:\n`);
        
        inputConnections.forEach((conn, idx) => {
          const sourceNode = nodes.find(n => n.id === conn[0]?.node);
          const sourceNodeName = sourceNode ? sourceNode.name : 'Unknown';
          const sourceNodeType = sourceNode ? sourceNode.type : 'Unknown';
          
          console.log(`   ${idx + 1}. ${sourceNodeName} → AI Error Handler`);
          console.log(`      Source Node ID: ${conn[0]?.node}`);
          console.log(`      Source Node Type: ${sourceNodeType}`);
          
          // Prüfe ob es Gemini ist
          if (sourceNodeType.includes('gemini') || sourceNodeType.includes('google') || sourceNodeName.toLowerCase().includes('gemini')) {
            console.log(`      ⚠️  MÖGLICH: Input kommt von Gemini!`);
          }
          
          console.log('');
        });
      }
    }
    
    // 4. Prüfe auch ob Update GTN/EAN verbunden ist
    console.log('🔍 Prüfe Update GTN/EAN Connection...\n');
    const updateGtnEanNode = nodes.find(n => n.name === 'Update GTN/EAN');
    if (updateGtnEanNode) {
      const updateToErrorHandler = connections.main[0]?.some(conn => 
        conn[0]?.node === updateGtnEanNode.id && 
        conn[1]?.node === aiErrorHandlerNode.id
      );
      
      if (updateToErrorHandler) {
        console.log('   ✅ Update GTN/EAN → AI Error Handler: Verbunden');
      } else {
        console.log('   ❌ Update GTN/EAN → AI Error Handler: NICHT verbunden!');
      }
    }
    
    console.log('');
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
  checkInput();
}

module.exports = { checkInput };
