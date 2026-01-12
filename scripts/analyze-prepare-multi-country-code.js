/**
 * ANALYZE PREPARE MULTI COUNTRY CODE
 * Analysiert den Code des Prepare Multi Country Loop Nodes
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

async function analyzePrepareMultiCountryCode() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ANALYZE PREPARE MULTI COUNTRY CODE');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes;
    
    const prepareMultiCountry = nodes.find(n => n.name === 'Prepare Multi Country Loop');
    
    if (!prepareMultiCountry) {
      console.log('❌ Prepare Multi Country Loop Node nicht gefunden!\n');
      return;
    }
    
    console.log(`✅ Node gefunden: ${prepareMultiCountry.name}`);
    console.log(`   Type: ${prepareMultiCountry.type}\n`);
    
    const code = prepareMultiCountry.parameters?.jsCode || '';
    
    if (!code) {
      console.log('❌ Kein Code gefunden!\n');
      return;
    }
    
    console.log('📄 VOLLSTÄNDIGER CODE:');
    console.log('='.repeat(80));
    console.log(code);
    console.log('='.repeat(80) + '\n');
    
    // Analyse
    console.log('🔍 CODE-ANALYSE:\n');
    
    const issues = [];
    
    // Prüfe auf return Statement
    if (!code.includes('return')) {
      issues.push('❌ Kein return Statement gefunden');
    } else {
      console.log('   ✅ return Statement vorhanden');
    }
    
    // Prüfe auf $input.first()
    if (!code.includes('$input.first()')) {
      issues.push('⚠️  Verwendet kein $input.first() - könnte parallel verarbeiten');
    } else {
      console.log('   ✅ Verwendet $input.first() (sequenziell)');
    }
    
    // Prüfe auf $input.all()
    if (code.includes('$input.all()')) {
      issues.push('⚠️  Verwendet $input.all() - könnte zu Problemen führen wenn sequenziell verarbeitet werden soll');
    } else {
      console.log('   ✅ Verwendet kein $input.all()');
    }
    
    // Prüfe auf getWorkflowStaticData
    if (code.includes('getWorkflowStaticData') && !code.includes('$getWorkflowStaticData')) {
      issues.push('⚠️  Verwendet getWorkflowStaticData - könnte nicht definiert sein');
    }
    
    // Prüfe auf Syntax-Fehler (Grundlegende Prüfung)
    const hasUnclosedBraces = (code.match(/{/g) || []).length !== (code.match(/}/g) || []).length;
    const hasUnclosedParens = (code.match(/\(/g) || []).length !== (code.match(/\)/g) || []).length;
    
    if (hasUnclosedBraces) {
      issues.push('❌ Unausgeglichene geschweifte Klammern { }');
    }
    if (hasUnclosedParens) {
      issues.push('❌ Unausgeglichene runde Klammern ( )');
    }
    
    console.log();
    
    if (issues.length > 0) {
      console.log('⚠️  POTENZIELLE PROBLEME:\n');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log();
    } else {
      console.log('✅ Code sieht strukturell korrekt aus\n');
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

analyzePrepareMultiCountryCode();
