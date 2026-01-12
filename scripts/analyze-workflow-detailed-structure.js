#!/usr/bin/env node
/**
 * DETAILLIERTER WORKFLOW-SCAN
 * Analysiert Route by Priority, Error Handler, Shop-Flows
 */

const fs = require('fs');
const path = require('path');

const WORKFLOW_FILE = path.join(__dirname, '..', 'workflows', 'MERCHANT_CENTER_ADMIN_ftZOou7HNgLOwzE5_FROM_SERVER.json');

function analyzeWorkflow() {
  console.log('\n' + '='.repeat(100));
  console.log('DETAILLIERTER MECHTECH WORKFLOW-SCAN');
  console.log('='.repeat(100) + '\n');
  
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));
  const connections = workflow.connections || {};
  
  // Node-Map
  const nodeMap = {};
  workflow.nodes.forEach(n => {
    nodeMap[n.name] = n;
    nodeMap[n.id] = n;
  });
  
  const report = {
    scan_date: new Date().toISOString(),
    workflow_id: workflow.id,
    workflow_name: workflow.name,
    total_nodes: workflow.nodes.length
  };
  
  // 1. Route by Priority Analyse
  console.log('🔍 ANALYSE: Route by Priority\n');
  const routeByPriority = workflow.nodes.find(n => n.name === 'Route by Priority');
  
  if (routeByPriority && routeByPriority.parameters) {
    // Switch Node hat rules.values oder rules (je nach Version)
    const rules = routeByPriority.parameters.rules?.values || routeByPriority.parameters.rules || [];
    const routeConn = connections['Route by Priority'] || {};
    
    console.log(`✅ Route by Priority Node gefunden`);
    console.log(`   Node ID: ${routeByPriority.id}`);
    console.log(`   Type: ${routeByPriority.type}`);
    console.log(`   Rules: ${Array.isArray(rules) ? rules.length : Object.keys(rules || {}).length}\n`);
    
    const conditions = [];
    
    // Rules können Array oder Object sein
    const rulesArray = Array.isArray(rules) ? rules : (rules ? Object.values(rules) : []);
    
    rulesArray.forEach((rule, idx) => {
      const outputKey = rule.outputKey || (rule.renameOutput ? 'Renamed Output' : `Output ${idx + 1}`);
      const conditionsList = rule.conditions?.conditions || [];
      
      // Finde Target Node aus Connections
      let targetNode = 'No connection';
      if (routeConn.main && routeConn.main[idx] && routeConn.main[idx].length > 0) {
        targetNode = routeConn.main[idx].map(o => {
          const target = nodeMap[o.node];
          return target ? target.name : o.node;
        }).join(', ');
      }
      
      conditions.push({
        output_index: idx,
        output_key: outputKey,
        condition: conditionsList.map(cond => ({
          leftValue: cond.leftValue,
          operator: cond.operator?.operation || cond.operator?.name || 'unknown',
          rightValue: cond.rightValue
        })),
        target_node: targetNode
      });
      
      console.log(`   ${idx + 1}. ${outputKey}`);
      conditionsList.forEach(cond => {
        console.log(`      Condition: ${cond.leftValue} ${cond.operator?.operation || '?'} ${cond.rightValue}`);
      });
      console.log(`      → ${targetNode}`);
      console.log('');
    });
    
    report.route_by_priority = {
      node_id: routeByPriority.id,
      total_outputs: conditions.length,
      conditions: conditions,
      has_error_connection: !!(routeConn.error && routeConn.error.length > 0),
      onError: routeByPriority.onError || null
    };
  } else {
    console.log('❌ Route by Priority Node nicht gefunden oder keine Rules!\n');
    report.route_by_priority = { error: 'Node nicht gefunden oder keine Rules' };
  }
  
  // 2. Error Handler Analyse
  console.log('🔍 ANALYSE: Error Handler (warum keine Inputs?)\n');
  const errorHandlers = workflow.nodes.filter(n => {
    const name = (n.name || '').toLowerCase();
    return name.includes('error') && name.includes('handler');
  });
  
  report.error_handlers = errorHandlers.map(node => {
    const nodeConn = connections[node.name] || connections[node.id] || {};
    const inputs = findInputConnections(node, connections, nodeMap);
    
    return {
      node_id: node.id,
      node_name: node.name,
      node_type: node.type,
      has_inputs: inputs.length > 0,
      input_connections: inputs,
      output_connections: nodeConn.main ? nodeConn.main.length : 0,
      error_outputs: nodeConn.error ? nodeConn.error.length : 0,
      onError: node.onError || null,
      disabled: node.disabled || false,
      why_no_inputs: inputs.length === 0 ? analyzeWhyNoInputs(node, connections, workflow) : null
    };
  });
  
  console.log(`✅ Error Handler: ${errorHandlers.length} Nodes gefunden\n`);
  errorHandlers.forEach(node => {
    const inputs = findInputConnections(node, connections, nodeMap);
    console.log(`   - ${node.name} (${node.type})`);
    console.log(`     Inputs: ${inputs.length > 0 ? '✅ ' + inputs.map(i => i.source_node).join(', ') : '❌ Keine'}`);
    if (inputs.length === 0) {
      console.log(`     Grund: ${analyzeWhyNoInputs(node, connections, workflow)}`);
    }
    console.log('');
  });
  
  // 3. Shop Configuration Analyse (S24 = shop1, DDC = shop2?)
  console.log('🔍 ANALYSE: Shop Configuration (S24/DDC Flows)\n');
  const shopConfig = workflow.nodes.find(n => n.name === 'Shop Configuration2');
  
  if (shopConfig && shopConfig.parameters) {
    const shop1Assignment = assignments.find(a => a.name === 'shop1_name');
    const shop2Assignment = assignments.find(a => a.name === 'shop2_name');
    const shop1Id = assignments.find(a => a.name === 'shop1_id');
    const shop2Id = assignments.find(a => a.name === 'shop2_id');
    
    const shop1Name = shop1Assignment?.value || 'Not found';
    const shop2Name = shop2Assignment?.value || 'Not found';
    const shop1IdValue = shop1Id?.value || 'Not found';
    const shop2IdValue = shop2Id?.value || 'Not found';
    
    console.log(`✅ Shop Configuration2 gefunden (Set Node)`);
    console.log(`   Shop 1 Name: ${shop1Name} (ID: ${shop1IdValue}) - S24 FLOW?`);
    console.log(`   Shop 2 Name: ${shop2Name} (ID: ${shop2IdValue}) - DDC FLOW?`);
    console.log('');
    
    // Finde Nodes die shop1_id oder shop2_id verwenden
    const shop1Nodes = workflow.nodes.filter(n => {
      const params = JSON.stringify(n.parameters || {});
      return params.includes('shop1_id') || params.includes('Siliconedolls24');
    });
    
    const shop2Nodes = workflow.nodes.filter(n => {
      const params = JSON.stringify(n.parameters || {});
      return params.includes('shop2_id') || params.includes('DreamDoll') || params.includes('dreamdoll');
    });
    
    console.log(`   Shop 1 (S24?) Nodes: ${shop1Nodes.length}`);
    shop1Nodes.slice(0, 10).forEach(n => console.log(`     - ${n.name}`));
    console.log('');
    
    console.log(`   Shop 2 (DDC?) Nodes: ${shop2Nodes.length}`);
    shop2Nodes.slice(0, 10).forEach(n => console.log(`     - ${n.name}`));
    console.log('');
    
    report.shop_configuration = {
      shop1_name: shop1Name,
      shop1_id: shop1IdValue,
      shop2_name: shop2Name,
      shop2_id: shop2IdValue,
      shop1_nodes_count: shop1Nodes.length,
      shop2_nodes_count: shop2Nodes.length,
      shop1_nodes: shop1Nodes.slice(0, 20).map(n => ({
        name: n.name,
        type: n.type,
        id: n.id
      })),
      shop2_nodes: shop2Nodes.slice(0, 20).map(n => ({
        name: n.name,
        type: n.type,
        id: n.id
      }))
    };
  } else {
    console.log('❌ Shop Configuration2 nicht gefunden oder kein Code!\n');
    report.shop_configuration = { error: 'Not found' };
  }
  
  // 4. Speichere Report
  const reportFile = path.join(__dirname, '..', 'WORKFLOW_DETAILED_ANALYSIS_REPORT.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  // 5. Erstelle Markdown Report
  const markdownReport = generateMarkdownReport(report, workflow, connections, nodeMap);
  const mdFile = path.join(__dirname, '..', 'WORKFLOW_DETAILED_ANALYSIS_REPORT.md');
  fs.writeFileSync(mdFile, markdownReport);
  
  console.log(`💾 Reports gespeichert:`);
  console.log(`   JSON: ${reportFile}`);
  console.log(`   Markdown: ${mdFile}\n`);
  
  return report;
}

