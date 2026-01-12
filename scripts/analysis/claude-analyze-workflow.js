#!/usr/bin/env node
/**
 * CLAUDE WORKFLOW ANALYSIS SCRIPT
 * 
 * Für Claude (Senior Partner) - 20 Jahre JSON-Erfahrung
 * 
 * Analysiert den MECHTECH_MERCHANT_CENTER_ADMIN Workflow komplett:
 * - Error Handling System (Rate Limiting → Gemini → Switch)
 * - Switch Node Configuration & Rules
 * - Connection Structure
 * - Gemini Decision Capabilities
 * - System Context & Data Flow
 * 
 * Usage:
 *   node scripts/claude-analyze-workflow.js [workflow-id]
 * 
 * Output:
 *   - WORKFLOW_ANALYSIS_FOR_CLAUDE.json
 *   - WORKFLOW_ANALYSIS_REPORT.md
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const FIX_DISABLED = args.includes('--fix-disabled');
const WORKFLOW_ID = args.find(arg => arg !== '--fix-disabled') || 'ftZOou7HNgLOwzE5';
const WORKFLOW_FILE = path.join(__dirname, '..', '..', 'workflows', `MERCHANT_CENTER_ADMIN_${WORKFLOW_ID}.json`).replace(/\\/g, '/');

function analyzeWorkflow() {
  console.log('\n' + '='.repeat(100));
  console.log('CLAUDE WORKFLOW ANALYSIS SCRIPT');
  console.log('='.repeat(100) + '\n');
  
  if (!fs.existsSync(WORKFLOW_FILE)) {
    console.error(`❌ Workflow file not found: ${WORKFLOW_FILE}`);
    process.exit(1);
  }
  
  console.log(`📄 Loading workflow: ${WORKFLOW_FILE}\n`);
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));
  const nodes = workflow.nodes || [];
  const connections = workflow.connections || {};
  
  // ============================================
  // 1. CATEGORIZE NODES
  // ============================================
  const geminiErrorHandler = nodes.filter(n => 
    n.type.includes('gemini') && n.name.includes('Error Handler')
  );
  const switchActionHandler = nodes.filter(n => 
    n.type.includes('switch') && n.name.includes('Switch Action Handler')
  );
  const rateLimit = nodes.filter(n => 
    n.name.includes('Rate Limiting')
  );
  const prepareNodes = nodes.filter(n => 
    n.name.includes('Prepare') && n.name.includes('Loop')
  );
  const updateNodes = nodes.filter(n => 
    n.name.includes('Update Product')
  );
  
  // ============================================
  // 2. ANALYZE SWITCH NODES
  // ============================================
  const switchAnalysis = switchActionHandler.map(switchNode => {
    const rules = switchNode.parameters?.rules?.values || [];
    const mode = switchNode.parameters?.mode || 'NOT SET';
    const fallback = switchNode.parameters?.fallbackOutput;
    
    // Get connections
    const switchConn = connections[switchNode.name]?.main || [];
    const outputs = switchConn.map((outputConnections, idx) => {
      if (!outputConnections || outputConnections.length === 0) {
        return { output: idx, targets: [], connected: false };
      }
      return {
        output: idx,
        targets: outputConnections.map(c => typeof c === 'object' ? c.node : c),
        connected: true
      };
    });
    
    // Extract rule conditions
    const ruleConditions = rules.map(rule => {
      const stringConditions = rule.conditions?.string || [];
      return stringConditions.map(cond => ({
        value1: cond.value1,
        operation: cond.operation,
        value2: cond.value2,
        renameOutput: rule.renameOutput
      }));
    }).flat();
    
    return {
      name: switchNode.name,
      mode,
      rulesCount: rules.length,
      rules: ruleConditions,
      fallbackOutput: fallback,
      outputs: outputs,
      fullyConfigured: rules.length > 0 && mode === 'rules' && fallback !== undefined
    };
  });
  
  // ============================================
  // 3. ANALYZE ERROR HANDLING PATHS
  // ============================================
  const pathAnalysis = rateLimit.map(rateNode => {
    const rateConn = connections[rateNode.name]?.main?.[0] || [];
    const targets = rateConn.map(c => typeof c === 'object' ? c.node : c);
    
    // Find Gemini target
    const geminiTarget = targets.find(t => 
      geminiErrorHandler.some(g => g.name === t)
    );
    
    // Find Switch target
    let switchTarget = null;
    if (geminiTarget) {
      const geminiConn = connections[geminiTarget]?.main?.[0] || [];
      const geminiTargets = geminiConn.map(c => typeof c === 'object' ? c.node : c);
      switchTarget = geminiTargets.find(t => 
        switchActionHandler.some(s => s.name === t)
      );
    }
    
    // Find other targets (Prepare, Aggregate, Log)
    const prepareTarget = targets.find(t => 
      prepareNodes.some(p => p.name === t)
    );
    const aggregateTarget = targets.find(t => 
      t.includes('Aggregate')
    );
    const logTarget = targets.find(t => 
      t.includes('Log Results')
    );
    
    return {
      rateLimiting: rateNode.name,
      allTargets: targets,
      geminiTarget: geminiTarget || null,
      switchTarget: switchTarget || null,
      prepareTarget: prepareTarget || null,
      aggregateTarget: aggregateTarget || null,
      logTarget: logTarget || null,
      pathComplete: !!(geminiTarget && switchTarget),
      hasSuccessPath: !!prepareTarget
    };
  });
  
  // ============================================
  // 4. ANALYZE GEMINI ERROR HANDLER
  // ============================================
  const geminiAnalysis = geminiErrorHandler.map(geminiNode => {
    // Check for system message
    const systemMessage = geminiNode.parameters?.options?.systemMessage || 
                         geminiNode.parameters?.systemMessage || '';
    
    const expectsJSON = systemMessage.toLowerCase().includes('json') || 
                       systemMessage.toLowerCase().includes('format');
    
    // Get input connections
    const inputConn = Object.values(connections).find((conn, nodeName) => {
      const mainConn = conn?.main?.[0] || [];
      return mainConn.some(c => {
        const targetNode = typeof c === 'object' ? c.node : c;
        return targetNode === geminiNode.name;
      });
    });
    
    return {
      name: geminiNode.name,
      systemMessage: systemMessage.substring(0, 200) + (systemMessage.length > 200 ? '...' : ''),
      expectsJSON: expectsJSON,
      hasSystemMessage: systemMessage.length > 0
    };
  });
  
  // ============================================
  // 5. SYSTEM CONTEXT
  // ============================================
  const systemContext = {
    purpose: workflow.description || 'Not specified',
    workflowType: 'Error Handling + AI Decision Making',
    dataFlow: {
      input: 'Merchant Center Products/Errors from Update Operations',
      processing: 'Prepare Nodes → Update Nodes → Error Detection',
      errorHandling: 'Rate Limiting → Gemini AI Analysis → Switch Decision → RETRY/AUTO_FIX/REROUTE/ALERT',
      output: 'Retry/Auto-Fix/Reroute/Alert → Log to Sheets'
    },
    geminiCapabilities: {
      canProcess: [
        'HTTP Error Codes (400, 429, 500)',
        'Error Messages',
        'Retry Logic',
        'Product Information'
      ],
      canDecide: [
        'RETRY (temporary errors, rate limits)',
        'AUTO_FIX (automatically fixable errors)',
        'REROUTE (alternative routes needed)',
        'ALERT (manual intervention required)'
      ],
      expectedOutput: {
        format: 'JSON',
        structure: {
          action: 'RETRY|AUTO_FIX|REROUTE|ALERT',
          reasoning: 'Explanation of decision',
          retry_count: 'Number',
          error: {
            code: 'HTTP Status Code',
            message: 'Error message'
          }
        }
      }
    }
  };
  
  // ============================================
  // 6. BUILD REPORT
  // ============================================
  const report = {
    timestamp: new Date().toISOString(),
    workflow: {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      active: workflow.active,
      nodesCount: nodes.length,
      created: workflow.createdAt,
      updated: workflow.updatedAt
    },
    errorHandling: {
      rateLimiting: rateLimit.length,
      geminiErrorHandler: geminiErrorHandler.length,
      switchActionHandler: switchActionHandler.length,
      totalErrorHandlingNodes: rateLimit.length + geminiErrorHandler.length + switchActionHandler.length
    },
    switchNodes: switchAnalysis,
    errorPaths: pathAnalysis,
    geminiNodes: geminiAnalysis,
    systemContext: systemContext,
    summary: {
      allErrorPathsConnected: pathAnalysis.every(p => p.pathComplete),
      allSwitchNodesConfigured: switchAnalysis.every(s => s.fullyConfigured),
      totalErrorHandlingPaths: pathAnalysis.filter(p => p.pathComplete).length,
      totalConfiguredSwitches: switchAnalysis.filter(s => s.fullyConfigured).length
    },
    recommendations: []
  };
  
  // Add recommendations
  if (!report.summary.allErrorPathsConnected) {
    report.recommendations.push({
      priority: 'HIGH',
      issue: 'Some error handling paths are not fully connected',
      action: 'Verify Rate Limiting → Gemini → Switch connections'
    });
  }
  
  if (!report.summary.allSwitchNodesConfigured) {
    report.recommendations.push({
      priority: 'HIGH',
      issue: 'Some switch nodes are not fully configured',
      action: 'Check switch node rules and fallback outputs'
    });
  }
  
  const geminiWithoutJSON = geminiAnalysis.filter(g => !g.expectsJSON);
  if (geminiWithoutJSON.length > 0) {
    report.recommendations.push({
      priority: 'MEDIUM',
      issue: `${geminiWithoutJSON.length} Gemini nodes may not explicitly expect JSON format`,
      action: 'Verify system messages include JSON format instructions'
    });
  }
  
  // ============================================
  // 7. SAVE REPORTS
  // ============================================
  const jsonReportPath = path.join(__dirname, '..', 'WORKFLOW_ANALYSIS_FOR_CLAUDE.json');
  const mdReportPath = path.join(__dirname, '..', 'WORKFLOW_ANALYSIS_REPORT.md');
  
  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2), 'utf8');
  
  // Generate Markdown Report
  const mdReport = generateMarkdownReport(report);
  fs.writeFileSync(mdReportPath, mdReport, 'utf8');
  
  console.log('✅ Analysis Complete!\n');
  console.log(`📄 JSON Report: ${jsonReportPath}`);
  console.log(`📄 Markdown Report: ${mdReportPath}\n`);
  console.log('Summary:');
  console.log(`  - Error Handling Paths Complete: ${report.summary.totalErrorHandlingPaths}/${pathAnalysis.length}`);
  console.log(`  - Switch Nodes Configured: ${report.summary.totalConfiguredSwitches}/${switchAnalysis.length}`);
  console.log(`  - Recommendations: ${report.recommendations.length}\n`);
  
  return report;
}

function generateMarkdownReport(report) {
  let md = `# WORKFLOW ANALYSIS REPORT FOR CLAUDE\n\n`;
  md += `**Generated:** ${report.timestamp}\n`;
  md += `**Workflow:** ${report.workflow.name} (${report.workflow.id})\n`;
  md += `**Status:** ${report.workflow.active ? '✅ Active' : '❌ Inactive'}\n\n`;
  
  md += `## SUMMARY\n\n`;
  md += `- **Total Nodes:** ${report.workflow.nodesCount}\n`;
  md += `- **Error Handling Nodes:** ${report.errorHandling.totalErrorHandlingNodes}\n`;
  md += `- **Error Paths Complete:** ${report.summary.totalErrorHandlingPaths}/${report.errorHandling.rateLimiting}\n`;
  md += `- **Switch Nodes Configured:** ${report.summary.totalConfiguredSwitches}/${report.errorHandling.switchActionHandler}\n\n`;
  
  md += `## ERROR HANDLING PATHS\n\n`;
  report.errorPaths.forEach(path => {
    md += `### ${path.rateLimiting}\n`;
    md += `- Gemini: ${path.geminiTarget || '❌ NOT CONNECTED'}\n`;
    md += `- Switch: ${path.switchTarget || '❌ NOT CONNECTED'}\n`;
    md += `- Status: ${path.pathComplete ? '✅ Complete' : '❌ Incomplete'}\n\n`;
  });
  
  md += `## RECOMMENDATIONS\n\n`;
  if (report.recommendations.length === 0) {
    md += `✅ No issues found. Workflow is fully configured!\n\n`;
  } else {
    report.recommendations.forEach((rec, idx) => {
      md += `${idx + 1}. **[${rec.priority}]** ${rec.issue}\n`;
      md += `   - Action: ${rec.action}\n\n`;
    });
  }
  
  return md;
}

function fixDisabledProperties() {
  console.log('\n' + '='.repeat(100));
  console.log('FIX DISABLED PROPERTIES');
  console.log('='.repeat(100) + '\n');
  
  if (!fs.existsSync(WORKFLOW_FILE)) {
    console.error(`❌ Workflow file not found: ${WORKFLOW_FILE}`);
    process.exit(1);
  }
  
  console.log(`📄 Loading workflow: ${WORKFLOW_FILE}\n`);
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));
  const nodes = workflow.nodes || [];
  
  // Find nodes without 'disabled' property
  const nodesWithoutDisabled = nodes.filter(node => 
    !node.hasOwnProperty('disabled')
  );
  
  console.log(`🔍 Found ${nodesWithoutDisabled.length} nodes without 'disabled' property\n`);
  
  if (nodesWithoutDisabled.length === 0) {
    console.log('✅ All nodes already have the "disabled" property!\n');
    return;
  }
  
  // Show first 10 nodes
  console.log('Nodes to fix (first 10):');
  nodesWithoutDisabled.slice(0, 10).forEach((node, idx) => {
    console.log(`  ${idx + 1}. ${node.name || node.type} (${node.type})`);
  });
  if (nodesWithoutDisabled.length > 10) {
    console.log(`  ... and ${nodesWithoutDisabled.length - 10} more\n`);
  } else {
    console.log('');
  }
  
  // Fix nodes
  console.log('🔧 Adding "disabled": false to all nodes without this property...\n');
  let fixedCount = 0;
  
  nodes.forEach(node => {
    if (!node.hasOwnProperty('disabled')) {
      node.disabled = false;
      fixedCount++;
    }
  });
  
  // Create backup
  const backupFile = WORKFLOW_FILE.replace('.json', `.backup_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(workflow, null, 2), 'utf8');
  console.log(`💾 Backup created: ${backupFile}\n`);
  
  // Save fixed workflow
  fs.writeFileSync(WORKFLOW_FILE, JSON.stringify(workflow, null, 2), 'utf8');
  
  console.log(`✅ Fixed ${fixedCount} nodes!\n`);
  console.log(`📄 Workflow saved: ${WORKFLOW_FILE}\n`);
  console.log('⚠️  Next steps:');
  console.log('   1. Upload the fixed workflow to n8n');
  console.log('   2. Test the workflow');
  console.log('   3. Verify all nodes work correctly\n');
  
  return {
    fixed: fixedCount,
    total: nodes.length,
    backupFile: backupFile
  };
}

if (require.main === module) {
  if (FIX_DISABLED) {
    fixDisabledProperties();
  } else {
    analyzeWorkflow();
  }
}

module.exports = { analyzeWorkflow, fixDisabledProperties };
