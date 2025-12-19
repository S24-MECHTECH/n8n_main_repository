#!/usr/bin/env node
/**
 * EXECUTE WORKFLOW AND CHECK LOGS
 * 
 * Führt den Workflow aus und analysiert die Logs,
 * speziell für den "Format Status Response" Node
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';
const N8N_BASE_URL = 'https://n8n.srv1091615.hstgr.cloud';
const TARGET_NODE = 'Format Status Response';

// API Key laden
function loadApiKey() {
  const credentialFiles = [
    path.join('d:', 'MAMP', 'N8N-PROJEKT_INFOS', '000_Hostinger(DE-und_EN)', 'n8n_Admin', 'n8n_Admin_token_12_12_25.txt'),
    path.join('d:', 'MAMP', 'N8N-PROJEKT_INFOS', 'MCP_SERVER_ALL', 'n8n_API_CLAUDE_CONTROLL.txt'),
  ];
  
  for (const file of credentialFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8').trim();
      const lines = content.split('\n').filter(l => l.trim().length > 20);
      if (lines.length > 0) {
        return lines[0].trim();
      }
    }
  }
  
  throw new Error('API Key nicht gefunden');
}

// HTTP Request Helper
function n8nRequest(endpoint, method = 'GET', data = null) {
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
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Workflow ausführen (manuell triggern)
async function executeWorkflow() {
  console.log('🚀 Starte Workflow-Ausführung...\n');
  
  try {
    // Führe Workflow aus (POST zum Execute-Endpoint)
    const response = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}/execute`, 'POST', {
      data: {},
      runData: {}
    });
    
    console.log('✅ Workflow gestartet!');
    console.log(`   Execution ID: ${response.executionId || response.data?.executionId || 'unknown'}\n`);
    
    return response.executionId || response.data?.executionId;
  } catch (error) {
    // Falls Execute nicht funktioniert, hole letzte Execution
    console.log(`⚠️  Workflow-Execute Fehler: ${error.message}`);
    console.log('   Versuche letzte Execution zu finden...\n');
    return null;
  }
}

// Hole letzte Execution
async function getLatestExecution() {
  try {
    const executions = await n8nRequest(`/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=1`);
    
    if (executions.data && executions.data.length > 0) {
      const exec = executions.data[0];
      console.log(`📊 Letzte Execution gefunden:`);
      console.log(`   ID: ${exec.id}`);
      console.log(`   Status: ${exec.finished ? 'FINISHED' : 'RUNNING'}`);
      console.log(`   Started: ${exec.startedAt || 'unknown'}\n`);
      return exec.id;
    }
    
    return null;
  } catch (error) {
    console.log(`⚠️  Fehler beim Abrufen der Executions: ${error.message}\n`);
    return null;
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
    return null;
  }
}

// Analysiere Run-Data für Format Status Response Node
function analyzeNodeLogs(executionData) {
  console.log('='.repeat(100));
  console.log('📋 ANALYSE: Format Status Response Node');
  console.log('='.repeat(100) + '\n');
  
  if (!executionData?.resultData?.runData) {
    console.log('❌ Keine Run-Data gefunden\n');
    return;
  }
  
  const runData = executionData.resultData.runData;
  const targetNode = runData[TARGET_NODE];
  
  if (!targetNode || !targetNode[0]) {
    console.log(`❌ Node "${TARGET_NODE}" nicht in Run-Data gefunden\n`);
    console.log('📋 Verfügbare Nodes:');
    Object.keys(runData).forEach(name => console.log(`   - ${name}`));
    console.log('');
    return;
  }
  
  const nodeExecution = targetNode[0];
  
  console.log(`✅ Node "${TARGET_NODE}" gefunden!\n`);
  
  // Zeige Input-Daten
  if (nodeExecution.data?.input) {
    console.log('📥 INPUT DATA:');
    console.log(JSON.stringify(nodeExecution.data.input, null, 2));
    console.log('');
  }
  
  // Zeige Output-Daten
  if (nodeExecution.data?.output) {
    console.log('📤 OUTPUT DATA:');
    console.log(JSON.stringify(nodeExecution.data.output, null, 2));
    console.log('');
  }
  
  // Zeige Execution-Info
  if (nodeExecution.executionTime) {
    console.log(`⏱️  Execution Time: ${nodeExecution.executionTime}ms`);
  }
  
  if (nodeExecution.error) {
    console.log(`\n❌ ERROR:`);
    console.log(JSON.stringify(nodeExecution.error, null, 2));
    console.log('');
  }
  
  // Suche nach Console-Logs (in output oder error)
  console.log('\n' + '='.repeat(100));
  console.log('🔍 DEBUG LOGS (aus Node Output):');
  console.log('='.repeat(100) + '\n');
  
  // Die Console-Logs sind normalerweise in den Output-Daten
  if (nodeExecution.data?.output?.main) {
    const outputs = nodeExecution.data.output.main[0] || [];
    outputs.forEach((item, idx) => {
      console.log(`\n📦 Output Item ${idx + 1}:`);
      console.log(JSON.stringify(item.json, null, 2));
    });
  }
}

// Main
async function main() {
  console.log('\n' + '='.repeat(100));
  console.log('🚀 WORKFLOW EXECUTE & LOG ANALYSIS');
  console.log(`   Workflow ID: ${WORKFLOW_ID}`);
  console.log(`   Target Node: ${TARGET_NODE}`);
  console.log('='.repeat(100) + '\n');
  
  try {
    // Versuche Workflow auszuführen
    let executionId = await executeWorkflow();
    
    // Falls nicht erfolgreich, hole letzte Execution
    if (!executionId) {
      executionId = await getLatestExecution();
    }
    
    if (!executionId) {
      console.log('❌ Keine Execution gefunden. Bitte Workflow manuell ausführen.\n');
      process.exit(1);
    }
    
    // Warte kurz auf Completion
    console.log('⏳ Warte 5 Sekunden auf Execution-Completion...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Hole Execution-Details
    const executionData = await getExecutionDetails(executionId);
    
    if (!executionData) {
      console.log('❌ Execution-Details konnten nicht geladen werden\n');
      process.exit(1);
    }
    
    // Analysiere Logs
    analyzeNodeLogs(executionData);
    
    console.log('\n✅ Analyse abgeschlossen!\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { executeWorkflow, getLatestExecution, getExecutionDetails, analyzeNodeLogs };
