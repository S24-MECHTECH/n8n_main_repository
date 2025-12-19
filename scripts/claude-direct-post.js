#!/usr/bin/env node
/**
 * CLAUDE DIRECT POST - AKTIVIEREN!
 * 
 * Nach JEDEM Schritt:
 * POST zu Claude via Hostinger MCP!
 * 
 * Format:
 * {
 *   "to": "claude",
 *   "timestamp": "JETZT",
 *   "action": "was du machst",
 *   "status": "RUNNING|DONE|ERROR",
 *   "details": {
 *     "task": "Beschreibung",
 *     "result": "Was passiert ist",
 *     "workflow_hash": "MD5",
 *     "changes": "Was geändert"
 *   }
 * }
 * 
 * Claude antwortet SOFORT:
 * - Gut oder falsch?
 * - Weitermachen oder stoppen?
 * - Nächster Schritt?
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// Konfiguration
const CLAUDE_ENDPOINT = process.env.CLAUDE_ENDPOINT || 'https://n8n.srv1091615.hstgr.cloud/webhook/claude-direct-post';
const WORKFLOW_FILE = path.join(__dirname, '..', 'workflows', 'MERCHANT_CENTER_ADMIN_ftZOou7HNgLOwzE5.json');

/**
 * Berechne MD5 Hash des Workflows
 */
function calculateWorkflowHash() {
  if (fs.existsSync(WORKFLOW_FILE)) {
    const content = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    return crypto.createHash('md5').update(content, 'utf8').digest('hex');
  }
  return null;
}

/**
 * Sende POST Request an Claude
 */
function postToClaude(data) {
  return new Promise((resolve, reject) => {
    const url = new URL(CLAUDE_ENDPOINT);
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + (url.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'n8n-workflow-lockdown/1.0'
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonResponse = JSON.parse(responseData);
            resolve(jsonResponse);
          } catch (e) {
            resolve({ status: 'success', message: responseData });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData.substring(0, 500)}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Hauptfunktion: POST an Claude senden
 */
async function sendPostToClaude(action, status, details) {
  console.log('\n' + '='.repeat(100));
  console.log('📤 CLAUDE DIRECT POST');
  console.log('='.repeat(100) + '\n');
  
  try {
    const workflowHash = calculateWorkflowHash();
    
    const payload = {
      to: "claude",
      timestamp: new Date().toISOString(),
      action: action,
      status: status, // RUNNING | DONE | ERROR
      details: {
        task: details.task || action,
        result: details.result || 'No result provided',
        workflow_hash: workflowHash,
        changes: details.changes || 'No changes specified'
      }
    };
    
    // Füge zusätzliche Details hinzu, falls vorhanden
    if (details.checksum) {
      payload.details.checksum = details.checksum;
    }
    if (details.workflow_id) {
      payload.details.workflow_id = details.workflow_id;
    }
    if (details.error) {
      payload.details.error = details.error;
    }
    
    console.log('📋 Payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n📤 Sending POST to Claude...');
    console.log(`   Endpoint: ${CLAUDE_ENDPOINT}\n`);
    
    const response = await postToClaude(payload);
    
    console.log('✅ Response received from Claude:\n');
    console.log(JSON.stringify(response, null, 2));
    console.log('\n');
    
    return response;
    
  } catch (error) {
    console.error('❌ ERROR sending POST to Claude:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
}

/**
 * Convenience Funktionen für verschiedene Status
 */
async function notifyRunning(action, task) {
  return await sendPostToClaude(action, 'RUNNING', {
    task: task,
    result: 'Task started',
    changes: 'Starting execution'
  });
}

async function notifyDone(action, task, result, changes = null) {
  return await sendPostToClaude(action, 'DONE', {
    task: task,
    result: result,
    changes: changes || 'Task completed successfully'
  });
}

async function notifyError(action, task, error) {
  return await sendPostToClaude(action, 'ERROR', {
    task: task,
    result: 'Task failed',
    error: error.message || error,
    changes: 'Error occurred during execution'
  });
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node claude-direct-post.js <action> <status> [task] [result] [changes]');
    console.error('  action: What you are doing (e.g., "backup", "update", "monitor")');
    console.error('  status: RUNNING | DONE | ERROR');
    console.error('  task: (optional) Task description');
    console.error('  result: (optional) What happened');
    console.error('  changes: (optional) What changed');
    console.error('\nExample:');
    console.error('  node claude-direct-post.js backup DONE "Workflow backup" "Backup completed" "Checksum updated"');
    process.exit(1);
  }
  
  const action = args[0];
  const status = args[1].toUpperCase();
  const task = args[2] || action;
  const result = args[3] || 'Task completed';
  const changes = args[4] || 'No changes';
  
  if (!['RUNNING', 'DONE', 'ERROR'].includes(status)) {
    console.error('❌ Invalid status. Must be RUNNING, DONE, or ERROR');
    process.exit(1);
  }
  
  sendPostToClaude(action, status, {
    task: task,
    result: result,
    changes: changes
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { 
  sendPostToClaude, 
  notifyRunning, 
  notifyDone, 
  notifyError 
};
