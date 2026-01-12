#!/usr/bin/env node
/**
 * VOLLSTÄNDIGER WORKFLOW-SCAN REPORT
 * NUR ANALYSE - KEINE ÄNDERUNGEN!
 */

const fs = require('fs');
const path = require('path');

const WORKFLOW_FILE = path.join(__dirname, '..', 'workflows', 'MERCHANT_CENTER_ADMIN_ftZOou7HNgLOwzE5_FROM_SERVER.json');

function createFullReport() {
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));
  const connections = workflow.connections || {};
  
  // Node-Map: ID -> Name
  const nodeMap = {};
  workflow.nodes.forEach(n => {
    nodeMap[n.id] = n.name || 'UNNAMED';
  });
  
  // Alle Nodes auflisten
  const allNodes = workflow.nodes.map(n => ({
    id: n.id,
    name: n.name || 'UNNAMED',
    type: n.type,
    position: n.position,
    disabled: n.disabled || false,
    onError: n.onError || null
  }));
  
  // Route Command analysieren
  const routeCommandNodes = workflow.nodes.filter(n => n.name === 'Route Command');
  const routeCommandAnalysis = routeCommandNodes.map(node => {
    const conn = connections[node.name] || connections[node.id] || {};
    return {
      id: node.id,
      name: node.name,
      position: node.position,
      onError: node.onError,
      disabled: node.disabled || false,
      connections: {
        main: conn.main ? conn.main.length : 0,
        error: conn.error ? conn.error.length : 0,
        error_details: conn.error || null
      }
    };
  });
  
  // Format Status Response analysieren
  const formatStatusNodes = workflow.nodes.filter(n => n.name === 'Format Status Response');
  const formatStatusAnalysis = formatStatusNodes.map(node => {
    const conn = connections[node.name] || connections[node.id] || {};
    return {
      id: node.id,
      name: node.name,
      position: node.position,
      onError: node.onError,
      disabled: node.disabled || false,
      has_debug_logging: node.parameters?.jsCode?.includes('DEBUG LOGGING') || false,
      connections: {
        main: conn.main ? conn.main.length : 0,
        error: conn.error ? (conn.error.length > 0 ? conn.error.length : 'EMPTY_ARRAY') : 'MISSING',
        error_details: conn.error || null
      }
    };
  });
  
  // Send Command Response analysieren
  const sendResponseNodes = workflow.nodes.filter(n => n.name === 'Send Command Response');
  const sendResponseAnalysis = sendResponseNodes.map(node => {
    return {
      id: node.id,
      name: node.name,
      position: node.position,
      onError: node.onError,
      disabled: node.disabled || false,
      subject: node.parameters?.subject || null,
      message: node.parameters?.message ? node.parameters.message.substring(0, 150) : null,
      sendTo: node.parameters?.sendTo || null
    };
  });
  
  // Alle Error-Connections finden
  const allErrorConnections = [];
  Object.keys(connections).forEach(sourceKey => {
    const conn = connections[sourceKey];
    if (conn.error && conn.error.length > 0) {
      conn.error.forEach((outputs, idx) => {
        outputs.forEach(out => {
          allErrorConnections.push({
            from_node: nodeMap[sourceKey] || sourceKey,
            from_id: sourceKey,
            to_node: nodeMap[out.node] || out.node,
            to_id: out.node,
            output_index: idx
          });
        });
      });
    }
  });
  
  // Alle Main-Connections finden
  const allMainConnections = [];
  Object.keys(connections).forEach(sourceKey => {
    const conn = connections[sourceKey];
    if (conn.main && conn.main.length > 0) {
      conn.main.forEach((outputs, idx) => {
        outputs.forEach(out => {
          allMainConnections.push({
            from_node: nodeMap[sourceKey] || sourceKey,
            from_id: sourceKey,
            to_node: nodeMap[out.node] || out.node,
            to_id: out.node,
            output_index: idx,
            type: out.type || 'main'
          });
        });
      });
    }
  });
  
  // Report erstellen
  const report = {
    scan_date: new Date().toISOString(),
    workflow_url: "https://n8n.srv1091615.hstgr.cloud/workflow/ftZOou7HNgLOwzE5",
    workflow: {
      id: workflow.id,
      name: workflow.name,
      active: workflow.active,
      updatedAt: workflow.updatedAt,
      createdAt: workflow.createdAt
    },
    statistics: {
      total_nodes: workflow.nodes.length,
      unique_node_names: [...new Set(workflow.nodes.map(n => n.name))].length,
      connection_source_nodes: Object.keys(connections).length,
      total_main_connections: allMainConnections.length,
      total_error_connections: allErrorConnections.length
    },
    all_nodes: allNodes,
    main_connections: allMainConnections,
    error_connections: allErrorConnections,
    specific_analysis: {
      route_command: routeCommandAnalysis,
      format_status_response: formatStatusAnalysis,
      send_command_response: sendResponseAnalysis
    },
    findings: {
      route_command_53_errors: {
        status: "PROBLEM",
        description: "53 Items am Error-Port, aber Error-Verbindung vorhanden",
        nodes: routeCommandAnalysis,
        issue: "Warum sammelt Node so viele Errors trotz Error-Verbindung?"
      },
      format_status_response_no_error_connection: {
        status: "CRITICAL",
        description: "Format Status Response hat KEINE Error-Verbindung",
        nodes: formatStatusAnalysis.filter(n => n.connections.error === 'MISSING' || n.connections.error === 'EMPTY_ARRAY'),
        issue: "Error-Port ist leer oder fehlt komplett"
      },
      send_command_response_input_issue: {
        status: "WARNING",
        description: "Send Command Response verwendet möglicherweise falschen Input",
        nodes: sendResponseAnalysis,
        issue: "Einige Versionen verwenden Get Workflow Status REAL.error statt $json.response"
      }
    }
  };
  
  // Speichere Report
  const reportFile = path.join(__dirname, '..', 'cursor-ping.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log('✅ Vollständiger Scan-Report erstellt!');
  console.log(`   Datei: ${reportFile}`);
  console.log(`   Nodes: ${report.statistics.total_nodes}`);
  console.log(`   Main Connections: ${report.statistics.total_main_connections}`);
  console.log(`   Error Connections: ${report.statistics.total_error_connections}`);
  
  return report;
}

if (require.main === module) {
  createFullReport();
}

module.exports = { createFullReport };
