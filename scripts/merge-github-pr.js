/**
 * Merge GitHub Pull Request
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OWNER = 'S24-MECHTECH';
const REPO = 'n8n_main_repository';
const PR_NUMBER = 5; // PR #5

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  
  const configPaths = [
    path.join(__dirname, '..', '..', '.cursor', 'mcp.json'),
    path.join(process.env.USERPROFILE || process.env.HOME, '.cursor', 'mcp.json'),
    path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json')
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
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
      reject(new Error('GitHub Token nicht gefunden!'));
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
        'User-Agent': 'Node.js PR Merger',
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

async function mergePullRequest() {
  console.log('\n' + '='.repeat(80));
  console.log('🔀 MERGE GITHUB PULL REQUEST');
  console.log('='.repeat(80) + '\n');
  
  try {
    console.log(`📋 Merge PR #${PR_NUMBER}...\n`);
    
    const mergeData = {
      commit_title: `Merge PR #${PR_NUMBER}: Multi-AI Route by Priority Complete Fix`,
      commit_message: 'Multi-AI orchestration completed. Route-by-Priority fix deployed.',
      merge_method: 'merge'
    };
    
    const result = await githubRequest(`/repos/${OWNER}/${REPO}/pulls/${PR_NUMBER}/merge`, 'PUT', mergeData);
    
    console.log('✅ Pull Request erfolgreich gemerged!\n');
    console.log(`📊 Details:`);
    console.log(`   PR #${PR_NUMBER}: Merged`);
    console.log(`   SHA: ${result.sha}`);
    console.log(`   Merged: ${result.merged}`);
    console.log(`   URL: https://github.com/${OWNER}/${REPO}/pull/${PR_NUMBER}\n`);
    
    console.log('='.repeat(80) + '\n');
    
    return result;
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

mergePullRequest();
