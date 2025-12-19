#!/usr/bin/env node
/**
 * UPDATE WORKFLOW DIRECTLY VIA n8n HTTP API
 * Extrahiert Bearer Token aus mcp.json und updated Workflow direkt
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { notifyRunning, notifyDone, notifyError } = require('./claude-direct-post');

const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';
const N8N_URL = 'https://n8n.srv1091615.hstgr.cloud';
const MCP_CONFIG_PATH = path.join(require('os').homedir(), '.cursor', 'mcp.json');
const WORKFLOW_FILE = path.join(__dirname, '..', 'workflows', `MERCHANT_CENTER_ADMIN_${WORKFLOW_ID}.json`);

/**
 * Extrahiere n8n API Key aus Credentials Datei
 */
function extractApiKey() {
  // 1. PRIORITÄT: Versuche aus n8n_Admin_token_12_12_25.txt (n8n_API_mcp_full_access)
  const adminTokenFile = path.join('d:', 'MAMP', 'N8N-PROJEKT_INFOS', '000_Hostinger(DE-und_EN)', 'n8n_Admin', 'n8n_Admin_token_12_12_25.txt');
  
  if (fs.existsSync(adminTokenFile)) {
    const content = fs.readFileSync(adminTokenFile, 'utf8');
    // Suche nach API Key Pattern (JWT Token)
    const tokenMatch = content.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (tokenMatch && tokenMatch[0]) {
      return tokenMatch[0].trim();
    }
  }
  
  // 2. FALLBACK: Versuche aus n8n_API_CLAUDE_CONTROLL.txt (public-api Token - letzte Zeile)
  const claudeControlFile = path.join('d:', 'MAMP', 'N8N-PROJEKT_INFOS', 'MCP_SERVER_ALL', 'n8n_API_CLAUDE_CONTROLL.txt');
  
  if (fs.existsSync(claudeControlFile)) {
    const content = fs.readFileSync(claudeControlFile, 'utf8');
    // Suche nach allen JWT Tokens und nimm den letzten (public-api)
    const tokenMatches = content.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g);
    if (tokenMatches && tokenMatches.length > 0) {
      // Nimm den letzten Token (sollte public-api sein)
      const lastToken = tokenMatches[tokenMatches.length - 1];
      return lastToken.trim();
    }
  }
  
  // 2. Fallback: Versuche aus MCP_SERVER_API_Zugänge.txt (aber das ist MCP_API_KEY, nicht HTTP API Key)
  const credentialsFile = path.join('d:', 'MAMP', 'N8N-PROJEKT_INFOS', '000_Hostinger(DE-und_EN)', 'MCP_SERVER', 'MCP_SERVER_API_Zugänge.txt');
  
  if (fs.existsSync(credentialsFile)) {
    const content = fs.readFileSync(credentialsFile, 'utf8');
    const match = content.match(/MCP_API_KEY=([^\s\r\n]+)/);
    if (match && match[1]) {
      // Warnung: MCP_API_KEY funktioniert nicht für HTTP API, aber versuchen wir es trotzdem
      console.log(`   ⚠️  Using MCP_API_KEY (may not work for HTTP API)`);
      return match[1].trim();
    }
  }
  
  // Fallback: Versuche aus mcp.json Bearer Token zu extrahieren
  if (fs.existsSync(MCP_CONFIG_PATH)) {
    const mcpConfig = JSON.parse(fs.readFileSync(MCP_CONFIG_PATH, 'utf8'));
    const n8nConfig = mcpConfig.mcpServers?.['n8n-mcp'];
    
    if (n8nConfig?.args) {
      for (let i = 0; i < n8nConfig.args.length; i++) {
        if (n8nConfig.args[i] === '--header' && n8nConfig.args[i + 1]) {
          const headerValue = n8nConfig.args[i + 1];
          const match = headerValue.match(/authorization:Bearer\s+(.+)/i);
          if (match) {
            return match[1].trim();
          }
        }
      }
    }
  }
  
  throw new Error('n8n API Key not found! Check n8n_Admin_token_12_12_25.txt, n8n_API_CLAUDE_CONTROLL.txt, MCP_SERVER_API_Zugänge.txt or mcp.json');
}

/**
 * n8n API HTTP Request
 */
