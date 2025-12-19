/**
 * 🔍 CHECK ALL ERROR HANDLER NODES
 * Prüft welche Error Handler Nodes im Workflow existieren
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

async function checkAllErrorHandlers() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECK ALL ERROR HANDLER NODES');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes || [];
    
    console.log(`✅ Workflow: ${workflow.name}`);
    console.log(`   Total Nodes: ${nodes.length}\n`);
    
    // Finde alle Error Handler Nodes
    const errorHandlers = nodes.filter(n => 
      n.name && (
        n.name.includes('Error Handler') ||
        n.name.includes('Gemini Error Handler')
      )
    );
    
    console.log(`🔍 Error Handler Nodes: ${errorHandlers.length}\n`);
    
    errorHandlers.forEach(node => {
      console.log(`📋 ${node.name}:`);
      console.log(`   Type: ${node.type}`);
      console.log(`   ID: ${node.id}`);
      console.log(`   Position: [${node.position[0]}, ${node.position[1]}]`);
      if (node.type === 'n8n-nodes-base.code' && node.parameters?.jsCode) {
        const codeLength = node.parameters.jsCode.length;
        console.log(`   Code Length: ${codeLength} chars`);
      }
      console.log('');
    });
    
    // Finde alle Code Nodes
    const codeNodes = nodes.filter(n => n.type === 'n8n-nodes-base.code');
    console.log(`📊 Total Code Nodes: ${codeNodes.length}\n`);
    
    // Finde alle Switch Nodes
    const switchNodes = nodes.filter(n => n.type === 'n8n-nodes-base.switch');
    console.log(`📊 Total Switch Nodes: ${switchNodes.length}\n`);
    
    // Finde alle Gemini Tool Nodes
    const geminiToolNodes = nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.googleGeminiTool');
    console.log(`📊 Total Gemini Tool Nodes: ${geminiToolNodes.length}\n`);
    
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
  checkAllErrorHandlers();
}

module.exports = { checkAllErrorHandlers };
