/**
 * FIX PREPARE MULTI COUNTRY - FORCE FIX
 * Ersetzt den Code von Prepare Multi Country Loop durch eine funktionierende Version
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

function getApiKey() {
  if (process.argv[2]) return process.argv[2];
  if (process.env.N8N_API_KEY) return process.env.N8N_API_KEY;
  
  const configPaths = [
    path.join(__dirname, '..', '..', '.cursor', 'mcp.json'),
    path.join(__dirname, '..', '..', '.cursor', 'FUNKTIONIERENDE_CONFIG.json'),
    path.join(__dirname, '..', '..', '.cursor', 'mcp-config.json'),
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
        const authHeader = config.mcpServers?.['n8n-mcp']?.args?.find(arg => arg.startsWith('authorization:Bearer '));
        if (authHeader) return authHeader.replace('authorization:Bearer ', '');
      }
    } catch (error) {}
  }
  return null;
}

const N8N_API_KEY = getApiKey();
if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY fehlt!');
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

async function fixPrepareMultiCountryForce() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX PREPARE MULTI COUNTRY - FORCE FIX');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes;
    let changes = 0;
    
    console.log(`✅ Workflow geladen: ${workflow.name}\n`);
    
    const prepareMultiCountry = nodes.find(n => n.name === 'Prepare Multi Country Loop');
    
    if (!prepareMultiCountry) {
      console.log('❌ Prepare Multi Country Loop Node nicht gefunden!\n');
      return;
    }
    
    console.log(`✅ Node gefunden: ${prepareMultiCountry.name}\n`);
    console.log('🔧 Ersetze Code durch funktionierende sequenzielle Version...\n');
    
    // Ersetze Code durch einfache funktionierende Version
    prepareMultiCountry.parameters = prepareMultiCountry.parameters || {};
    prepareMultiCountry.parameters.jsCode = `// ============================================================================
// PREPARE MULTI COUNTRY LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// Multi-Country Logik - sequenziell verarbeiten (nur ein Item)
return {
  json: {
    ...inputItem,
    action: 'multi_country',
    priority: 'multi_country',
    multi_country_processed: true,
    countries: inputItem.countries || inputItem.countries_from_gemini || [],
    shipping: inputItem.shipping || []
  }
};`;
    
    console.log('   ✅ Code ersetzt\n');
    changes++;
    
    // Speichere Workflow
    if (changes > 0) {
      console.log(`💾 Speichere Änderungen...\n`);
      
      const cleanSettings = workflow.settings ? 
        { executionOrder: workflow.settings.executionOrder || 'v1' } : 
        { executionOrder: 'v1' };
      
      const updatePayload = {
        name: workflow.name,
        nodes: nodes,
        connections: workflow.connections || {},
        settings: cleanSettings
      };
      
      await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
      
      console.log('✅ Workflow erfolgreich aktualisiert!\n');
      console.log(`📊 Änderungen: ${changes}`);
      console.log(`   Prepare Multi Country Loop: Code durch einfache Version ersetzt\n`);
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

fixPrepareMultiCountryForce();
