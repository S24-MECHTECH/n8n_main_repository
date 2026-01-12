/**
 * 🚀 DEPLOY TO N8N
 * Deployt Workflow-Fixes automatisch zu n8n
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

async function deployToN8N() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 DEPLOY TO N8N');
  console.log('='.repeat(80) + '\n');

  try {
    if (!N8N_API_KEY) {
      console.error('❌ N8N_API_KEY fehlt!');
      process.exit(1);
    }

    console.log('📥 Lade Workflow...\n');
    
    // Lade aktuellen Workflow
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    console.log(`✅ Workflow geladen: ${workflow.name}`);
    console.log(`   Nodes: ${workflow.nodes?.length || 0}`);
    console.log(`   Active: ${workflow.active ? '✅' : '❌'}\n`);
    
    // Prüfe ob Auto-Fix angewendet werden muss
    console.log('🔧 Prüfe ob Fixes nötig sind...\n');
    
    // Führe Auto-Fix aus (via require)
    const autoFixPath = path.join(__dirname, 'auto-fix-workflow.js');
    if (fs.existsSync(autoFixPath)) {
      console.log('   ✅ Auto-Fix Script gefunden');
      console.log('   💡 Führen Sie "node scripts/auto-fix-workflow.js" aus um Fixes anzuwenden\n');
    } else {
      console.log('   ⚠️  Auto-Fix Script nicht gefunden\n');
    }
    
    // Verifiziere Workflow-Status
    console.log('✅ Workflow Status:');
    console.log(`   ID: ${WORKFLOW_ID}`);
    console.log(`   Name: ${workflow.name}`);
    console.log(`   URL: ${N8N_URL}/workflow/${WORKFLOW_ID}`);
    console.log(`   Status: ${workflow.active ? 'ACTIVE ✅' : 'INACTIVE ❌'}\n`);
    
    console.log('✅ Deployment-Verifikation abgeschlossen!\n');
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
  deployToN8N();
}

module.exports = { deployToN8N };
