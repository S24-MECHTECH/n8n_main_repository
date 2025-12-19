/**
 * ✅ VERIFY NODE CODES IN N8N
 * Prüft ob die Node-Codes in n8n die aktuellen Codes sind
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

// Erwartete Codes (aktuell)
const expectedCodes = {
  'AI Error Handler': `// AI Error Handler
const error = $input.first().json;
if (error.code === 429) return { json: { action: 'RETRY', delay: 2000 } };
if (error.code === 400) return { json: { action: 'REROUTE', to: 'fallback' } };
if (error.code === 500) return { json: { action: 'SKIP' } };
return { json: { action: 'ALERT' } };`,
  
  'Retry Queue': `// Retry Queue
const product = $input.first().json;
const attempt = product.attempt || 1;
const delay = Math.pow(2, attempt) * 1000;
return { json: { ...product, attempt: attempt + 1, delay } };`,
  
  'Expression Repair': `// Expression Repair
const product = $input.first().json;
if (!product.sku) product.sku = 'UNKNOWN';
if (!product.action) product.action = 'merchant_quality';
return { json: product };`
};

function normalizeCode(code) {
  return code.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

async function verifyNodeCodes() {
  console.log('\n' + '='.repeat(80));
  console.log('✅ VERIFY NODE CODES IN N8N');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      console.error('❌ N8N_API_KEY fehlt!');
      process.exit(1);
    }
    
    // 1. Workflow laden
    console.log('📥 Lade Workflow...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes || [];
    
    console.log(`✅ Workflow: ${workflow.name}`);
    console.log(`   Nodes: ${nodes.length}\n`);
    
    // 2. Prüfe Nodes
    console.log('🔍 Prüfe Node-Codes...\n');
    
    const results = {};
    
    for (const nodeName of Object.keys(expectedCodes)) {
      const node = nodes.find(n => n.name === nodeName);
      const expectedCode = expectedCodes[nodeName];
      
      if (!node) {
        results[nodeName] = { status: 'NOT_FOUND', message: 'Node nicht gefunden' };
        console.log(`   ❌ ${nodeName}: Node nicht gefunden`);
        continue;
      }
      
      const actualCode = node.parameters?.jsCode || '';
      const normalizedExpected = normalizeCode(expectedCode);
      const normalizedActual = normalizeCode(actualCode);
      
      if (normalizedActual === normalizedExpected) {
        results[nodeName] = { status: 'OK', message: 'Code ist aktuell' };
        console.log(`   ✅ ${nodeName}: Code ist aktuell`);
      } else {
        results[nodeName] = { 
          status: 'MISMATCH', 
          message: 'Code weicht ab',
          expected: expectedCode,
          actual: actualCode
        };
        console.log(`   ⚠️  ${nodeName}: Code weicht ab`);
        console.log(`      Erwartet: ${expectedCode.substring(0, 50)}...`);
        console.log(`      Aktuell:  ${actualCode.substring(0, 50)}...`);
      }
    }
    
    console.log('');
    
    // 3. REPORT
    console.log('📊 REPORT\n');
    
    const allOk = Object.values(results).every(r => r.status === 'OK');
    
    if (allOk) {
      console.log('✅ ALLE NODE-CODES SIND AKTUELL');
      console.log('   ✅ AI Error Handler: Code aktuell');
      console.log('   ✅ Retry Queue: Code aktuell');
      console.log('   ✅ Expression Repair: Code aktuell');
      console.log('\n   💡 Browser sollte die Codes anzeigen');
      console.log('   💡 Falls nicht: Browser refresh (F5)');
    } else {
      console.log('⚠️  EINIGE CODES WEICHEN AB');
      
      for (const [nodeName, result] of Object.entries(results)) {
        if (result.status === 'OK') {
          console.log(`   ✅ ${nodeName}: OK`);
        } else if (result.status === 'NOT_FOUND') {
          console.log(`   ❌ ${nodeName}: Node nicht gefunden`);
        } else {
          console.log(`   ⚠️  ${nodeName}: Code weicht ab`);
          console.log('\n   📋 MANUELLE ANLEITUNG:');
          console.log(`   1. Öffne n8n UI: ${N8N_URL}`);
          console.log(`   2. Öffne Workflow: ${workflow.name}`);
          console.log(`   3. Öffne Node: ${nodeName}`);
          console.log('   4. Copy-Paste diesen Code:');
          console.log('   ---');
          console.log(result.expected);
          console.log('   ---');
          console.log('   5. SAVE Node');
          console.log('   6. Workflow SAVE');
          console.log('   7. Browser REFRESH (F5)\n');
        }
      }
    }
    
    console.log('='.repeat(80) + '\n');
    
    return results;
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  verifyNodeCodes();
}

module.exports = { verifyNodeCodes };
