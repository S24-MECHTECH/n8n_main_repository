/**
 * 🔄 REPLACE GEMINI NODES WITH CODE NODES
 * Ersetzt Gemini Tool Nodes mit Code Nodes die Gemini API direkt aufrufen
 * Das funktioniert ohne zusätzliche Node-Installation!
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

const strandDefinitions = [
  { name: 'Adult', updateNode: 'Update Product Adult Flag' },
  { name: 'Images', updateNode: 'Update Product Images' },
  { name: 'Text', updateNode: 'Update Product Text' },
  { name: 'Quality', updateNode: 'Update Merchant Settings' },
  { name: 'Country', updateNode: 'Update Country Feeds' },
  { name: 'GTN/EAN', updateNode: 'Update GTN/EAN' }
];

/**
 * Erstellt Code Node der Gemini API direkt aufruft
 */
function createGeminiCodeNode(strand, updateNode) {
  const position = [updateNode.position[0] + 350, updateNode.position[1]];
  
  const code = `// Gemini Error Handler - Analysiert Fehler und entscheidet Aktion
const item = $input.first().json;

// Extrahiere Error Information
const errorCode = item.error?.code || item.code || item.statusCode || 0;
const errorMessage = item.error?.message || item.message || 'Unknown error';
const productData = item;

// System Prompt
const systemPrompt = \`Du bist ein Error Handler für n8n Workflows. Analysiere Fehler und entscheide die beste Aktion.

INPUT: error + product data
OUTPUT: JSON mit:
- action: "RETRY" | "REPAIR" | "SKIP" | "ROUTE"
- delay: number (Sekunden für RETRY)
- fixedProduct: object (repariertes Product für REPAIR)
- nextAction: string (Beschreibung)
- reason: string (Warum diese Aktion?)

REGLEN:
- Code 429 (Rate Limit) → action: "RETRY", delay: 5
- Code 400 (Bad Request) → action: "REPAIR", fixedProduct: [reparierte Daten]
- Code 500 (Server Error) → action: "SKIP", nextAction: "tomorrow retry"
- Unknown/Other → action: "ROUTE", nextAction: "merchant_quality"

Antworte IMMER mit validen JSON!\`;

// User Prompt
const userPrompt = \`Analysiere diesen Fehler:

Error Code: \${errorCode}
Error Message: \${errorMessage}
Product Data: \${JSON.stringify(productData, null, 2)}

Was ist die beste Aktion?\`;

// Gemini API Call
const geminiApiKey = $env.GEMINI_API_KEY || 'YOUR_API_KEY';
const geminiUrl = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=\${geminiApiKey}\`;

const requestBody = {
  contents: [{
    parts: [
      { text: systemPrompt + '\\n\\n' + userPrompt }
    ]
  }],
  generationConfig: {
    temperature: 0.3,
    responseMimeType: 'application/json'
  }
};

try {
  const response = await $http.request({
    method: 'POST',
    url: geminiUrl,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody),
    returnFullResponse: true
  });

  // Parse Gemini Response
  const geminiResponse = typeof response === 'string' ? JSON.parse(response) : response;
  const geminiText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  
  let geminiDecision;
  try {
    geminiDecision = JSON.parse(geminiText);
  } catch (e) {
    // Fallback: Parse aus Text extrahieren
    const jsonMatch = geminiText.match(/\\{[\\s\\S]*\\}/);
    if (jsonMatch) {
      geminiDecision = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Kein JSON in Gemini Response gefunden');
    }
  }

  // Return Result
  return {
    json: {
      ...productData,
      errorAnalysis: {
        originalCode: errorCode,
        originalMessage: errorMessage,
        action: geminiDecision.action || 'SKIP',
        delay: geminiDecision.delay || 0,
        fixedProduct: geminiDecision.fixedProduct || productData,
        nextAction: geminiDecision.nextAction || 'Unknown',
        reason: geminiDecision.reason || 'Gemini Analysis',
        geminiResponse: geminiText
      }
    }
  };
  
} catch (error) {
  // Fallback: Einfache Rule-basierte Entscheidung
  let action = 'SKIP';
  let delay = 0;
  let nextAction = 'Unknown';
  let reason = 'API Error, using fallback rules';
  
  if (errorCode === 429) {
    action = 'RETRY';
    delay = 5;
    reason = 'Rate Limit detected';
  } else if (errorCode === 400) {
    action = 'REPAIR';
    reason = 'Bad Request - needs repair';
  } else if (errorCode === 500) {
    action = 'SKIP';
    nextAction = 'tomorrow retry';
    reason = 'Server Error - skip for today';
  } else {
    action = 'ROUTE';
    nextAction = 'merchant_quality';
    reason = 'Unknown error - route to quality check';
  }
  
  return {
    json: {
      ...productData,
      errorAnalysis: {
        originalCode: errorCode,
        originalMessage: errorMessage,
        action: action,
        delay: delay,
        fixedProduct: productData,
        nextAction: nextAction,
        reason: reason,
        fallback: true
      }
    }
  };
}`;

  return {
    id: `gemini-error-${strand.name.toLowerCase().replace(/[\/\s]/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `Gemini Error Handler ${strand.name}`,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: position,
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: code
    }
  };
}

async function replaceGeminiNodes() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 REPLACE GEMINI NODES WITH CODE NODES');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      console.error('❌ N8N_API_KEY fehlt!');
      process.exit(1);
    }
    
    // 1. Workflow laden
    console.log('📥 Lade Workflow...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    let nodes = workflow.nodes || [];
    let connections = workflow.connections || {};
    
    console.log(`✅ Workflow: ${workflow.name}`);
    console.log(`   Nodes vorher: ${nodes.length}\n`);
    
    // 2. Entferne alte Gemini Tool Nodes
    console.log('🗑️  Entferne alte Gemini Tool Nodes...\n');
    
    const geminiToolNodes = nodes.filter(n => 
      n.type === '@n8n/n8n-nodes-langchain.googleGeminiTool' &&
      n.name && n.name.includes('Gemini Error Handler')
    );
    
    const geminiNodeIds = new Set(geminiToolNodes.map(n => n.id));
    
    // Entferne Connections
    if (connections.main && Array.isArray(connections.main) && connections.main[0]) {
      connections.main[0] = connections.main[0].filter(conn => 
        !Array.isArray(conn) || 
        (!geminiNodeIds.has(conn[0]?.node) && !geminiNodeIds.has(conn[1]?.node))
      );
    }
    
    // Entferne node-based Connections
    geminiToolNodes.forEach(geminiNode => {
      delete connections[geminiNode.name];
      
      Object.keys(connections).forEach(nodeName => {
        if (connections[nodeName]?.main) {
          connections[nodeName].main = connections[nodeName].main.map(outputArray => {
            if (Array.isArray(outputArray)) {
              return outputArray.filter(conn => 
                (typeof conn === 'object' && conn.node !== geminiNode.name) ||
                (typeof conn === 'string' && conn !== geminiNode.name)
              );
            }
            return outputArray;
          });
        }
      });
    });
    
    // Entferne Nodes
    nodes = nodes.filter(n => !geminiNodeIds.has(n.id));
    
    console.log(`   ✅ ${geminiToolNodes.length} Gemini Tool Node(s) entfernt\n`);
    
    // 3. Erstelle Code Nodes
    console.log('💻 Erstelle Code Nodes (Gemini API)...\n');
    
    let addedCount = 0;
    
    for (const strand of strandDefinitions) {
      console.log(`📋 STRANG: ${strand.name}\n`);
      
      // Finde Update Node
      const updateNode = nodes.find(n => n.name === strand.updateNode);
      if (!updateNode) {
        console.log(`   ⚠️  ${strand.updateNode} nicht gefunden - übersprungen\n`);
        continue;
      }
      
      // Prüfe ob Code Node bereits existiert
      const existingCode = nodes.find(n => 
        n.name === `Gemini Error Handler ${strand.name}` &&
        n.type === 'n8n-nodes-base.code'
      );
      
      if (existingCode) {
        console.log(`   ⏭️  Code Node bereits vorhanden: ${existingCode.name}\n`);
        continue;
      }
      
      // Erstelle Code Node
      const codeNode = createGeminiCodeNode(strand, updateNode);
      nodes.push(codeNode);
      addedCount++;
      
      console.log(`   ✅ ${codeNode.name} erstellt`);
      console.log(`      Position: [${codeNode.position[0]}, ${codeNode.position[1]}]`);
      console.log(`      Type: Code Node (Gemini API)\n`);
    }
    
    if (addedCount === 0) {
      console.log('✅ Alle Code Nodes bereits vorhanden\n');
    } else {
      console.log(`   📊 ${addedCount} Code Node(s) erstellt\n`);
    }
    
    // 4. Deploy zu n8n
    console.log('🚀 Deploy zu n8n...\n');
    
    const cleanSettings = { 
      executionOrder: workflow.settings?.executionOrder || 'v1' 
    };
    
    const updatePayload = {
      name: workflow.name,
      nodes: nodes,
      connections: connections,
      settings: cleanSettings
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    console.log('   ✅ Workflow aktualisiert\n');
    
    // 5. REPORT
    console.log('📊 REPORT\n');
    console.log('✅ CODE NODES ERSTELLT');
    console.log(`   ✅ ${geminiToolNodes.length} Gemini Tool Node(s) entfernt`);
    console.log(`   ✅ ${addedCount} Code Node(s) erstellt`);
    console.log(`   ✅ Nodes jetzt: ${nodes.length}`);
    console.log('\n   💡 Code Nodes verwenden Gemini API direkt (keine Node-Installation nötig)');
    console.log('   💡 NÄCHSTER SCHRITT: Connections bauen!');
    console.log('   💡 Update Node → Gemini Error Handler (Code) → Action Handler\n');
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
  replaceGeminiNodes();
}

module.exports = { replaceGeminiNodes, createGeminiCodeNode };
