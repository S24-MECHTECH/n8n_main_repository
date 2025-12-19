/**
 * CHECK WORKFLOW STATUS AFTER FIX
 * Prüft Workflow Status nach fix-workflow-auto.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

function getApiKey() {
  if (process.env.N8N_API_KEY) return process.env.N8N_API_KEY;
  
  const configPaths = [
    path.join(__dirname, '..', '..', '.cursor', 'mcp.json'),
    path.join(__dirname, '..', '..', '.cursor', 'FUNKTIONIERENDE_CONFIG.json'),
    path.join(process.env.USERPROFILE || process.env.HOME, '.cursor', 'mcp.json'),
    path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json')
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.mcpServers?.['n8n-mcp']?.env?.N8N_API_KEY) {
          return config.mcpServers['n8n-mcp'].env.N8N_API_KEY;
        }
      }
    } catch (error) {}
  }
  return null;
}

const N8N_API_KEY = getApiKey();

function n8nRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, N8N_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
    
    const req = lib.request(options, (res) => {
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
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const switchNodeNames = [
  'Switch Action Handler Adult Flags',
  'Switch Action Handler Images',
  'Switch Action Handler Text',
  'Switch Action Handler Merchant Quality',
  'Switch Action Handler Multi Country',
  'Switch Action Handler GTN/EAN'
];

async function checkWorkflowStatusAfterFix() {
  console.log('\n' + '='.repeat(80));
  console.log('CHECK WORKFLOW STATUS AFTER FIX');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY nicht gefunden!');
    }
    
    // 1. Lade Workflow
    console.log('1. LADE WORKFLOW...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || {};
    
    console.log(`   Workflow: ${workflow.name}`);
    console.log(`   Active: ${workflow.active ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   Nodes: ${nodes.length}\n`);
    
    // 2. Prüfe Switch Nodes
    console.log('2. PRÜFE SWITCH NODES...\n');
    
    let switchNodesFound = 0;
    let switchNodesConfigured = 0;
    
    for (const switchName of switchNodeNames) {
      const switchNode = nodes.find(n => n.name === switchName);
      
      if (!switchNode) {
        console.log(`   ❌ ${switchName} - NICHT GEFUNDEN`);
        continue;
      }
      
      switchNodesFound++;
      
      const hasMode = switchNode.parameters?.mode;
      const hasRules = switchNode.parameters?.rules;
      const hasFallback = switchNode.parameters?.fallbackOutput !== undefined;
      
      if (hasMode && (hasRules || hasMode === 'expression')) {
        switchNodesConfigured++;
        console.log(`   ✅ ${switchName}`);
        console.log(`      Mode: ${hasMode}`);
        console.log(`      Configured: ${hasRules ? 'Rules' : (hasMode === 'expression' ? 'Expression' : 'Unknown')}`);
        console.log(`      Fallback: ${hasFallback ? switchNode.parameters.fallbackOutput : 'NOT SET'}`);
      } else {
        console.log(`   ⚠️  ${switchName} - NICHT KONFIGURIERT`);
        console.log(`      Mode: ${hasMode || 'NOT SET'}`);
      }
    }
    
    console.log(`\n   Switch Nodes: ${switchNodesFound}/${switchNodeNames.length} gefunden`);
    console.log(`   Configured: ${switchNodesConfigured}/${switchNodeNames.length}\n`);
    
    // 3. Prüfe Connections
    console.log('3. PRÜFE CONNECTIONS...\n');
    
    // Rate Limiting → Gemini
    const rateLimitingNodes = nodes.filter(n => n.name.includes('Rate Limiting') && n.type.includes('wait'));
    const geminiNodes = nodes.filter(n => n.name.includes('Gemini Error Handler') && n.type.includes('gemini'));
    
    let rateLimitingToGemini = 0;
    for (const rateNode of rateLimitingNodes) {
      const rateConnections = connections[rateNode.name]?.main?.[0] || [];
      const hasGeminiConnection = rateConnections.some(c => {
        const target = typeof c === 'object' ? c.node : c;
        return geminiNodes.some(g => g.name === target);
      });
      if (hasGeminiConnection) rateLimitingToGemini++;
    }
    
    console.log(`   Rate Limiting → Gemini: ${rateLimitingToGemini}/${rateLimitingNodes.length}`);
    
    // Gemini → Switch
    let geminiToSwitch = 0;
    for (const geminiNode of geminiNodes) {
      const geminiConnections = connections[geminiNode.name]?.main?.[0] || [];
      const hasSwitchConnection = geminiConnections.some(c => {
        const target = typeof c === 'object' ? c.node : c;
        return switchNodeNames.includes(target);
      });
      if (hasSwitchConnection) geminiToSwitch++;
    }
    
    console.log(`   Gemini → Switch: ${geminiToSwitch}/${geminiNodes.length}\n`);
    
    // Switch Outputs
    let switchOutputsConnected = 0;
    let totalSwitchOutputs = 0;
    
    for (const switchName of switchNodeNames) {
      const switchConnections = connections[switchName]?.main || [];
      totalSwitchOutputs += switchConnections.length;
      
      for (let i = 0; i < switchConnections.length; i++) {
        if (switchConnections[i] && switchConnections[i].length > 0) {
          switchOutputsConnected++;
        }
      }
    }
    
    console.log(`   Switch Outputs: ${switchOutputsConnected} verbunden (${totalSwitchOutputs} total)\n`);
    
    // 4. REPORT
    console.log('='.repeat(80));
    console.log('REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log(`Workflow Active: ${workflow.active ? '✅ JA' : '❌ NEIN'}`);
    console.log(`Switch Nodes: ${switchNodesFound}/${switchNodeNames.length} gefunden, ${switchNodesConfigured}/${switchNodeNames.length} konfiguriert`);
    console.log(`Rate Limiting → Gemini: ${rateLimitingToGemini}/${rateLimitingNodes.length}`);
    console.log(`Gemini → Switch: ${geminiToSwitch}/${geminiNodes.length}`);
    console.log(`Switch Outputs: ${switchOutputsConnected}/${totalSwitchOutputs} verbunden`);
    
    if (workflow.active && 
        switchNodesFound === switchNodeNames.length && 
        switchNodesConfigured === switchNodeNames.length &&
        rateLimitingToGemini === rateLimitingNodes.length &&
        geminiToSwitch === geminiNodes.length &&
        switchOutputsConnected > 0) {
      console.log('\n✅ WORKFLOW IST KORREKT KONFIGURIERT!\n');
    } else {
      console.log('\n⚠️  WORKFLOW BENÖTIGT NOCH ANPASSUNGEN\n');
    }
    
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  checkWorkflowStatusAfterFix();
}

module.exports = { checkWorkflowStatusAfterFix };


