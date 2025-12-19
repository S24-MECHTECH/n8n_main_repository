/**
 * Create GitHub Pull Request
 * Erstellt einen PR für den Route-by-Priority Fix
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OWNER = 'S24-MECHTECH';
const REPO = 'n8n_main_repository';
const BRANCH_HEAD = 'fix/route-by-priority-multi-ai';
const BRANCH_BASE = 'main';

const PR_TITLE = 'Multi-AI: Route by Priority Complete Fix';
const PR_BODY = `## Multi-AI Orchestration Process

### Phase 1 - Senior Analysis (Opus)
- Route-by-Priority-Struktur analysiert
- Verbindungsprobleme identifiziert
- Fix-Plan erstellt

### Phase 2 - Junior Implementation (Sonnet)
- fix-route-by-priority-complete.js erstellt
- Fix-Logik vollständig implementiert
- Code validation passed

### Phase 3 - Service Optimization
- Auto-Optimierung durchgeführt
- Workflow-Konfiguration verifiziert
- Production-ready

### Phase 4 - Git Integration
- Commit erfolgreich erstellt
- Multi-AI Process dokumentiert

### Phase 5 - Orchestrator Verification
- n8n Workflow Status: KORREKT
- Alle Route-Verbindungen: FIXED
- Ready for Production ✅

## Status
✅ Analysis Complete
✅ Implementation Complete  
✅ Optimization Complete
✅ Git Ready
✅ n8n Verified

## Ready to Merge
This PR completes the Multi-AI Route-by-Priority fix.
All 6 channels should now be active.
No further changes needed.`;

// GitHub Token finden
function getGitHubToken() {
  // Aus Umgebungsvariable
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }
  
  // Aus Config-Dateien
  const configPaths = [
    path.join(__dirname, '..', '..', '.cursor', 'mcp.json'),
    path.join(process.env.USERPROFILE || process.env.HOME, '.cursor', 'mcp.json'),
    path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json')
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        // Suche nach GitHub Token in verschiedenen Pfaden
        if (config.github?.token) return config.github.token;
        if (config.mcpServers?.github?.env?.GITHUB_TOKEN) return config.mcpServers.github.env.GITHUB_TOKEN;
      }
    } catch (error) {}
  }
  
  return null;
}

function githubRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const token = getGitHubToken();
    if (!token) {
      reject(new Error('GitHub Token nicht gefunden! Setzen Sie GITHUB_TOKEN oder konfigurieren Sie es in mcp.json'));
      return;
    }
    
    const url = new URL(`https://api.github.com${endpoint}`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Node.js PR Creator',
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
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

async function createPullRequest() {
  console.log('\n' + '='.repeat(80));
  console.log('🔗 CREATE GITHUB PULL REQUEST');
  console.log('='.repeat(80) + '\n');
  
  try {
    console.log(`📋 Pull Request Details:`);
    console.log(`   Title: ${PR_TITLE}`);
    console.log(`   Head: ${BRANCH_HEAD}`);
    console.log(`   Base: ${BRANCH_BASE}`);
    console.log(`   Repository: ${OWNER}/${REPO}\n`);
    
    console.log('📤 Erstelle Pull Request...\n');
    
    const prData = {
      title: PR_TITLE,
      body: PR_BODY,
      head: BRANCH_HEAD,
      base: BRANCH_BASE
    };
    
    const pr = await githubRequest(`/repos/${OWNER}/${REPO}/pulls`, 'POST', prData);
    
    console.log('✅ Pull Request erfolgreich erstellt!\n');
    console.log(`📊 Details:`);
    console.log(`   PR #${pr.number}: ${pr.title}`);
    console.log(`   URL: ${pr.html_url}`);
    console.log(`   State: ${pr.state}`);
    console.log(`   Head: ${pr.head.ref}`);
    console.log(`   Base: ${pr.base.ref}\n`);
    
    console.log('='.repeat(80) + '\n');
    
    return pr;
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    
    // Fallback: Zeige manuelle URL
    console.log('\n💡 ALTERNATIVE: Manuell erstellen');
    console.log(`   URL: https://github.com/${OWNER}/${REPO}/compare/${BRANCH_BASE}...${BRANCH_HEAD}`);
    console.log(`   Oder: https://github.com/${OWNER}/${REPO}/pull/new/${BRANCH_HEAD}\n`);
    
    process.exit(1);
  }
}

createPullRequest();
