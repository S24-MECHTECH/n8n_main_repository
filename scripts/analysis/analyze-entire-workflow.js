/**
 * ANALYZE ENTIRE WORKFLOW
 * Analysiert den kompletten Workflow: Connections, Nodes, Logik
 * NUR ANALYSIEREN - KEINE ÄNDERUNGEN!
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

function getApiKey() {
  if (process.env.N8N_API_KEY) return process.env.N8N_API_KEY;
  if (process.argv[2]) return process.argv[2];
  
  const configPaths = [
    path.join(__dirname, '..', '..', '.cursor', 'mcp.json'),
    path.join(process.env.USERPROFILE || process.env.HOME, '.cursor', 'mcp.json'),
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const cleanedContent = configContent.replace(/^\uFEFF/, '');
        const config = JSON.parse(cleanedContent);
        
        // Try to extract Bearer token from header
        if (config.mcpServers?.['n8n-mcp']?.args) {
          const args = config.mcpServers['n8n-mcp'].args;
          const headerIndex = args.indexOf('--header');
          if (headerIndex !== -1 && args[headerIndex + 1]) {
            const headerValue = args[headerIndex + 1];
            const match = headerValue.match(/authorization:Bearer\s+(.+)/i);
            if (match && match[1]) {
              return match[1];
            }
          }
        }
      }
    } catch (error) {
      // Continue to next path
    }
  }
  return null;
}

const N8N_API_KEY = getApiKey();

if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY fehlt!');
  console.error('   Bitte setzen Sie N8N_API_KEY als Environment Variable oder als Argument');
  process.exit(1);
}

function n8nRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, N8N_URL);
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

async function analyzeEntireWorkflow() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VOLLSTÄNDIGE WORKFLOW-ANALYSE');
  console.log('='.repeat(80) + '\n');
  console.log('⚠️  NUR ANALYSE - KEINE ÄNDERUNGEN!\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    console.log(`📌 Workflow: ${workflow.name}`);
    console.log(`   ID: ${WORKFLOW_ID}`);
    console.log(`   Nodes: ${workflow.nodes.length}\n`);
    
    // 1. FIND ALL NODES
    console.log('='.repeat(80));
    console.log('1️⃣  ALLE NODES');
    console.log('='.repeat(80) + '\n');
    
    const nodes = workflow.nodes;
    const nodeMap = {};
    nodes.forEach(node => {
      nodeMap[node.name] = node;
    });
    
    // Kategorisiere Nodes
    const prepareNodes = nodes.filter(n => n.name.toLowerCase().includes('prepare'));
    const updateNodes = nodes.filter(n => n.name.toLowerCase().includes('update'));
    const routeNodes = nodes.filter(n => n.name.toLowerCase().includes('route') || n.name.toLowerCase().includes('priority'));
    const otherNodes = nodes.filter(n => 
      !n.name.toLowerCase().includes('prepare') &&
      !n.name.toLowerCase().includes('update') &&
      !n.name.toLowerCase().includes('route') &&
      !n.name.toLowerCase().includes('priority')
    );
    
    console.log(`📊 Node-Kategorien:`);
    console.log(`   Prepare Nodes: ${prepareNodes.length}`);
    console.log(`   Update Nodes: ${updateNodes.length}`);
    console.log(`   Route/Priority Nodes: ${routeNodes.length}`);
    console.log(`   Andere Nodes: ${otherNodes.length}\n`);
    
    // Zeige alle Nodes
    console.log('📋 ALLE NODES:\n');
    nodes.forEach((node, index) => {
      const nodeType = node.type.replace('n8n-nodes-base.', '');
      console.log(`   ${index + 1}. ${node.name} (${nodeType})`);
    });
    console.log();
    
    // 2. ANALYZE CONNECTIONS
    console.log('='.repeat(80));
    console.log('2️⃣  CONNECTIONS ANALYSE');
    console.log('='.repeat(80) + '\n');
    
    const connections = workflow.connections || {};
    
    // Finde alle Prepare Nodes und ihre Connections
    console.log('🔗 PREPARE NODES CONNECTIONS:\n');
    prepareNodes.forEach(node => {
      const nodeConn = connections[node.name];
      if (nodeConn && nodeConn.main && nodeConn.main[0]) {
        const outputs = nodeConn.main[0].map(c => c.node);
        console.log(`   ${node.name}`);
        console.log(`      → ${outputs.join(', ')}`);
      } else {
        console.log(`   ${node.name}`);
        console.log(`      ❌ KEINE OUTPUT CONNECTIONS!`);
      }
    });
    console.log();
    
    // Finde alle Update Nodes und ihre Connections
    console.log('🔗 UPDATE NODES CONNECTIONS:\n');
    updateNodes.forEach(node => {
      const nodeConn = connections[node.name];
      const inputs = nodes.filter(n => {
        const conn = connections[n.name];
        return conn && conn.main && conn.main[0] && conn.main[0].some(c => c.node === node.name);
      });
      
      if (nodeConn && nodeConn.main && nodeConn.main[0]) {
        const outputs = nodeConn.main[0].map(c => c.node);
        console.log(`   ${node.name}`);
        console.log(`      ← Von: ${inputs.map(n => n.name).join(', ') || 'KEINE INPUTS'}`);
        console.log(`      → ${outputs.join(', ')}`);
      } else {
        console.log(`   ${node.name}`);
        console.log(`      ← Von: ${inputs.map(n => n.name).join(', ') || 'KEINE INPUTS'}`);
        console.log(`      ❌ KEINE OUTPUT CONNECTIONS!`);
      }
    });
    console.log();
    
    // 3. FIND PROBLEM AREAS
    console.log('='.repeat(80));
    console.log('3️⃣  PROBLEM-BEREICHE');
    console.log('='.repeat(80) + '\n');
    
    // Nodes ohne Inputs (außer Start/Trigger)
    console.log('❌ NODES OHNE INPUT CONNECTIONS:\n');
    let problemCount = 0;
    nodes.forEach(node => {
      if (node.type.includes('trigger') || node.type.includes('manual')) {
        return; // Trigger haben keine Inputs
      }
      
      const hasInput = nodes.some(otherNode => {
        const conn = connections[otherNode.name];
        return conn && conn.main && conn.main[0] && conn.main[0].some(c => c.node === node.name);
      });
      
      if (!hasInput) {
        console.log(`   ⚠️  ${node.name} - Hat keine Input Connections!`);
        problemCount++;
      }
    });
    if (problemCount === 0) {
      console.log('   ✅ Alle Nodes haben Inputs\n');
    } else {
      console.log();
    }
    
    // Nodes ohne Outputs
    console.log('❌ NODES OHNE OUTPUT CONNECTIONS:\n');
    problemCount = 0;
    nodes.forEach(node => {
      if (node.type.includes('googleSheets') || node.type.includes('googleDrive')) {
        return; // End-Nodes können keine Outputs haben
      }
      
      const nodeConn = connections[node.name];
      const hasOutput = nodeConn && nodeConn.main && nodeConn.main[0] && nodeConn.main[0].length > 0;
      
      if (!hasOutput) {
        console.log(`   ⚠️  ${node.name} - Hat keine Output Connections!`);
        problemCount++;
      }
    });
    if (problemCount === 0) {
      console.log('   ✅ Alle Nodes haben Outputs\n');
    } else {
      console.log();
    }
    
    // 4. ANALYZE PREPARE CHAIN
    console.log('='.repeat(80));
    console.log('4️⃣  PREPARE CHAIN ANALYSE');
    console.log('='.repeat(80) + '\n');
    
    // Finde die Prepare-Kette
    const prepareChain = [];
    const prepareChainNames = [
      'Prepare Products Loop',
      'Prepare Images Loop',
      'Prepare Text Loop',
      'Prepare Merchant Quality Loop',
      'Prepare Multi Country Loop',
      'Prepare GTN/EAN_Loop'
    ];
    
    console.log('🔍 Prüfe Prepare-Kette:\n');
    prepareChainNames.forEach((nodeName, index) => {
      const node = nodeMap[nodeName];
      if (!node) {
        console.log(`   ❌ ${nodeName}: NODE NICHT GEFUNDEN!`);
        return;
      }
      
      const nodeConn = connections[nodeName];
      const nextNodes = nodeConn && nodeConn.main && nodeConn.main[0] ? 
        nodeConn.main[0].map(c => c.node) : [];
      
      const expectedNext = prepareChainNames[index + 1];
      const hasCorrectNext = nextNodes.includes(expectedNext);
      
      console.log(`   ${index + 1}. ${nodeName}`);
      console.log(`      Aktuell verbunden mit: ${nextNodes.join(', ') || 'KEINE'}`);
      if (expectedNext) {
        console.log(`      Erwartet nächster: ${expectedNext}`);
        console.log(`      ${hasCorrectNext ? '✅' : '❌'} ${hasCorrectNext ? 'Korrekt' : 'FALSCH!'}`);
      }
      console.log();
    });
    
    // 5. ANALYZE UPDATE NODES AFTER PREPARE
    console.log('='.repeat(80));
    console.log('5️⃣  UPDATE NODES NACH PREPARE');
    console.log('='.repeat(80) + '\n');
    
    updateNodes.forEach(node => {
      const inputs = nodes.filter(n => {
        const conn = connections[n.name];
        return conn && conn.main && conn.main[0] && conn.main[0].some(c => c.node === node.name);
      });
      
      console.log(`   ${node.name}`);
      console.log(`      Input von: ${inputs.map(n => n.name).join(', ') || 'KEINE'}`);
      
      // Prüfe ob von Prepare-Node kommt
      const fromPrepare = inputs.some(n => n.name.toLowerCase().includes('prepare'));
      console.log(`      ${fromPrepare ? '✅' : '❌'} Kommt ${fromPrepare ? 'von' : 'NICHT von'} Prepare-Node`);
      console.log();
    });
    
    // 6. CHECK ERRORS (rotes Dreieck = Node hat Fehler)
    console.log('='.repeat(80));
    console.log('6️⃣  FEHLER-PRÜFUNG');
    console.log('='.repeat(80) + '\n');
    
    updateNodes.forEach(node => {
      // Prüfe auf häufige Fehler-Indikatoren
      const params = node.parameters || {};
      const auth = params.authentication || 'none';
      const credType = params.nodeCredentialType || 'none';
      const method = params.method || 'GET';
      const url = params.url || '';
      const hasBody = params.sendBody || false;
      
      let hasErrors = false;
      const errors = [];
      
      // Prüfe Authentication
      if (node.type.includes('httpRequest')) {
        if (auth === 'none' || (auth === 'predefinedCredentialType' && credType === 'none')) {
          errors.push('Authentication fehlt');
          hasErrors = true;
        } else if (auth === 'predefinedCredentialType' && credType !== 'googleOAuth2Api' && url.includes('googleapis.com')) {
          errors.push(`Falsche Credential-Type: ${credType} (sollte googleOAuth2Api sein)`);
          hasErrors = true;
        }
      }
      
      // Prüfe Method/Body
      if (method === 'PATCH' && !hasBody) {
        errors.push('PATCH ohne Body');
        hasErrors = true;
      }
      
      if (hasErrors) {
        console.log(`   🔴 ${node.name}:`);
        errors.forEach(err => console.log(`      ❌ ${err}`));
        console.log();
      }
    });
    
    // 7. SUMMARY
    console.log('='.repeat(80));
    console.log('7️⃣  ZUSAMMENFASSUNG');
    console.log('='.repeat(80) + '\n');
    
    console.log('📊 WORKFLOW-STRUKTUR:\n');
    console.log(`   Gesamt Nodes: ${nodes.length}`);
    console.log(`   Prepare Nodes: ${prepareNodes.length}`);
    console.log(`   Update Nodes: ${updateNodes.length}`);
    console.log(`   Route/Priority Nodes: ${routeNodes.length}`);
    console.log(`   Andere Nodes: ${otherNodes.length}\n`);
    
    console.log('🔗 CONNECTION-STATUS:\n');
    const allNodesWithInputs = nodes.filter(node => {
      if (node.type.includes('trigger') || node.type.includes('manual')) return true;
      return nodes.some(otherNode => {
        const conn = connections[otherNode.name];
        return conn && conn.main && conn.main[0] && conn.main[0].some(c => c.node === node.name);
      });
    }).length;
    
    const allNodesWithOutputs = nodes.filter(node => {
      if (node.type.includes('googleSheets') || node.type.includes('googleDrive')) return true;
      const nodeConn = connections[node.name];
      return nodeConn && nodeConn.main && nodeConn.main[0] && nodeConn.main[0].length > 0;
    }).length;
    
    console.log(`   Nodes mit Inputs: ${allNodesWithInputs}/${nodes.length}`);
    console.log(`   Nodes mit Outputs: ${allNodesWithOutputs}/${nodes.length}\n`);
    
    // 8. GEMINI FALLBACK ANALYSE
    console.log('='.repeat(80));
    console.log('8️⃣  GEMINI ERROR HANDLER & FALLBACK ANALYSE');
    console.log('='.repeat(80) + '\n');
    
    const geminiNodes = nodes.filter(n => n.type.includes('gemini') && n.name.includes('Error Handler'));
    const switchNodes = nodes.filter(n => n.type.includes('switch') && n.name.includes('Switch Action Handler'));
    const rateLimitNodes = nodes.filter(n => n.type.includes('wait') && n.name.includes('Rate Limiting'));
    
    console.log(`📊 Error Handling Komponenten:\n`);
    console.log(`   Gemini Error Handler: ${geminiNodes.length}`);
    console.log(`   Switch Action Handler: ${switchNodes.length}`);
    console.log(`   Rate Limiting Nodes: ${rateLimitNodes.length}\n`);
    
    // Prüfe Rate Limiting → Gemini → Switch Pfad
    console.log('🔗 ERROR HANDLING PFAD (Rate Limiting → Gemini → Switch):\n');
    rateLimitNodes.forEach(rateNode => {
      const rateConn = connections[rateNode.name]?.main?.[0] || [];
      const geminiTarget = rateConn.find(c => {
        const target = typeof c === 'object' ? c.node : c;
        return geminiNodes.some(g => g.name === target);
      });
      
      if (geminiTarget) {
        const geminiName = typeof geminiTarget === 'object' ? geminiTarget.node : geminiTarget;
        const geminiConn = connections[geminiName]?.main?.[0] || [];
        const switchTarget = geminiConn.find(c => {
          const target = typeof c === 'object' ? c.node : c;
          return switchNodes.some(s => s.name === target);
        });
        
        console.log(`   ${rateNode.name}`);
        console.log(`      → ${geminiName}`);
        if (switchTarget) {
          const switchName = typeof switchTarget === 'object' ? switchTarget.node : switchTarget;
          console.log(`         → ${switchName} ✅`);
        } else {
          console.log(`         → Switch (FEHLT!) ❌`);
        }
        console.log();
      } else {
        console.log(`   ${rateNode.name}`);
        console.log(`      → Gemini (FEHLT!) ❌`);
        console.log();
      }
    });
    
    // 9. SWITCH NODE KONFIGURATION
    console.log('='.repeat(80));
    console.log('9️⃣  SWITCH NODE KONFIGURATION');
    console.log('='.repeat(80) + '\n');
    
    switchNodes.forEach(switchNode => {
      console.log(`   Switch: ${switchNode.name}`);
      const mode = switchNode.parameters?.mode || 'NOT SET';
      const rules = switchNode.parameters?.rules || [];
      const fallback = switchNode.parameters?.fallbackOutput;
      
      console.log(`      Mode: ${mode}`);
      console.log(`      Rules: ${rules.length}`);
      if (rules.length > 0) {
        rules.forEach((rule, idx) => {
          console.log(`         Rule ${idx + 1}: ${rule.conditions?.[0]?.leftValue || JSON.stringify(rule).substring(0, 80)}...`);
        });
      }
      console.log(`      Fallback Output: ${fallback !== undefined ? fallback : 'NOT SET'}`);
      
      // Prüfe Switch Outputs
      const switchConn = connections[switchNode.name]?.main || [];
      const connectedOutputs = switchConn.filter(c => c && c.length > 0).length;
      console.log(`      Connected Outputs: ${connectedOutputs}/${switchConn.length}`);
      console.log();
    });
    
    // 10. SYSTEM-KONTEXT ANALYSE
    console.log('='.repeat(80));
    console.log('🔟 SYSTEM-KONTEXT ANALYSE');
    console.log('='.repeat(80) + '\n');
    
    const systemContext = {
      purpose: workflow.description || 'Google Merchant Center Optimization via n8n Automation',
      workflowType: 'Error Handling + AI Decision Making',
      keyComponents: {
        errorDetection: `${switchNodes.length} Switch Action Handler Nodes`,
        aiProcessing: `${geminiNodes.length} Gemini Error Handler Nodes`,
        rateLimiting: `${rateLimitNodes.length} Rate Limiting Nodes`,
        dataProcessing: `${prepareNodes.length} Prepare Nodes + ${updateNodes.length} Update Nodes`,
        logging: `${nodes.filter(n => n.type.includes('googleSheets')).length} Google Sheets Nodes`
      },
      dataFlow: {
        input: 'Merchant Center Products/Errors (from API)',
        processing: 'Prepare Nodes → Update Nodes → Error Detection',
        errorHandling: 'Rate Limiting → Gemini AI Analysis → Switch Decision',
        output: 'Retry/Auto-Fix/Reroute/Alert → Log to Sheets'
      },
      geminiCapability: {
        canProcessErrors: true,
        canMakeDecisions: true,
        decisionFormat: 'JSON with action, reasoning, retry_count',
        expectedOutput: 'Switch Node kann JSON-Format verarbeiten'
      }
    };
    
    console.log(`📋 PURPOSE:\n`);
    console.log(`   ${systemContext.purpose}\n`);
    
    console.log(`🏗️  KEY COMPONENTS:\n`);
    Object.entries(systemContext.keyComponents).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });
    console.log();
    
    console.log(`🔄 DATA FLOW:\n`);
    Object.entries(systemContext.dataFlow).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });
    console.log();
    
    console.log(`🤖 GEMINI DECISION CAPABILITY:\n`);
    Object.entries(systemContext.geminiCapability).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });
    console.log();
    
    // 11. GEMINI DECISION FORMAT PRÜFUNG
    console.log('='.repeat(80));
    console.log('1️⃣1️⃣  GEMINI DECISION FORMAT PRÜFUNG');
    console.log('='.repeat(80) + '\n');
    
    geminiNodes.forEach(geminiNode => {
      const systemMessage = geminiNode.parameters?.systemMessage || geminiNode.parameters?.prompt || '';
      const hasJsonFormat = systemMessage.includes('JSON') || systemMessage.includes('json') || 
                           systemMessage.includes('action') || systemMessage.includes('reasoning');
      
      console.log(`   ${geminiNode.name}:`);
      console.log(`      JSON Format erwähnt: ${hasJsonFormat ? '✅ JA' : '⚠️  NICHT EXPLIZIT'}`);
      if (systemMessage) {
        const preview = systemMessage.substring(0, 150).replace(/\n/g, ' ');
        console.log(`      System Message Preview: ${preview}...`);
      }
      console.log();
    });
    
    console.log('💡 EMPFOHLENE NÄCHSTE SCHRITTE:\n');
    console.log('   1. Prüfe welche Connections fehlen');
    console.log('   2. Prüfe welche Prepare→Update Connections korrekt sein sollten');
    console.log('   3. Erstelle Plan zur Wiederherstellung der Connections');
    console.log('   4. Prüfe Switch Node Konfiguration (Mode, Rules, Fallback)');
    console.log('   5. Prüfe Gemini Output Format für Switch Nodes');
    console.log('   6. Warte auf Ihre Zustimmung bevor Änderungen\n');
    
    // Save Extended Report
    const fs = require('fs');
    const path = require('path');
    const report = {
      timestamp: new Date().toISOString(),
      workflow: {
        id: WORKFLOW_ID,
        name: workflow.name,
        description: workflow.description,
        active: workflow.active,
        nodesCount: nodes.length,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt
      },
      nodeCategories: {
        total: nodes.length,
        prepare: prepareNodes.length,
        update: updateNodes.length,
        route: routeNodes.length,
        gemini: geminiNodes.length,
        switch: switchNodes.length,
        rateLimit: rateLimitNodes.length,
        other: otherNodes.length
      },
      systemContext,
      connections: {
        nodesWithInputs: allNodesWithInputs,
        nodesWithOutputs: allNodesWithOutputs,
        totalNodes: nodes.length
      }
    };
    
    const reportPath = path.join(__dirname, '..', 'WORKFLOW_COMPLETE_ANALYSIS_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`📄 Vollständiger Report gespeichert: ${reportPath}\n`);
    
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

analyzeEntireWorkflow();
