#!/usr/bin/env node
/**
 * CLAUDE DIRECT POST
 * 
 * Sendet POST nach jedem Schritt an Claude via HTTP
 * Claude antwortet SOFORT: Gut oder falsch? Weitermachen oder stoppen? Nächster Schritt?
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Konfiguration
const STATUS_FILE = path.join(__dirname, '..', 'cursor-status-live.json');
const WORKFLOW_FILE = path.join(__dirname, '..', 'workflows', 'MERCHANT_CENTER_ADMIN_ftZOou7HNgLOwzE5.json');

// TODO: Claude Webhook URL - muss noch konfiguriert werden
// Für jetzt: Status wird in cursor-status-live.json geschrieben
const CLAUDE_WEBHOOK_URL = process.env.CLAUDE_WEBHOOK_URL || null;

/**
 * Berechne MD5 Hash des Workflows (für workflow_hash)
 */
function calculateWorkflowHash() {
  try {
    if (fs.existsSync(WORKFLOW_FILE)) {
      const content = fs.readFileSync(WORKFLOW_FILE, 'utf8');
      return crypto.createHash('md5').update(content, 'utf8').digest('hex');
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

/**
 * POST zu Claude via HTTP
 */
function postToClaude(payload) {
  return new Promise((resolve, reject) => {
    if (!CLAUDE_WEBHOOK_URL) {
      // Fallback: Schreibe in Status File
      console.log('⚠️  Claude Webhook URL not configured. Writing to status file instead.');
      const statusData = {
        timestamp: new Date().toISOString(),
        current_task: `📤 POST to Claude: ${payload.action} (${payload.status})`,
        status: payload.status,
        progress: payload.status === 'RUNNING' ? '50%' : '100%',
        claude_post: payload,
        note: 'Webhook not available, using fallback to status file',
        workflow_id: 'ftZOou7HNgLOwzE5'
      };
      
      fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2), 'utf8');
      resolve({ success: true, method: 'status_file' });
      return;
    }

    const url = new URL(CLAUDE_WEBHOOK_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + (url.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'n8n-workflow-lockdown/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ success: true, response: JSON.parse(data), method: 'webhook' });
          } catch (e) {
            resolve({ success: true, response: data, method: 'webhook' });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 500)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * Notify Claude: RUNNING
 */
async function notifyRunning(action, task) {
  const workflowHash = calculateWorkflowHash();
  
  const payload = {
    to: 'claude',
    timestamp: new Date().toISOString(),
    action: action,
    status: 'RUNNING',
    details: {
      task: task,
      result: 'In progress...',
      workflow_hash: workflowHash || 'unknown',
      changes: `Starting ${action}`
    }
  };

  try {
    const result = await postToClaude(payload);
    console.log(`📤 Posted to Claude: ${action} (RUNNING) - ${result.method}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to post to Claude: ${error.message}`);
    // Fallback zu Status File
    return await postToClaude(payload);
  }
}

/**
 * Notify Claude: DONE
 */
async function notifyDone(action, task, result, changes = null) {
  const workflowHash = calculateWorkflowHash();
  
  const payload = {
    to: 'claude',
    timestamp: new Date().toISOString(),
    action: action,
    status: 'DONE',
    details: {
      task: task,
      result: result || 'Completed successfully',
      workflow_hash: workflowHash || 'unknown',
      changes: changes || `Completed ${action}`
    }
  };

  try {
    const result = await postToClaude(payload);
    console.log(`📤 Posted to Claude: ${action} (DONE) - ${result.method}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to post to Claude: ${error.message}`);
    // Fallback zu Status File
    return await postToClaude(payload);
  }
}

/**
 * Notify Claude: ERROR
 */
async function notifyError(action, task, error) {
  const workflowHash = calculateWorkflowHash();
  
  const payload = {
    to: 'claude',
    timestamp: new Date().toISOString(),
    action: action,
    status: 'ERROR',
    details: {
      task: task,
      result: error.message || 'Error occurred',
      workflow_hash: workflowHash || 'unknown',
      changes: `Error in ${action}: ${error.message || 'Unknown error'}`,
      error_stack: error.stack || null
    }
  };

  try {
    const result = await postToClaude(payload);
    console.log(`📤 Posted to Claude: ${action} (ERROR) - ${result.method}`);
    return result;
  } catch (postError) {
    console.error(`❌ Failed to post to Claude: ${postError.message}`);
    // Fallback zu Status File
    return await postToClaude(payload);
  }
}

/**
 * Test Funktion
 */
async function test() {
  console.log('\n' + '='.repeat(100));
  console.log('📤 CLAUDE DIRECT POST - TEST');
  console.log('='.repeat(100) + '\n');

  try {
    await notifyRunning('test', 'Test message');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await notifyDone('test', 'Test message', 'System is working', 'Testing Claude direct post');
    console.log('\n✅ Test completed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  test();
}

module.exports = { notifyRunning, notifyDone, notifyError, postToClaude };