function n8nRequest(endpoint, method = 'GET', body = null, apiKey = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${N8N_URL}${endpoint}`);
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    // n8n API benötigt X-N8N-API-KEY Header
    if (apiKey) {
      headers['X-N8N-API-KEY'] = apiKey;
    }
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + (url.search || ''),
      method: method,
      headers: headers
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
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 500)}`));
        }
      });
    });
    
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function updateWorkflow() {
  console.log('\n' + '='.repeat(100));
  console.log('UPDATE WORKFLOW DIRECTLY VIA n8n HTTP API');
  console.log('='.repeat(100) + '\n');
  
  try {
    // 1. Extrahiere n8n API Key
    console.log('🔑 Extracting n8n API Key from credentials...');
    const apiKey = extractApiKey();
    console.log(`✅ API Key extracted: ${apiKey.substring(0, 20)}...\n`);
    
    // 2. Lade gefixten Workflow
    console.log(`📄 Loading fixed workflow: ${WORKFLOW_FILE}`);
    if (!fs.existsSync(WORKFLOW_FILE)) {
      throw new Error(`Workflow file not found: ${WORKFLOW_FILE}`);
    }
    
    const workflow = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));
    console.log(`✅ Workflow loaded: ${workflow.name}`);
    console.log(`   ID: ${workflow.id}`);
    console.log(`   Nodes: ${workflow.nodes.length}\n`);
    
    // 3. Prüfe ob alle Nodes 'disabled' haben
    const nodesWithoutDisabled = workflow.nodes.filter(node => !node.hasOwnProperty('disabled'));
    if (nodesWithoutDisabled.length > 0) {
      throw new Error(`${nodesWithoutDisabled.length} nodes still missing 'disabled' property! Run: node scripts/analysis/claude-analyze-workflow.js --fix-disabled`);
    }
    
    console.log(`✅ All ${workflow.nodes.length} nodes have 'disabled' property\n`);
    
    // 4. Hole aktuellen Workflow (für Vergleich)
    console.log('📥 Fetching current workflow from server...');
    let currentWorkflow;
    try {
      currentWorkflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'GET', null, apiKey);
      console.log(`✅ Current workflow loaded: ${currentWorkflow.name}\n`);
    } catch (error) {
      console.log(`⚠️  Could not fetch current workflow: ${error.message}\n`);
      console.log('   Continuing with update anyway...\n');
    }
    
    // 5. Bereite Update-Payload vor (NUR erlaubte Felder!)
    console.log('🔧 Preparing update payload (only allowed fields)...');
    const payload = {
      name: workflow.name,  // REQUIRED by n8n API
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: { executionOrder: workflow.settings?.executionOrder || 'v1' }
      // active ist read-only - wird NICHT gesendet
    };
    
    // ENTFERNT: id, createdAt, updatedAt, meta, pinData, tags, description, active, etc.
    
    console.log(`   Name: ${payload.name}`);
    console.log(`   Nodes: ${payload.nodes.length}`);
    console.log(`   Connections: ${Object.keys(payload.connections).length} source nodes`);
    console.log(`   Settings: executionOrder = ${payload.settings.executionOrder}\n`);
    
    // 6. Aktualisiere Workflow via PUT (n8n API erfordert PUT für Updates)
    console.log(`💾 Uploading fixed workflow to n8n server...`);
    console.log(`   PUT ${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}\n`);
    
    const result = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', payload, apiKey);
    
    console.log('✅ Workflow successfully updated on server!\n');
    console.log('📊 SUMMARY:');
    console.log(`   Workflow: ${result.name || workflow.name}`);
    console.log(`   ID: ${result.id || workflow.id}`);
    console.log(`   Active: ${result.active !== undefined ? (result.active ? '✅' : '❌') : 'N/A'}`);
    console.log(`   Nodes: ${result.nodes?.length || workflow.nodes.length}\n`);
    
    console.log('🎉 All done! The workflow should now work without crashes.\n');
    
    // POST an Claude: DONE
    try {
      await notifyDone(
        'update_workflow',
        'Workflow updated on n8n server',
        `Workflow ${result.id} updated successfully. Nodes: ${result.nodes?.length || workflow.nodes.length}`,
        `Updated workflow: ${result.name || workflow.name}`
      );
    } catch (e) {
      console.log('⚠️  Could not notify Claude (continuing anyway):', e.message);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    
    // POST an Claude: ERROR
    try {
      await notifyError('update_workflow', 'Workflow update failed', error);
    } catch (e) {
      console.log('⚠️  Could not notify Claude about error:', e.message);
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  updateWorkflow();
}

module.exports = { updateWorkflow };
