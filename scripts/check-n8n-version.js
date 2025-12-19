/**
 * 🔍 CHECK N8N VERSION
 * Prüft welche n8n Version installiert ist
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';

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

async function checkVersion() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECK N8N VERSION');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Versuche verschiedene Endpoints
    try {
      const version = await n8nRequest('/rest/login');
      console.log('Version Info:', JSON.stringify(version, null, 2));
    } catch (e) {
      console.log('Login endpoint:', e.message);
    }
    
    try {
      const instance = await n8nRequest('/rest/instance');
      console.log('\nInstance Info:', JSON.stringify(instance, null, 2));
    } catch (e) {
      console.log('Instance endpoint:', e.message);
    }
    
    // Prüfe Health Check für Version Info
    try {
      const health = await n8nRequest('/healthz');
      console.log('\nHealth Check:', JSON.stringify(health, null, 2));
    } catch (e) {
      console.log('Health endpoint:', e.message);
    }
    
    // Prüfe Workflow für Version-Hinweise
    try {
      const workflows = await n8nRequest('/api/v1/workflows?limit=1');
      console.log('\nWorkflow API available');
    } catch (e) {
      console.log('Workflow API:', e.message);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

if (require.main === module) {
  checkVersion();
}

module.exports = { checkVersion };
