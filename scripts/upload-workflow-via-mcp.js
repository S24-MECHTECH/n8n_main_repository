#!/usr/bin/env node
/**
 * UPLOAD WORKFLOW VIA n8n MCP SERVER
 * Nutzt die vorhandenen MCP Credentials
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const WORKFLOW_FILE = path.join(__dirname, '..', 'workflows', 'MERCHANT_CENTER_ADMIN_ftZOou7HNgLOwzE5.json');

async function uploadViaMCP() {
  console.log('\n' + '='.repeat(100));
  console.log('UPLOAD WORKFLOW VIA n8n MCP SERVER');
  console.log('='.repeat(100) + '\n');
  
  // Lade Workflow
  console.log(`📄 Loading workflow: ${WORKFLOW_FILE}`);
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));
  
  console.log(`✅ Workflow loaded: ${workflow.name}`);
  console.log(`   ID: ${workflow.id}`);
  console.log(`   Nodes: ${workflow.nodes.length}\n`);
  
  // Prüfe disabled property
  const nodesWithoutDisabled = workflow.nodes.filter(node => !node.hasOwnProperty('disabled'));
  if (nodesWithoutDisabled.length > 0) {
    console.error(`❌ ERROR: ${nodesWithoutDisabled.length} nodes still missing 'disabled' property!`);
    process.exit(1);
  }
  
  console.log(`✅ All ${workflow.nodes.length} nodes have 'disabled' property\n`);
  console.log('📋 Workflow ready to upload!\n');
  console.log('⚠️  NOTE: This script prepares the workflow for upload.');
  console.log('   The actual upload should be done via n8n UI or MCP tools.\n');
  console.log('📝 Next steps:');
  console.log('   1. Open n8n: https://n8n.srv1091615.hstgr.cloud');
  console.log('   2. Open workflow: ***MECHTECH_MERCHANT_CENTER_ADMIN');
  console.log('   3. Menu (3 dots) → Import from File');
  console.log(`   4. Select: ${WORKFLOW_FILE}`);
  console.log('   5. Overwrite existing workflow');
  console.log('   6. Save & Test\n');
}

if (require.main === module) {
  uploadViaMCP();
}

module.exports = { uploadViaMCP };