function findInputConnections(node, connections, nodeMap) {
  const inputs = [];
  Object.keys(connections).forEach(sourceKey => {
    const conn = connections[sourceKey];
    if (conn.main) {
      conn.main.forEach(outputs => {
        if (Array.isArray(outputs)) {
          outputs.forEach(out => {
            if (out.node === node.id || out.node === node.name) {
              const sourceNode = nodeMap[sourceKey] || { name: sourceKey, id: sourceKey };
              inputs.push({
                source_node: sourceNode.name,
                source_id: sourceKey,
                type: 'main'
              });
            }
          });
        }
      });
    }
    if (conn.error) {
      conn.error.forEach(outputs => {
        if (Array.isArray(outputs)) {
          outputs.forEach(out => {
            if (out.node === node.id || out.node === node.name) {
              const sourceNode = nodeMap[sourceKey] || { name: sourceKey, id: sourceKey };
              inputs.push({
                source_node: sourceNode.name,
                source_id: sourceKey,
                type: 'error'
              });
            }
          });
        }
      });
    }
  });
  return inputs;
}

function analyzeWhyNoInputs(node, connections, workflow) {
  if (node.disabled) {
    return 'Node ist disabled';
  }
  if (node.type.includes('Trigger')) {
    return 'Node ist ein Trigger - hat per Definition keine Inputs';
  }
  if (node.onError && node.onError !== 'stopAndError') {
    return `Node hat onError: ${node.onError} aber keine Error-Verbindungen von anderen Nodes`;
  }
  return 'Keine Verbindungen gefunden - möglicherweise nicht verbunden oder fehlende Connections';
}

