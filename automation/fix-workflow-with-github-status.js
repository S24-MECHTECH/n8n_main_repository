#!/usr/bin/env node
/**
 * FIX WORKFLOW WITH GITHUB STATUS
 * Wrapper für fix-workflow-auto.js
 * Führt Fix aus und pusht Status zu GitHub
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = '/home/claude/fix-workflow-auto.js';
const STATUS_FILE = path.join(__dirname, '..', 'workflow-fix-status.json');
const GIT_REPO = path.join(__dirname, '..');

async function runFixAndUpdateStatus() {
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] Starting workflow fix...\n`);
  
  try {
    // 1. Führe fix-workflow-auto.js aus
    console.log('1. Running fix-workflow-auto.js...\n');
    const output = execSync(`node ${SCRIPT_PATH}`, { 
      encoding: 'utf8',
      cwd: '/home/claude',
      stdio: 'pipe'
    });
    
    console.log(output);
    
    // 2. Erstelle Status-File
    const status = {
      timestamp: timestamp,
      status: 'SUCCESS',
      script: SCRIPT_PATH,
      output: output.slice(-500), // Last 500 chars
      error: null
    };
    
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), 'utf8');
    console.log(`\n✅ Status saved to ${STATUS_FILE}`);
    
    // 3. Git: Add, Commit, Push
    console.log('\n2. Pushing status to GitHub...\n');
    try {
      execSync('git add workflow-fix-status.json', { 
        encoding: 'utf8', 
        cwd: GIT_REPO 
      });
      
      execSync(`git commit -m "Auto-fix workflow status: ${timestamp}"`, { 
        encoding: 'utf8', 
        cwd: GIT_REPO,
        stdio: 'ignore'
      });
      
      execSync('git push', { 
        encoding: 'utf8', 
        cwd: GIT_REPO,
        stdio: 'pipe'
      });
      
      console.log('✅ Status pushed to GitHub\n');
    } catch (gitError) {
      console.log(`⚠️  Git push failed: ${gitError.message}\n`);
    }
    
    console.log(`[${timestamp}] Workflow fix completed successfully!\n`);
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    
    // Error Status
    const errorStatus = {
      timestamp: timestamp,
      status: 'ERROR',
      script: SCRIPT_PATH,
      output: error.stdout || '',
      error: error.message,
      stack: error.stack
    };
    
    fs.writeFileSync(STATUS_FILE, JSON.stringify(errorStatus, null, 2), 'utf8');
    
    // Try to push error status
    try {
      execSync('git add workflow-fix-status.json', { 
        encoding: 'utf8', 
        cwd: GIT_REPO 
      });
      execSync(`git commit -m "Auto-fix workflow ERROR: ${timestamp}"`, { 
        encoding: 'utf8', 
        cwd: GIT_REPO 
      });
      execSync('git push', { 
        encoding: 'utf8', 
        cwd: GIT_REPO 
      });
    } catch (gitError) {
      // Ignore git errors on error status
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  runFixAndUpdateStatus();
}

module.exports = { runFixAndUpdateStatus };


