#!/usr/bin/env node
/**
 * ANALYZE EXECUTION LOGS
 * 
 * Analysiert die Logs einer Workflow-Execution,
 * speziell für den "Format Status Response" Node
 * 
 * Usage: node analyze-execution-logs.js [executionId]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';
const N8N_BASE_URL = 'https://n8n.srv1091615.hstgr.cloud';
const TARGET_NODE = 'Format Status Response';

// API Key laden (gleiche Logik wie update-workflow-direct.js)
function loadApiKey() {
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
  
  throw new Error('n8n API Key nicht gefunden! Check n8n_Admin_token_12_12_25.txt oder n8n_API_CLAUDE_CONTROLL.txt');
}

// HTTP Request Helper
function n8nRequest(endpoint, method = 'GET') {
  return new Promise((resolve, reject) => {
    const apiKey = loadApiKey();
    const url = new URL(N8N_BASE_URL + endpoint);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Parse Error: ${e.message} | Body: ${body.substring(0, 200)}`));
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Hole letzte Execution
async function getLatestExecution() {
  try {
    const executions = await n8nRequest(`/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=5`);
    
    if (executions.data && executions.data.length > 0) {
      const exec = executions.data[0];
      console.log(`📊 Neueste Execution:`);
      console.log(`   ID: ${exec.id}`);
      console.log(`   Status: ${exec.finished ? 'FINISHED' : 'RUNNING'}`);
      console.log(`   Started: ${exec.startedAt || 'unknown'}\n`);
      return exec.id;
    }
    
    return null;
  } catch (error) {
    console.log(`⚠️  Fehler beim Abrufen der Executions: ${error.message}\n`);
    throw error;
  }
}

// Hole Execution-Details mit Run-Data
async function getExecutionDetails(executionId) {
  console.log(`📥 Hole Execution-Details für ID: ${executionId}...\n`);
  
  try {
    const execution = await n8nRequest(`/api/v1/executions/${executionId}`);
    return execution.data;
  } catch (error) {
    console.log(`❌ Fehler beim Abrufen der Execution-Details: ${error.message}`);
    throw error;
  }
}

// Analysiere Run-Data für Format Status Response Node
function analyzeNodeLogs(executionData) {
  console.log('='.repeat(100));
  console.log('📋 ANALYSE: Format Status Response Node');
  console.log('='.repeat(100) + '\n');
  
  if (!executionData?.resultData?.runData) {
    console.log('❌ Keine Run-Data gefunden\n');
    console.log('Verfügbare Keys:', Object.keys(executionData || {}));
    return;
  }
  
  const runData = executionData.resultData.runData;
  
  // Suche nach Node (kann verschiedene Schreibweisen haben)
  let targetNode = null;
  let nodeKey = null;
  
  for (const key of Object.keys(runData)) {
    if (key.includes('Format Status') || key.includes('format status')) {
      targetNode = runData[key];
      nodeKey = key;
      break;
    }
  }
  
  if (!targetNode || !targetNode[0]) {
    console.log(`❌ Node "${TARGET_NODE}" nicht in Run-Data gefunden\n`);
    console.log('📋 Verfügbare Nodes:');
    Object.keys(runData).forEach(name => console.log(`   - ${name}`));
    console.log('');
    return;
  }
  
  const nodeExecution = targetNode[0];
  
  console.log(`✅ Node "${nodeKey}" gefunden!\n`);
  
  // Zeige Input-Daten
  if (nodeExecution.data?.input?.main) {
    console.log('📥 INPUT DATA:');
    const inputItems = nodeExecution.data.input.main[0] || [];
    inputItems.forEach((item, idx) => {
      console.log(`\n   Input Item ${idx + 1}:`);
      console.log(JSON.stringify(item.json || item, null, 2));
    });
    console.log('');
  }
  
  // Zeige Output-Daten
  if (nodeExecution.data?.output?.main) {
    console.log('📤 OUTPUT DATA:');
    const outputItems = nodeExecution.data.output.main[0] || [];
    outputItems.forEach((item, idx) => {
      console.log(`\n   Output Item ${idx + 1}:`);
      console.log(JSON.stringify(item.json || item, null, 2));
    });
    console.log('');
  }
  
  // Zeige Execution-Info
  console.log('⏱️  EXECUTION INFO:');
  if (nodeExecution.executionTime) {
    console.log(`   Execution Time: ${nodeExecution.executionTime}ms`);
  }
  if (nodeExecution.startTime) {
    console.log(`   Start Time: ${nodeExecution.startTime}`);
  }
  if (nodeExecution.stopTime) {
    console.log(`   Stop Time: ${nodeExecution.stopTime}`);
  }
  console.log('');
  
  if (nodeExecution.error) {
    console.log(`\n❌ ERROR:`);
    console.log(JSON.stringify(nodeExecution.error, null, 2));
    console.log('');
  }
  
  // Zeige Debug-Logs (Console.log Output sollte in Execution-Logs sein)
  console.log('\n' + '='.repeat(100));
  console.log('🔍 DEBUG LOGS (Console.log Output):');
  console.log('='.repeat(100));
  console.log('ℹ️  Hinweis: Console.log Output erscheint normalerweise in den n8n Execution-Logs.');
  console.log('   Bitte prüfen Sie die n8n UI für detaillierte Console-Logs.\n');
  
  // Zeige alle verfügbaren Daten für weitere Analyse
  console.log('='.repeat(100));
  console.log('📦 VOLLSTÄNDIGE NODE-DATEN (für Debugging):');
  console.log('='.repeat(100) + '\n');
  console.log(JSON.stringify(nodeExecution, null, 2));
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const executionId = args[0];
  
  console.log('\n' + '='.repeat(100));
  console.log('🔍 EXECUTION LOG ANALYSIS');
  console.log(`   Workflow ID: ${WORKFLOW_ID}`);
  console.log(`   Target Node: ${TARGET_NODE}`);
  console.log('='.repeat(100) + '\n');
  
  try {
    let execId = executionId;
    
    if (!execId) {
      console.log('📊 Keine Execution ID angegeben, hole neueste Execution...\n');
      execId = await getLatestExecution();
    }
    
    if (!execId) {
      console.log('❌ Keine Execution gefunden.\n');
      console.log('💡 Bitte führen Sie den Workflow in n8n aus oder geben Sie eine Execution ID an:');
      console.log('   node analyze-execution-logs.js <executionId>\n');
      process.exit(1);
    }
    
    // Hole Execution-Details
    const executionData = await getExecutionDetails(execId);
    
    // Analysiere Logs
    analyzeNodeLogs(executionData);
    
    console.log('\n✅ Analyse abgeschlossen!\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.message.includes('401')) {
      console.error('\n💡 API Key Problem. Bitte prüfen Sie:');
      console.error('   1. API Key Dateien existieren');
      console.error('   2. API Key hat workflow:read und execution:read Scopes');
    }
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { getLatestExecution, getExecutionDetails, analyzeNodeLogs };
