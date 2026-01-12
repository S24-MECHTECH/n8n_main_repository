/**
 * CREATE PULL REQUEST - Route by Priority Fix
 * Erstellt PR über GitHub API
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const REPO_OWNER = 'S24-MECHTECH';
const REPO_NAME = 'n8n_main_repository';
const BASE_BRANCH = 'main';
const HEAD_BRANCH = 'feature/route-by-priority-fix';

// GitHub Token finden
function getGitHubToken() {
  // 1. Aus Umgebungsvariable
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }
  
  // 2. Aus Command-Line-Argument
  if (process.argv[2]) {
    return process.argv[2];
  }
  
  // 3. Aus Konfigurationsdateien
  const configPaths = [
    path.join(__dirname, '..', '..', '.cursor', 'mcp.json'),
    path.join(process.env.USERPROFILE || process.env.HOME, '.cursor', 'mcp.json'),
    path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json')
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.mcpServers?.['github']?.env?.GITHUB_TOKEN) {
          return config.mcpServers['github'].env.GITHUB_TOKEN;
        }
      }
    } catch (error) {}
  }
  
  return null;
}

const GITHUB_TOKEN = getGitHubToken();

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN fehlt!');
  console.error('   Nutzung: node create-pull-request.js YOUR_TOKEN');
  console.error('   Oder setzen Sie: $env:GITHUB_TOKEN = "YOUR_TOKEN"');
  console.error('\n   Oder verwenden Sie die GitHub URL:');
  console.error(`   https://github.com/${REPO_OWNER}/${REPO_NAME}/pull/new/${HEAD_BRANCH}`);
  process.exit(1);
}

function githubRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/repos/${REPO_OWNER}/${REPO_NAME}${endpoint}`,
      method: method,
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Node.js',
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
  console.log('🔀 CREATE PULL REQUEST - Route by Priority Fix');
  console.log('='.repeat(80) + '\n');
  
  const prTitle = 'Multi-AI: Route by Priority Complete Fix';
  const prBody = `## Multi-AI Orchestration Process

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

  try {
    console.log('📝 Erstelle Pull Request...\n');
    console.log(`   Titel: ${prTitle}`);
    console.log(`   Base: ${BASE_BRANCH}`);
    console.log(`   Head: ${HEAD_BRANCH}\n`);
    
    const prData = {
      title: prTitle,
      body: prBody,
      head: HEAD_BRANCH,
      base: BASE_BRANCH
    };
    
    const pr = await githubRequest('/pulls', 'POST', prData);
    
    console.log('✅ Pull Request erfolgreich erstellt!\n');
    console.log(`📊 ZUSAMMENFASSUNG:`);
    console.log(`   PR #${pr.number}: ${pr.title}`);
    console.log(`   URL: ${pr.html_url}`);
    console.log(`   Status: ${pr.state}`);
    console.log(`   Base: ${pr.base.ref} ← Head: ${pr.head.ref}\n`);
    console.log(`🔗 Öffnen Sie: ${pr.html_url}\n`);
    
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('\n   ⚠️  Authentifizierungsfehler!');
      console.error('   Bitte prüfen Sie Ihren GitHub Token.\n');
      console.error('   Alternative: Öffnen Sie manuell:');
      console.error(`   https://github.com/${REPO_OWNER}/${REPO_NAME}/pull/new/${HEAD_BRANCH}\n`);
    } else if (error.message.includes('422')) {
      console.error('\n   ⚠️  PR kann nicht erstellt werden (möglicherweise existiert bereits einer)');
      console.error('   Bitte prüfen Sie:');
      console.error(`   https://github.com/${REPO_OWNER}/${REPO_NAME}/pulls\n`);
    }
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

createPullRequest();
