#!/usr/bin/env node
/**
 * FETCH WORKFLOW FROM n8n SERVER
 * Lädt aktuellen Workflow direkt vom Server
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';
const N8N_URL = 'https://n8n.srv1091615.hstgr.cloud';

/**
 * Extrahiere n8n API Key aus Credentials Datei
 */
function extractApiKey() {
  // 1. PRIORITÄT: Versuche aus n8n_Admin_token_12_12_25.txt
  const adminTokenFile = path.join('d:', 'MAMP', 'N8N-PROJEKT_INFOS', '000_Hostinger(DE-und_EN)', 'n8n_Admin', 'n8n_Admin_token_12_12_25.txt');
  
  if (fs.existsSync(adminTokenFile)) {
    const content = fs.readFileSync(adminTokenFile, 'utf8');
    const tokenMatch = content.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (tokenMatch && tokenMatch[0]) {
      return tokenMatch[0].trim();
    }
  }
  
  // 2. FALLBACK: Versuche aus n8n_API_CLAUDE_CONTROLL.txt
  const claudeControlFile = path.join('d:', 'MAMP', 'N8N-PROJEKT_INFOS', 'MCP_SERVER_ALL', 'n8n_API_CLAUDE_CONTROLL.txt');
  
  if (fs.existsSync(claudeControlFile)) {
    const content = fs.readFileSync(claudeControlFile, 'utf8');
    const tokenMatches = content.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g);
    if (tokenMatches && tokenMatches.length > 0) {
      const lastToken = tokenMatches[tokenMatches.length - 1];
      return lastToken.trim();
    }
  }
  
  throw new Error('n8n API Key not found!');
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

async function fetchWorkflow() {
  console.log('\n' + '='.repeat(100));
  console.log('FETCH WORKFLOW FROM n8n SERVER');
  console.log('='.repeat(100) + '\n');
  
  try {
    // 1. Extrahiere n8n API Key
    console.log('🔑 Extracting n8n API Key...');
    const apiKey = extractApiKey();
    console.log(`✅ API Key extracted: ${apiKey.substring(0, 20)}...\n`);
    
    // 2. Hole Workflow vom Server
    console.log(`📥 Fetching workflow from server: ${N8N_URL}`);
    console.log(`   Workflow ID: ${WORKFLOW_ID}\n`);
    
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'GET', null, apiKey);
    
    console.log(`✅ Workflow loaded from server!`);
    console.log(`   Name: ${workflow.name}`);
    console.log(`   ID: ${workflow.id}`);
    console.log(`   Nodes: ${workflow.nodes.length}`);
    console.log(`   Active: ${workflow.active ? '✅' : '❌'}\n`);
    
    // 3. Speichere Workflow
    const outputFile = path.join(__dirname, '..', 'workflows', `MERCHANT_CENTER_ADMIN_${WORKFLOW_ID}_FROM_SERVER.json`);
    fs.writeFileSync(outputFile, JSON.stringify(workflow, null, 2));
    console.log(`💾 Workflow saved to: ${outputFile}\n`);
    
    return workflow;
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  fetchWorkflow();
}

module.exports = { fetchWorkflow };
