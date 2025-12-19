/**
 * DOWNLOAD WORKFLOW FOR FIX
 * Lädt aktuellen Workflow von n8n API
 * User macht Fix selbst - ich lade nur für ihn
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

async function downloadWorkflowForFix() {
  console.log('\n' + '='.repeat(80));
  console.log('DOWNLOAD WORKFLOW FOR FIX');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY nicht gefunden!');
    }
    
    // 1. Lade Workflow
    console.log('1. LADE AKTUELLEN WORKFLOW...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`   Workflow: ${workflow.name}`);
    console.log(`   ID: ${WORKFLOW_ID}`);
    console.log(`   Nodes: ${workflow.nodes.length}`);
    console.log(`   Active: ${workflow.active ? 'JA' : 'NEIN'}\n`);
    
    // 2. Speichere Workflow lokal
    console.log('2. SPEICHERE WORKFLOW LOKAL...\n');
    const workflowFile = path.join(__dirname, '..', 'workflows', `CURRENT_WORKFLOW_FOR_FIX_${WORKFLOW_ID}.json`);
    
    // Erstelle workflows Verzeichnis falls nicht vorhanden
    const workflowsDir = path.dirname(workflowFile);
    if (!fs.existsSync(workflowsDir)) {
      fs.mkdirSync(workflowsDir, { recursive: true });
    }
    
    // Speichere Workflow
    fs.writeFileSync(workflowFile, JSON.stringify(workflow, null, 2), 'utf8');
    console.log(`   ✅ Workflow gespeichert: ${workflowFile}\n`);
    
    // 3. REPORT
    console.log('='.repeat(80));
    console.log('REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log('✅ WORKFLOW DOWNLOADED:\n');
    console.log(`   Workflow: ${workflow.name}`);
    console.log(`   ID: ${WORKFLOW_ID}`);
    console.log(`   Datei: ${path.basename(workflowFile)}`);
    console.log(`   Nodes: ${workflow.nodes.length}`);
    console.log(`   Status: ${workflow.active ? 'Aktiv' : 'Inaktiv'}`);
    console.log(`\n📋 BEREIT FÜR DEINEN FIX:\n`);
    console.log(`   ✓ Workflow geladen`);
    console.log(`   ✓ Datei gespeichert`);
    console.log(`   ✓ Warte auf deinen EXAKTEN Fix-Code`);
    console.log(`\n💡 ICH MACHE:\n`);
    console.log(`   - NUR: Upload zu GitHub wenn du sagst "fertig"`);
    console.log(`   - KEIN Deploy`);
    console.log(`   - KEINE Änderungen`);
    console.log(`   - NUR: Upload wenn fertig!\n`);
    
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
  downloadWorkflowForFix();
}

module.exports = { downloadWorkflowForFix };


