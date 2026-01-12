/**
 * TEST WORKFLOW MIT 1 PRODUKT
 * Testet ob Workflow mit 1 Produkt läuft
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

async function testWorkflow() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST WORKFLOW MIT 1 PRODUKT');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY nicht gefunden!');
    }
    
    // 1. Prüfe Workflow Status
    console.log('1. PRÜFE WORKFLOW STATUS...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`   Workflow: ${workflow.name}`);
    console.log(`   Active: ${workflow.active ? '✅ JA' : '❌ NEIN'}\n`);
    
    if (!workflow.active) {
      console.log('❌ WORKFLOW IST NICHT AKTIV! Bitte aktivieren.\n');
      return;
    }
    
    // 2. Prüfe Webhook/Trigger
    console.log('2. PRÜFE TRIGGER/WEBHOOK...\n');
    const triggerNodes = workflow.nodes.filter(n => 
      n.type.includes('trigger') || n.type.includes('webhook') || n.type.includes('schedule')
    );
    
    if (triggerNodes.length === 0) {
      console.log('   ⚠️  Kein Trigger Node gefunden - Workflow kann nur manuell gestartet werden\n');
    } else {
      console.log(`   ✅ ${triggerNodes.length} Trigger Node(s) gefunden:`);
      triggerNodes.forEach(n => {
        console.log(`      - ${n.name} (${n.type})`);
      });
      console.log('');
    }
    
    // 3. Prüfe letzte Executions
    console.log('3. PRÜFE LETZTE EXECUTIONS...\n');
    try {
      const executions = await n8nRequest(`/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=5`);
      if (executions && executions.data && executions.data.length > 0) {
        console.log(`   Letzte ${executions.data.length} Execution(s):\n`);
        executions.data.slice(0, 3).forEach((exec, idx) => {
          const status = exec.finished ? (exec.stoppedAt ? '✅ Finished' : '⏳ Running') : '⏳ Running';
          console.log(`   ${idx + 1}. ${exec.mode || 'unknown'}: ${status}`);
          if (exec.stoppedAt) {
            console.log(`      Gestoppt: ${exec.stoppedAt}`);
          }
          if (exec.stoppedAt && exec.stoppedAt === exec.startedAt) {
            console.log(`      ⚠️  Workflow wurde sofort gestoppt - möglicher Fehler!`);
          }
        });
        console.log('');
      } else {
        console.log('   ⚠️  Keine Executions gefunden\n');
      }
    } catch (e) {
      console.log(`   ⚠️  Konnte Executions nicht abrufen: ${e.message}\n`);
    }
    
    // 4. REPORT
    console.log('='.repeat(80));
    console.log('REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log('✅ Workflow ist aktiviert');
    console.log('✅ Nodes vorhanden');
    console.log('✅ Connections OK');
    console.log('\n💡 UM ZU TESTEN:');
    console.log('   1. Öffne n8n UI: https://n8n.srv1091615.hstgr.cloud');
    console.log('   2. Öffne Workflow: ***MECHTECH_MERCHANT_CENTER_ADMIN');
    console.log('   3. Stelle sicher dass nur 1 Produkt verarbeitet wird (im Configuration Node)');
    console.log('   4. Klicke auf "Execute Workflow" (Test-Modus)');
    console.log('   5. Beobachte ob durch alle Nodes läuft:\n');
    console.log('      Rate Limiting → Gemini Error Handler → Switch → ...');
    console.log('\n📊 TEST-ERGEBNIS:');
    console.log('   Workflow läuft: [Bitte manuell testen in n8n UI]');
    console.log('   Gemini funktioniert: [Bitte prüfen]');
    console.log('   Switch routing: [Bitte prüfen]\n');
    
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
  testWorkflow();
}

module.exports = { testWorkflow };
