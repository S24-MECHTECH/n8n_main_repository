#!/usr/bin/env node
/**
 * GENERATE WORKFLOW REPORT FOR CLAUDE
 * Erstellt vollständigen Analyse-Report direkt aus JSON
 */

const fs = require('fs');
const path = require('path');

const WORKFLOW_JSON = path.join(__dirname, '..', 'workflows', 'MERCHANT_CENTER_ADMIN_ftZOou7HNgLOwzE5.json');

function analyzeWorkflow() {
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_JSON, 'utf8'));
  const nodes = workflow.nodes || [];
  const connections = workflow.connections || {};
  
  // Categorize
  const geminiErrorHandler = nodes.filter(n => n.type.includes('gemini') && n.name.includes('Error Handler'));
  const switchActionHandler = nodes.filter(n => n.type.includes('switch') && n.name.includes('Switch Action Handler'));
  const rateLimit = nodes.filter(n => n.name.includes('Rate Limiting'));
  
  // Analyze Switch Node Rules
  const switchAnalysis = switchActionHandler.map(switchNode => {
    const rules = switchNode.parameters?.rules || [];
    const mode = switchNode.parameters?.mode || 'NOT SET';
    const fallback = switchNode.parameters?.fallbackOutput;
    
    // Get connections
    const switchConn = connections[switchNode.name]?.main || [];
    const outputs = switchConn.map((outputConnections, idx) => {
      if (!outputConnections || outputConnections.length === 0) return { output: idx, targets: [] };
      return {
        output: idx,
        targets: outputConnections.map(c => typeof c === 'object' ? c.node : c)
      };
    });
    
    return {
      name: switchNode.name,
      mode,
      rulesCount: rules.length,
      rules: rules,
      fallbackOutput: fallback,
      outputs: outputs
    };
  });
  
  // Analyze Error Handling Paths
  const pathAnalysis = rateLimit.map(rateNode => {
    const rateConn = connections[rateNode.name]?.main?.[0] || [];
    const targets = rateConn.map(c => typeof c === 'object' ? c.node : c);
    
    const geminiTarget = targets.find(t => geminiErrorHandler.some(g => g.name === t));
    let switchTarget = null;
    
    if (geminiTarget) {
      const geminiConn = connections[geminiTarget]?.main?.[0] || [];
      const geminiTargets = geminiConn.map(c => typeof c === 'object' ? c.node : c);
      switchTarget = geminiTargets.find(t => switchActionHandler.some(s => s.name === t));
    }
    
    return {
      rateLimiting: rateNode.name,
      allTargets: targets,
      geminiTarget: geminiTarget || null,
      switchTarget: switchTarget || null,
      pathComplete: !!(geminiTarget && switchTarget)
    };
  });
  
  // Create Report
  const report = {
    timestamp: new Date().toISOString(),
    workflow: {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      active: workflow.active,
      nodesCount: nodes.length
    },
    errorHandling: {
      rateLimiting: rateLimit.length,
      geminiErrorHandler: geminiErrorHandler.length,
      switchActionHandler: switchActionHandler.length
    },
    switchNodes: switchAnalysis,
    errorPaths: pathAnalysis,
    systemContext: {
      purpose: workflow.description,
      workflowType: 'Error Handling + AI Decision Making',
      dataFlow: {
        input: 'Merchant Center Products/Errors',
        processing: 'Prepare Nodes → Update Nodes → Error Detection',
        errorHandling: 'Rate Limiting → Gemini AI Analysis → Switch Decision',
        output: 'Retry/Auto-Fix/Reroute/Alert → Log to Sheets'
      }
    }
  };
  
  // Save Report
  const reportPath = path.join(__dirname, '..', 'WORKFLOW_ANALYSIS_DETAILED.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  console.log('\n' + '='.repeat(100));
  console.log('WORKFLOW ANALYSIS COMPLETE');
  console.log('='.repeat(100) + '\n');
  console.log(`Report saved: ${reportPath}\n`);
  console.log(`Error Handling Paths Complete: ${pathAnalysis.filter(p => p.pathComplete).length}/${pathAnalysis.length}`);
  console.log(`Switch Nodes with Rules: ${switchAnalysis.filter(s => s.rulesCount > 0).length}/${switchAnalysis.length}\n`);
  
  return report;
}

if (require.main === module) {
  analyzeWorkflow();
}

module.exports = { analyzeWorkflow };
