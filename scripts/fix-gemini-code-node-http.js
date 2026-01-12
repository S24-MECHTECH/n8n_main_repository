/**
 * 🔧 FIX GEMINI CODE NODE HTTP
 * Korrigiert Code Nodes um HTTP Request Node zu verwenden statt direkter API Calls
 * Oder verwendet einfache Fallback-Regeln wenn Gemini nicht verfügbar
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
 * Korrigierte Code Node mit einfachen Fallback-Regeln
 * (Gemini API Call würde HTTP Request Node benötigen)
 */
function getFixedCode() {
  return `// Gemini Error Handler - Intelligente Fehler-Analyse mit Fallback-Regeln
const item = $input.first().json;

// Extrahiere Error Information
const errorCode = item.error?.code || item.code || item.statusCode || 0;
const errorMessage = item.error?.message || item.message || 'Unknown error';
const productData = { ...item };

// Intelligente Entscheidung basierend auf Error Code
let action = 'SKIP';
let delay = 0;
let nextAction = 'Unknown';
let reason = '';
let fixedProduct = productData;

if (errorCode === 429) {
  // Rate Limit → RETRY mit Delay
  action = 'RETRY';
  delay = 5;
  nextAction = 'Retry after delay';
  reason = 'Rate Limit detected - wait and retry';
  
} else if (errorCode === 400) {
  // Bad Request → REPAIR (versuche zu reparieren)
  action = 'REPAIR';
  delay = 0;
  nextAction = 'Apply fixes and retry';
  reason = 'Bad Request - attempt to repair data';
  
  // Versuche häufige Probleme zu reparieren
  fixedProduct = { ...productData };
  if (!fixedProduct.sku && fixedProduct.id) {
    fixedProduct.sku = fixedProduct.id;
  }
  if (!fixedProduct.title && fixedProduct.name) {
    fixedProduct.title = fixedProduct.name;
  }
  
} else if (errorCode === 500 || errorCode >= 500) {
  // Server Error → SKIP für heute
  action = 'SKIP';
  delay = 0;
  nextAction = 'tomorrow retry';
  reason = 'Server Error - skip for today, retry tomorrow';
  
} else if (errorCode === 404) {
  // Not Found → ROUTE zu Quality Check
  action = 'ROUTE';
  delay = 0;
  nextAction = 'merchant_quality';
  reason = 'Not Found - route to quality check';
  
} else {
  // Unknown Error → ROUTE zu Quality Check
  action = 'ROUTE';
  delay = 0;
  nextAction = 'merchant_quality';
  reason = \`Unknown error (\${errorCode}) - route to quality check\`;
}

// Return Result
return {
  json: {
    ...productData,
    errorAnalysis: {
      originalCode: errorCode,
      originalMessage: errorMessage,
      action: action,
      delay: delay,
      fixedProduct: fixedProduct,
      nextAction: nextAction,
      reason: reason
    }
  }
};`;
}

async function fixGeminiCodeNodes() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX GEMINI CODE NODES');
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
    
    console.log(`✅ Workflow: ${workflow.name}`);
    console.log(`   Nodes: ${nodes.length}\n`);
    
    const fixedCode = getFixedCode();
    let updatedCount = 0;
    
    // 2. Aktualisiere Code Nodes
    console.log('🔧 Aktualisiere Code Nodes...\n');
    
    for (const strand of strandDefinitions) {
      const codeNode = nodes.find(n => 
        n.name === `Gemini Error Handler ${strand.name}` &&
        n.type === 'n8n-nodes-base.code'
      );
      
      if (codeNode) {
        codeNode.parameters.jsCode = fixedCode;
        updatedCount++;
        console.log(`   ✅ ${codeNode.name} aktualisiert`);
      } else {
        console.log(`   ⚠️  ${strand.name}: Code Node nicht gefunden`);
      }
    }
    
    console.log(`\n   📊 ${updatedCount} Code Node(s) aktualisiert\n`);
    
    // 3. Deploy zu n8n
    console.log('💾 Speichere Workflow...\n');
    
    const cleanSettings = { 
      executionOrder: workflow.settings?.executionOrder || 'v1' 
    };
    
    const updatePayload = {
      name: workflow.name,
      nodes: nodes,
      connections: workflow.connections,
      settings: cleanSettings
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    console.log('   ✅ Workflow aktualisiert\n');
    
    // 4. REPORT
    console.log('📊 REPORT\n');
    console.log('✅ CODE NODES KORRIGIERT');
    console.log(`   ✅ ${updatedCount} Code Node(s) aktualisiert`);
    console.log('\n   💡 Code verwendet jetzt intelligente Fallback-Regeln:');
    console.log('      - 429 → RETRY (5s delay)');
    console.log('      - 400 → REPAIR (repariert Daten)');
    console.log('      - 500+ → SKIP (tomorrow retry)');
    console.log('      - 404/Unknown → ROUTE (merchant_quality)');
    console.log('\n   💡 NÄCHSTER SCHRITT: Connections bauen!\n');
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
  fixGeminiCodeNodes();
}

module.exports = { fixGeminiCodeNodes, getFixedCode };
