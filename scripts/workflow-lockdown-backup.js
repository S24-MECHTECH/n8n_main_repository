#!/usr/bin/env node
/**
 * WORKFLOW LOCKDOWN - BACKUP SYSTEM
 * 
 * Regel: Alles was gebaut wird:
 * 1. BACKUP zu GitHub (sofort)
 * 2. Status zu cursor-status-live.json
 * 3. Checksum berechnen (für Änderungen)
 * 
 * GitHub = Source of Truth!
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';
const WORKFLOW_FILE = path.join(__dirname, '..', 'workflows', `MERCHANT_CENTER_ADMIN_${WORKFLOW_ID}.json`);
const STATUS_FILE = path.join(__dirname, '..', 'cursor-status-live.json');
const CHECKSUM_FILE = path.join(__dirname, '..', '.workflow-checksum.json');
const REPO_DIR = path.join(__dirname, '..');

/**
 * Berechne SHA256 Checksum des Workflows
 */
function calculateChecksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Lade letzte bekannte Checksum
 */
function loadLastChecksum() {
  if (fs.existsSync(CHECKSUM_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CHECKSUM_FILE, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Speichere Checksum
 */
function saveChecksum(checksum, timestamp) {
  const data = {
    checksum,
    timestamp,
    workflowId: WORKFLOW_ID,
    workflowName: 'MERCHANT_CENTER_ADMIN'
  };
  fs.writeFileSync(CHECKSUM_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Backup zu GitHub
 */
function backupToGitHub() {
  console.log('📦 Creating backup to GitHub...');
  
  try {
    // Git Status prüfen
    const gitStatus = execSync('git status --porcelain', { 
      cwd: REPO_DIR, 
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    if (!gitStatus.trim()) {
      console.log('   ℹ️  No changes to commit');
      return false;
    }
    
    // Add all changes
    execSync('git add -A', { cwd: REPO_DIR, stdio: 'inherit' });
    
    // Commit
    const commitMessage = `BACKUP: Workflow ${WORKFLOW_ID} - ${new Date().toISOString()}`;
    execSync(`git commit -m "${commitMessage}"`, { 
      cwd: REPO_DIR, 
      stdio: 'inherit'
    });
    
    // Push
    execSync('git push', { 
      cwd: REPO_DIR, 
      stdio: 'inherit'
    });
    
    console.log('✅ Backup to GitHub completed!\n');
    return true;
    
  } catch (error) {
    console.error('❌ GitHub backup failed:', error.message);
    return false;
  }
}

/**
 * Update Status File
 */
function updateStatus(message, status = 'OK', checksum = null) {
  const statusData = {
    timestamp: new Date().toISOString(),
    current_task: message,
    status: status,
    progress: "100%",
    checksum: checksum,
    workflow_id: WORKFLOW_ID,
    findings: `Workflow locked down. GitHub = Source of Truth. Last checksum: ${checksum ? checksum.substring(0, 16) + '...' : 'N/A'}`
  };
  
  fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2), 'utf8');
  console.log(`✅ Status updated: ${message}\n`);
}

/**
 * Main Lockdown Backup Function
 */
async function lockdownBackup() {
  console.log('\n' + '='.repeat(100));
  console.log('🔒 WORKFLOW LOCKDOWN - BACKUP SYSTEM');
  console.log('='.repeat(100) + '\n');
  
  try {
    // 1. Lade Workflow
    console.log('📄 Loading workflow...');
    if (!fs.existsSync(WORKFLOW_FILE)) {
      throw new Error(`Workflow file not found: ${WORKFLOW_FILE}`);
    }
    
    const workflowContent = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    const workflow = JSON.parse(workflowContent);
    console.log(`✅ Workflow loaded: ${workflow.name} (${workflow.nodes.length} nodes)\n`);
    
    // 2. Berechne Checksum
    console.log('🔐 Calculating checksum...');
    const checksum = calculateChecksum(workflowContent);
    console.log(`✅ Checksum: ${checksum.substring(0, 32)}...\n`);
    
    // 3. Vergleiche mit letzter Checksum
    const lastChecksum = loadLastChecksum();
    const hasChanged = !lastChecksum || lastChecksum.checksum !== checksum;
    
    if (hasChanged) {
      console.log('⚠️  WORKFLOW CHANGED DETECTED!\n');
      console.log(`   Old checksum: ${lastChecksum ? lastChecksum.checksum.substring(0, 32) + '...' : 'N/A'}`);
      console.log(`   New checksum: ${checksum.substring(0, 32)}...\n`);
    } else {
      console.log('✅ No changes detected (checksum matches)\n');
    }
    
    // 4. Backup zu GitHub (immer, auch wenn keine Änderung - für Sicherheit)
    const backupSuccess = backupToGitHub();
    
    // 5. Speichere neue Checksum
    saveChecksum(checksum, new Date().toISOString());
    
    // 6. Update Status
    const statusMessage = hasChanged 
      ? `⚠️ Workflow changed detected! Backup: ${backupSuccess ? '✅' : '❌'}`
      : `✅ Workflow unchanged. Backup: ${backupSuccess ? '✅' : '❌'}`;
    
    updateStatus(statusMessage, hasChanged ? 'CHANGED' : 'OK', checksum);
    
    console.log('📊 SUMMARY:');
    console.log(`   Workflow: ${workflow.name}`);
    console.log(`   Checksum: ${checksum.substring(0, 32)}...`);
    console.log(`   Changed: ${hasChanged ? '✅ YES' : '❌ NO'}`);
    console.log(`   GitHub Backup: ${backupSuccess ? '✅ SUCCESS' : '❌ FAILED'}\n`);
    
    console.log('🎉 Lockdown backup completed!\n');
    
    return {
      checksum,
      hasChanged,
      backupSuccess
    };
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    updateStatus(`❌ ERROR: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

if (require.main === module) {
  lockdownBackup();
}

module.exports = { lockdownBackup, calculateChecksum, loadLastChecksum };
