/**
 * CHECK SWITCH NODE CONFIGURATION
 * Prüft aktuelle Switch Node Konfiguration
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

const switchNodeNames = [
  'Switch Action Handler Adult Flags',
  'Switch Action Handler Images',
  'Switch Action Handler Text',
  'Switch Action Handler Merchant Quality',
  'Switch Action Handler Multi Country',
  'Switch Action Handler GTN/EAN'
];

async function checkSwitchConfig() {
  console.log('\n' + '='.repeat(80));
  console.log('CHECK SWITCH NODE CONFIGURATION');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY nicht gefunden!');
    }
    
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes || [];
    
    for (const switchName of switchNodeNames) {
      const switchNode = nodes.find(n => n.name === switchName);
      
      if (!switchNode) {
        console.log(`❌ ${switchName} - Node nicht gefunden!\n`);
        continue;
      }
      
      console.log(`📋 ${switchName}:`);
      console.log(`   Type: ${switchNode.type}`);
      console.log(`   Mode: ${switchNode.parameters?.mode || 'NOT SET'}`);
      
      if (switchNode.parameters) {
        if (switchNode.parameters.mode === 'expression') {
          console.log(`   Expression: ${switchNode.parameters.value || 'NOT SET'}`);
          console.log(`   Options.output: ${switchNode.parameters.options?.output || 'NOT SET'}`);
          console.log(`   Fallback Output: ${switchNode.parameters.fallbackOutput || 'NOT SET'}`);
        } else if (switchNode.parameters.mode === 'rules') {
          console.log(`   Rules: ${JSON.stringify(switchNode.parameters.rules, null, 2)}`);
          console.log(`   Fallback Output: ${switchNode.parameters.fallbackOutput || 'NOT SET'}`);
        } else {
          console.log(`   Parameters: ${JSON.stringify(switchNode.parameters, null, 2)}`);
        }
      } else {
        console.log(`   ❌ KEINE PARAMETERS!`);
      }
      
      console.log('');
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
  checkSwitchConfig();
}

module.exports = { checkSwitchConfig };


