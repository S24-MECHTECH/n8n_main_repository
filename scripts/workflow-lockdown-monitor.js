#!/usr/bin/env node
/**
 * WORKFLOW LOCKDOWN - MONITORING SYSTEM
 * 
 * Claude prüft ALLE 10 MIN:
 * - Ist Workflow geändert?
 * - Wenn JA: Alert + Screenshot
 * - Wenn NEIN: OK
 * 
 * KEINE Änderungen mehr "weg machen"!
 * GitHub = Source of Truth!
 */

const fs = require('fs');
const path = require('path');
const { calculateChecksum, loadLastChecksum } = require('./workflow-lockdown-backup');
const https = require('https');

const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';
const WORKFLOW_FILE = path.join(__dirname, '..', 'workflows', `MERCHANT_CENTER_ADMIN_${WORKFLOW_ID}.json`);
const STATUS_FILE = path.join(__dirname, '..', 'cursor-status-live.json');
const N8N_URL = 'https://n8n.srv1091615.hstgr.cloud';
const CHECK_INTERVAL = 10 * 60 * 1000; // 10 Minuten

/**
 * Lade n8n API Key
 */
function getApiKey() {
  const adminTokenFile = path.join('d:', 'MAMP', 'N8N-PROJEKT_INFOS', '000_Hostinger(DE-und_EN)', 'n8n_Admin', 'n8n_Admin_token_12_12_25.txt');
  
  if (fs.existsSync(adminTokenFile)) {
    const content = fs.readFileSync(adminTokenFile, 'utf8');
    const tokenMatch = content.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (tokenMatch && tokenMatch[0]) {
      return tokenMatch[0].trim();
    }
  }
  
  throw new Error('API Key not found');
}

/**
 * n8n API Request
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

/**
 * Prüfe Workflow Änderungen
 */
async function checkWorkflowChanges() {
  console.log('\n' + '='.repeat(100));
  console.log('🔍 WORKFLOW LOCKDOWN - MONITORING CHECK');
  console.log(`   ${new Date().toISOString()}`);
  console.log('='.repeat(100) + '\n');
  
  try {
    // 1. Lade lokalen Workflow
    console.log('📄 Loading local workflow...');
    if (!fs.existsSync(WORKFLOW_FILE)) {
      throw new Error(`Workflow file not found: ${WORKFLOW_FILE}`);
    }
    
    const localContent = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    const localChecksum = calculateChecksum(localContent);
    console.log(`✅ Local checksum: ${localChecksum.substring(0, 32)}...\n`);
    
    // 2. Lade letzte bekannte Checksum
    const lastChecksum = loadLastChecksum();
    console.log(`📋 Last known checksum: ${lastChecksum ? lastChecksum.checksum.substring(0, 32) + '...' : 'N/A (first check)'}\n`);
    
    // 3. Vergleiche
    const hasChanged = !lastChecksum || lastChecksum.checksum !== localChecksum;
    
    if (hasChanged) {
      console.log('🚨 ALERT: WORKFLOW CHANGED DETECTED!\n');
      
      // 4. Hole aktuellen Workflow vom Server (für Vergleich)
      console.log('📥 Fetching workflow from server...');
      const apiKey = getApiKey();
      const serverWorkflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'GET', null, apiKey);
      const serverContent = JSON.stringify(serverWorkflow, null, 2);
      const serverChecksum = calculateChecksum(serverContent);
      
      console.log(`✅ Server checksum: ${serverChecksum.substring(0, 32)}...\n`);
      
      // 5. Update Status mit ALERT
      const statusData = {
        timestamp: new Date().toISOString(),
        current_task: "🚨 ALERT: Workflow changed detected!",
        status: "ALERT",
        progress: "100%",
        checksum: {
          local: localChecksum,
          last_known: lastChecksum ? lastChecksum.checksum : null,
          server: serverChecksum
        },
        workflow_id: WORKFLOW_ID,
        findings: `WORKFLOW CHANGED! Local: ${localChecksum.substring(0, 16)}... | Server: ${serverChecksum.substring(0, 16)}... | Action required: Check GitHub backup!`
      };
      
      fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2), 'utf8');
      
      console.log('⚠️  ALERT STATUS WRITTEN TO cursor-status-live.json\n');
      console.log('📊 SUMMARY:');
      console.log(`   Local checksum:  ${localChecksum.substring(0, 32)}...`);
      console.log(`   Last known:      ${lastChecksum ? lastChecksum.checksum.substring(0, 32) + '...' : 'N/A'}`);
      console.log(`   Server checksum: ${serverChecksum.substring(0, 32)}...`);
      console.log(`   Status: 🚨 CHANGED DETECTED\n`);
      
      return {
        hasChanged: true,
        localChecksum,
        serverChecksum,
        lastChecksum: lastChecksum ? lastChecksum.checksum : null
      };
      
    } else {
      console.log('✅ OK: No changes detected\n');
      
      // Update Status mit OK
      const statusData = {
        timestamp: new Date().toISOString(),
        current_task: "✅ Workflow unchanged - OK",
        status: "OK",
        progress: "100%",
        checksum: localChecksum,
        workflow_id: WORKFLOW_ID,
        findings: `Workflow unchanged. Checksum: ${localChecksum.substring(0, 16)}... | Last check: ${new Date().toISOString()}`
      };
      
      fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2), 'utf8');
      
      console.log('📊 SUMMARY:');
      console.log(`   Checksum: ${localChecksum.substring(0, 32)}...`);
      console.log(`   Status: ✅ OK (no changes)\n`);
      
      return {
        hasChanged: false,
        localChecksum,
        lastChecksum: lastChecksum.checksum
      };
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    
    // Update Status mit ERROR
    const statusData = {
      timestamp: new Date().toISOString(),
      current_task: `❌ ERROR: ${error.message}`,
      status: "ERROR",
      progress: "0%",
      workflow_id: WORKFLOW_ID,
      findings: `Monitoring error: ${error.message}`
    };
    
    fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2), 'utf8');
    
    throw error;
  }
}

/**
 * Starte kontinuierliches Monitoring (alle 10 Minuten)
 */
async function startMonitoring() {
  console.log('🔒 WORKFLOW LOCKDOWN - CONTINUOUS MONITORING');
  console.log('   Checking every 10 minutes...\n');
  
  // Erste Prüfung sofort
  await checkWorkflowChanges();
  
  // Dann alle 10 Minuten
  setInterval(async () => {
    await checkWorkflowChanges();
  }, CHECK_INTERVAL);
  
  console.log('✅ Monitoring started. Press Ctrl+C to stop.\n');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const continuous = args.includes('--continuous');
  
  if (continuous) {
    startMonitoring().catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  } else {
    checkWorkflowChanges().catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
  }
}

module.exports = { checkWorkflowChanges };
