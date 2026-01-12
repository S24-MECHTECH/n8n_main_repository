/**
 * EXPORT WORKFLOW TO GITHUB
 * Lädt Workflow von n8n API und pusht zu GitHub
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

async function exportWorkflowToGitHub() {
  console.log('\n' + '='.repeat(80));
  console.log('EXPORT WORKFLOW TO GITHUB');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY nicht gefunden!');
    }
    
    // 1. Lade Workflow
    console.log('1. LADE WORKFLOW VON N8N...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`   Workflow: ${workflow.name}`);
    console.log(`   Nodes: ${workflow.nodes.length}`);
    console.log(`   Active: ${workflow.active ? 'JA' : 'NEIN'}\n`);
    
    // 2. Speichere Workflow lokal
    console.log('2. SPEICHERE WORKFLOW LOKAL...\n');
    const workflowFile = path.join(__dirname, '..', 'workflows', `MERCHANT_CENTER_ADMIN_${WORKFLOW_ID}.json`);
    
    // Erstelle workflows Verzeichnis falls nicht vorhanden
    const workflowsDir = path.dirname(workflowFile);
    if (!fs.existsSync(workflowsDir)) {
      fs.mkdirSync(workflowsDir, { recursive: true });
    }
    
    // Speichere Workflow
    fs.writeFileSync(workflowFile, JSON.stringify(workflow, null, 2), 'utf8');
    console.log(`   ✅ Workflow gespeichert: ${workflowFile}\n`);
    
    // 3. Git Status
    console.log('3. GIT STATUS...\n');
    const repoRoot = path.join(__dirname, '..');
    process.chdir(repoRoot);
    
    try {
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8', cwd: repoRoot });
      console.log(`   Geänderte Dateien:\n${gitStatus || '   (keine)'}\n`);
    } catch (e) {
      console.log(`   ⚠️  Git Status fehlgeschlagen: ${e.message}\n`);
    }
    
    // 4. Git Add
    console.log('4. GIT ADD...\n');
    try {
      execSync(`git add "${workflowFile}"`, { encoding: 'utf8', cwd: repoRoot });
      console.log(`   ✅ Datei hinzugefügt: ${path.basename(workflowFile)}\n`);
    } catch (e) {
      console.log(`   ⚠️  Git Add fehlgeschlagen: ${e.message}\n`);
    }
    
    // 5. Git Commit
    console.log('5. GIT COMMIT...\n');
    const timestamp = new Date().toISOString();
    const commitMessage = `Export Workflow: ${workflow.name} (${WORKFLOW_ID}) - ${timestamp}`;
    
    try {
      execSync(`git commit -m "${commitMessage}"`, { encoding: 'utf8', cwd: repoRoot });
      console.log(`   ✅ Commit erstellt: ${commitMessage}\n`);
    } catch (e) {
      // Möglicherweise keine Änderungen
      if (e.message.includes('nothing to commit')) {
        console.log(`   ℹ️  Keine Änderungen zum Committen\n`);
      } else {
        console.log(`   ⚠️  Git Commit fehlgeschlagen: ${e.message}\n`);
      }
    }
    
    // 6. Git Push
    console.log('6. GIT PUSH...\n');
    try {
      execSync('git push', { encoding: 'utf8', cwd: repoRoot });
      console.log(`   ✅ Push zu GitHub erfolgreich!\n`);
    } catch (e) {
      console.log(`   ⚠️  Git Push fehlgeschlagen: ${e.message}\n`);
      console.log(`   💡 Bitte manuell pushen: git push\n`);
    }
    
    // 7. REPORT
    console.log('='.repeat(80));
    console.log('REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log('✅ WORKFLOW EXPORTIERT:\n');
    console.log(`   Workflow: ${workflow.name}`);
    console.log(`   ID: ${WORKFLOW_ID}`);
    console.log(`   Datei: ${path.basename(workflowFile)}`);
    console.log(`   Nodes: ${workflow.nodes.length}`);
    console.log(`   Status: ${workflow.active ? 'Aktiv' : 'Inaktiv'}`);
    console.log(`\n📋 NÄCHSTE SCHRITTE:\n`);
    console.log(`   1. Switch Nodes in n8n UI neu konfigurieren`);
    console.log(`   2. Connections richtig setzen`);
    console.log(`   3. Auto-Deploy testen`);
    console.log(`   4. Verifizieren\n`);
    
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
  exportWorkflowToGitHub();
}

module.exports = { exportWorkflowToGitHub };