function generateMarkdownReport(report, workflow, connections, nodeMap) {
  let md = `# 📊 MECHTECH WORKFLOW - DETAILLIERTER ANALYSE-REPORT\n\n`;
  md += `**Datum:** ${report.scan_date}\n`;
  md += `**Workflow:** ${report.workflow_name} (${report.workflow_id})\n`;
  md += `**Gesamt Nodes:** ${report.total_nodes}\n\n`;
  md += `---\n\n`;
  
  // Route by Priority
  if (report.route_by_priority && !report.route_by_priority.error) {
    md += `## 🔀 ROUTE BY PRIORITY - ANALYSE\n\n`;
    md += `**Node ID:** ${report.route_by_priority.node_id}\n`;
    md += `**Total Outputs:** ${report.route_by_priority.total_outputs}\n`;
    md += `**Error Connection:** ${report.route_by_priority.has_error_connection ? '✅' : '❌'}\n`;
    md += `**onError:** ${report.route_by_priority.onError || 'none'}\n\n`;
    
    md += `### Bedingungen:\n\n`;
    report.route_by_priority.conditions.forEach((cond, idx) => {
      md += `${idx + 1}. **${cond.output_key}**\n`;
      md += `   - Condition: \`${cond.condition.map(c => `${c.leftValue} ${c.operator} ${c.rightValue}`).join(' AND ')}\`\n`;
      md += `   - Target: ${cond.target_node}\n\n`;
    });
    md += `---\n\n`;
  }
  
  // Error Handlers
  if (report.error_handlers && report.error_handlers.length > 0) {
    md += `## 🔴 ERROR HANDLER - ANALYSE\n\n`;
    md += `**Anzahl:** ${report.error_handlers.length}\n\n`;
    
    report.error_handlers.forEach(handler => {
      md += `### ${handler.node_name}\n\n`;
      md += `- **Type:** ${handler.node_type}\n`;
      md += `- **Node ID:** ${handler.node_id}\n`;
      md += `- **Has Inputs:** ${handler.has_inputs ? '✅' : '❌'}\n`;
      
      if (handler.has_inputs) {
        md += `- **Input Connections:**\n`;
        handler.input_connections.forEach(input => {
          md += `  - ${input.source_node} (${input.type})\n`;
        });
      } else {
        md += `- **Warum keine Inputs:** ${handler.why_no_inputs}\n`;
      }
      
      md += `- **Output Connections:** ${handler.output_connections}\n`;
      md += `- **Error Outputs:** ${handler.error_outputs}\n`;
      md += `- **onError:** ${handler.onError || 'none'}\n`;
      md += `- **Disabled:** ${handler.disabled ? '✅' : '❌'}\n\n`;
    });
    md += `---\n\n`;
  }
  
  // Shop Configuration
  if (report.shop_configuration && !report.shop_configuration.error) {
    md += `## 🏪 SHOP CONFIGURATION - S24/DDC FLOWS\n\n`;
    md += `- **Shop 1 Name:** ${report.shop_configuration.shop1_name || 'Not found'}\n`;
    md += `- **Shop 2 Name:** ${report.shop_configuration.shop2_name || 'Not found'}\n\n`;
    
    md += `### Shop 1 Nodes (${report.shop_configuration.shop1_nodes_count}):\n\n`;
    report.shop_configuration.shop1_nodes.forEach((node, idx) => {
      md += `${idx + 1}. ${node.name} (${node.type})\n`;
    });
    md += `\n`;
    
    md += `### Shop 2 Nodes (${report.shop_configuration.shop2_nodes_count}):\n\n`;
    report.shop_configuration.shop2_nodes.forEach((node, idx) => {
      md += `${idx + 1}. ${node.name} (${node.type})\n`;
    });
    md += `\n---\n\n`;
  }
  
  return md;
}

if (require.main === module) {
  analyzeWorkflow();
}

module.exports = { analyzeWorkflow };
