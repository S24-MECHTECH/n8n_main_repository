/**
 * 🔍 GATHER N8N NODE INFORMATION
 * Sammelt alle Informationen über verfügbare Nodes, installierte Nodes, etc.
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

async function gatherNodeInfo() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 GATHER N8N NODE INFORMATION');
  console.log('='.repeat(80) + '\n');
  
  const results = {
    nodeTypes: null,
    workflowNodes: [],
    nodeCategories: {},
    aiNodes: [],
    geminiNodes: [],
    mcpNodes: [],
    errorHandlers: []
  };
  
  try {
    // 1. Versuche Node Types API
    console.log('1️⃣  PRÜFE NODE TYPES API...\n');
    try {
      const nodeTypes = await n8nRequest('/api/v1/node-types');
      results.nodeTypes = nodeTypes;
      console.log(`   ✅ Node Types API verfügbar`);
      console.log(`   📊 Node Types gefunden: ${Array.isArray(nodeTypes) ? nodeTypes.length : 'Unknown'}\n`);
    } catch (e) {
      console.log(`   ⚠️  Node Types API: ${e.message}\n`);
    }
    
    // 2. Workflow analysieren - alle verwendeten Node Types
    console.log('2️⃣  ANALYSIERE WORKFLOW NODES...\n');
    try {
      const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
      const nodes = workflow.nodes || [];
      
      results.workflowNodes = nodes.map(n => ({
        name: n.name,
        type: n.type,
        typeVersion: n.typeVersion,
        id: n.id
      }));
      
      // Kategorisiere Nodes
      nodes.forEach(node => {
        const category = node.type.split('.')[0] || 'unknown';
        if (!results.nodeCategories[category]) {
          results.nodeCategories[category] = [];
        }
        results.nodeCategories[category].push({
          name: node.name,
          type: node.type,
          version: node.typeVersion
        });
        
        // AI Nodes
        if (node.type.includes('gemini') || node.type.includes('Gemini') || 
            node.type.includes('langchain') || node.type.includes('LangChain') ||
            node.type.includes('openai') || node.type.includes('OpenAI')) {
          results.aiNodes.push({
            name: node.name,
            type: node.type,
            version: node.typeVersion
          });
        }
        
        // Gemini Nodes
        if (node.type.includes('gemini') || node.type.includes('Gemini')) {
          results.geminiNodes.push({
            name: node.name,
            type: node.type,
            version: node.typeVersion
          });
        }
        
        // MCP Nodes
        if (node.type.includes('mcp') || node.type.includes('MCP')) {
          results.mcpNodes.push({
            name: node.name,
            type: node.type,
            version: node.typeVersion
          });
        }
        
        // Error Handler Nodes
        if (node.name && node.name.includes('Error Handler')) {
          results.errorHandlers.push({
            name: node.name,
            type: node.type,
            version: node.typeVersion,
            hasCode: !!node.parameters?.jsCode,
            codeLength: node.parameters?.jsCode?.length || 0
          });
        }
      });
      
      console.log(`   ✅ Workflow analysiert: ${nodes.length} Nodes`);
      console.log(`   📊 Node Kategorien: ${Object.keys(results.nodeCategories).length}\n`);
      
    } catch (e) {
      console.log(`   ❌ Workflow Analyse: ${e.message}\n`);
    }
    
    // 3. REPORT
    console.log('='.repeat(80));
    console.log('📊 REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log('📋 NODE KATEGORIEN IM WORKFLOW:\n');
    Object.keys(results.nodeCategories).sort().forEach(category => {
      console.log(`   ${category}: ${results.nodeCategories[category].length} Node(s)`);
      results.nodeCategories[category].slice(0, 3).forEach(node => {
        console.log(`      - ${node.name} (${node.type})`);
      });
      if (results.nodeCategories[category].length > 3) {
        console.log(`      ... und ${results.nodeCategories[category].length - 3} weitere`);
      }
      console.log('');
    });
    
    console.log('🤖 AI NODES IM WORKFLOW:\n');
    if (results.aiNodes.length > 0) {
      results.aiNodes.forEach(node => {
        console.log(`   ✅ ${node.name}`);
        console.log(`      Type: ${node.type}`);
        console.log(`      Version: ${node.typeVersion}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  Keine AI Nodes gefunden\n');
    }
    
    console.log('🤖 GEMINI NODES IM WORKFLOW:\n');
    if (results.geminiNodes.length > 0) {
      results.geminiNodes.forEach(node => {
        console.log(`   ✅ ${node.name}`);
        console.log(`      Type: ${node.type}`);
        console.log(`      Version: ${node.typeVersion}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  Keine Gemini Nodes gefunden\n');
    }
    
    console.log('🔗 MCP NODES IM WORKFLOW:\n');
    if (results.mcpNodes.length > 0) {
      results.mcpNodes.forEach(node => {
        console.log(`   ✅ ${node.name}`);
        console.log(`      Type: ${node.type}`);
        console.log(`      Version: ${node.typeVersion}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  Keine MCP Nodes gefunden\n');
    }
    
    console.log('⚠️  ERROR HANDLER NODES:\n');
    if (results.errorHandlers.length > 0) {
      results.errorHandlers.forEach(node => {
        const status = node.type === 'n8n-nodes-base.code' ? '✅ Code Node' : 
                      node.type === 'n8n-nodes-base.switch' ? '✅ Switch Node' :
                      node.type.includes('gemini') ? '⚠️  Gemini Tool (nicht installiert?)' : '❓ Unknown';
        console.log(`   ${status} ${node.name}`);
        console.log(`      Type: ${node.type}`);
        if (node.hasCode) {
          console.log(`      Code: ${node.codeLength} chars`);
        }
        console.log('');
      });
    } else {
      console.log('   ⚠️  Keine Error Handler Nodes gefunden\n');
    }
    
    // Speichere Ergebnisse
    fs.writeFileSync(
      path.join(__dirname, '..', 'n8n-node-info-report.json'),
      JSON.stringify(results, null, 2)
    );
    console.log('💾 Vollständiger Report gespeichert: n8n-node-info-report.json\n');
    
    console.log('='.repeat(80));
    console.log('⚠️  MANUELLE PRÜFUNG ERFORDERLICH:\n');
    console.log('1. Öffne n8n UI: https://n8n.srv1091615.hstgr.cloud');
    console.log('2. Klicke auf "+ Node" → Zeige Kategorien (besonders AI/Gemini)');
    console.log('3. Settings → Nodes → Zeige installierte Nodes');
    console.log('4. Prüfe welche Nodes GRÜN/ROT sind\n');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

if (require.main === module) {
  gatherNodeInfo();
}

module.exports = { gatherNodeInfo };
