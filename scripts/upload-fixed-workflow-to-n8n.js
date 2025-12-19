#!/usr/bin/env node
/**
 * UPLOAD FIXED WORKFLOW TO N8N SERVER
 * Aktualisiert den gefixten Workflow auf dem n8n Server
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Konfiguration
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';
const WORKFLOW_FILE = path.join(__dirname, '..', 'workflows', `MERCHANT_CENTER_ADMIN_${WORKFLOW_ID}.json`);
const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';

// Lade n8n Bearer Token aus mcp.json
function getApiKey() {
  const mcpConfigPath = path.join(require('os').homedir(), '.cursor', 'mcp.json');
  
  if (fs.existsSync(mcpConfigPath)) {
    const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
    const n8nConfig = mcpConfig.mcpServers?.['n8n-mcp'];
    
    // Prüfe ob Bearer Token im Authorization Header
    if (n8nConfig?.args) {
      for (let i = 0; i < n8nConfig.args.length; i++) {
        if (n8nConfig.args[i] === '--header' && n8nConfig.args[i + 1]) {
          const headerValue = n8nConfig.args[i + 1];
          const match = headerValue.match(/authorization:Bearer\s+(.+)/);
          if (match) {
            return match[1].trim();
          }
        }
      }
    }
    
    // Fallback: direktes env
    if (n8nConfig?.env?.N8N_API_KEY) {
      return n8nConfig.env.N8N_API_KEY;
    }
  }
  
  // Fallback: aus Umgebungsvariable oder CLI Argument
  return process.env.N8N_API_KEY || process.argv[2];
}

let N8N_API_KEY = getApiKey() || process.argv[2] || process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY fehlt!');
  console.error('\nBitte einen n8n API Key angeben:');
  console.error('  1. Als Argument: node upload-fixed-workflow-to-n8n.js <API_KEY>');
  console.error('  2. Als Umgebungsvariable: $env:N8N_API_KEY="xxx"; node upload-fixed-workflow-to-n8n.js');
  console.error('\nAPI Key erstellen:');
  console.error('  1. Öffne: https://n8n.srv1091615.hstgr.cloud');
  console.error('  2. Settings → API → Create API Key');
  console.error('  3. Scopes: workflow:read, workflow:write, workflow:execute\n');
  process.exit(1);
}

/**
 * n8n API Request
 */
function n8nRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${N8N_URL}${endpoint}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + (url.search || ''),
      method: method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json',
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

async function uploadWorkflow() {
  console.log('\n' + '='.repeat(100));
  console.log('UPLOAD FIXED WORKFLOW TO N8N SERVER');
  console.log('='.repeat(100) + '\n');
  
  console.log(`📄 Loading fixed workflow: ${WORKFLOW_FILE}`);
  
  if (!fs.existsSync(WORKFLOW_FILE)) {
    console.error(`❌ Workflow file not found: ${WORKFLOW_FILE}`);
    process.exit(1);
  }
  
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));
  
  console.log(`✅ Workflow loaded: ${workflow.name}`);
  console.log(`   ID: ${workflow.id}`);
  console.log(`   Nodes: ${workflow.nodes.length}\n`);
  
  // Prüfe ob alle Nodes 'disabled' haben
  const nodesWithoutDisabled = workflow.nodes.filter(node => !node.hasOwnProperty('disabled'));
  if (nodesWithoutDisabled.length > 0) {
    console.error(`❌ ERROR: ${nodesWithoutDisabled.length} nodes still missing 'disabled' property!`);
    console.error('   Please run: node scripts/analysis/claude-analyze-workflow.js --fix-disabled');
    process.exit(1);
  }
  
  console.log(`✅ All ${workflow.nodes.length} nodes have 'disabled' property\n`);
  
  try {
    // 1. Hole aktuellen Workflow (für Update)
    console.log('📥 Fetching current workflow from server...');
    const currentWorkflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`✅ Current workflow loaded: ${currentWorkflow.name}\n`);
    
    // 2. Bereite Update-Payload vor
    console.log('🔧 Preparing update payload...');
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {},
      tags: workflow.tags || [],
      active: workflow.active,
      description: workflow.description || ''
    };
    
    console.log(`   Nodes: ${updatePayload.nodes.length}`);
    console.log(`   Active: ${updatePayload.active}\n`);
    
    // 3. Aktualisiere Workflow
    console.log('💾 Uploading fixed workflow to n8n server...');
    const result = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    
    console.log('✅ Workflow successfully updated on server!\n');
    console.log('📊 SUMMARY:');
    console.log(`   Workflow: ${result.name}`);
    console.log(`   ID: ${result.id}`);
    console.log(`   Active: ${result.active ? '✅' : '❌'}`);
    console.log(`   Nodes: ${result.nodes?.length || 'N/A'}\n`);
    
    console.log('🎉 All done! The workflow should now work without crashes.\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  uploadWorkflow();
}

module.exports = { uploadWorkflow };
