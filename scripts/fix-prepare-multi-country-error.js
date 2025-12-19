/**
 * FIX PREPARE MULTI COUNTRY LOOP ERROR
 * Behebt das Problem dass alle Items als Error angezeigt werden
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

// API Key finden
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

async function fixPrepareMultiCountryError() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX PREPARE MULTI COUNTRY LOOP ERROR');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes;
    let connections = workflow.connections || {};
    let changes = 0;
    
    console.log(`✅ Workflow geladen: ${workflow.name}\n`);
    
    // 1. Fix Prepare Multi Country Loop Code
    console.log('🔧 FIX 1: Korrigiere Prepare Multi Country Loop Code...\n');
    
    const prepareMultiCountryNode = nodes.find(n => n.name === 'Prepare Multi Country Loop');
    
    if (prepareMultiCountryNode && prepareMultiCountryNode.parameters) {
      const currentCode = prepareMultiCountryNode.parameters.jsCode || '';
      
      console.log('   📄 Aktueller Code:');
      if (currentCode.length > 0) {
        console.log(`   ${currentCode.substring(0, 400)}${currentCode.length > 400 ? '...' : ''}\n`);
      } else {
        console.log('   (Leer)\n');
      }
      
      // Ersetze durch korrekten sequenziellen Code
      const correctCode = `// ============================================================================
// PREPARE MULTI COUNTRY LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// Multi-Country Logik - sequenziell verarbeiten (ein Item)
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
      
      if (currentCode !== correctCode) {
        prepareMultiCountryNode.parameters.jsCode = correctCode;
        console.log('   ✅ Code korrigiert (sequenzielle Verarbeitung mit $input.first())');
        changes++;
      } else {
        console.log('   ⏭️  Code ist bereits korrekt');
      }
    } else {
      console.log('   ⚠️  Prepare Multi Country Loop Node nicht gefunden');
    }
    
    console.log();
    
    // 2. Fix Prepare GTN/EAN → Rate Limiting (NICHT "Rate Limiting" Adult!)
    console.log('🔗 FIX 2: Korrigiere Prepare GTN/EAN → Rate Limiting (GTN/EAN, NICHT Adult!)...\n');
    
    const prepareGTN = nodes.find(n => n.name === 'Prepare GTN/EAN_Loop');
    
    // Finde "Rate Limiting" (ohne Suffix - das ist für Adult)
    const rateLimitingAdult = nodes.find(n => {
      const name = n.name.toLowerCase().trim();
      return name === 'rate limiting';
    });
    
    // Finde Rate Limiting GTN/EAN (mit GTN/EAN im Namen)
    const rateLimitingGTN = nodes.find(n => {
      const name = n.name.toLowerCase();
      return (name.includes('rate') || name.includes('wait')) && 
             (name.includes('gtn') || name.includes('gtin') || name.includes('ean'));
    });
    
    console.log(`   Rate Limiting (Adult): ${rateLimitingAdult ? rateLimitingAdult.name : 'NICHT GEFUNDEN'}`);
    console.log(`   Rate Limiting GTN/EAN: ${rateLimitingGTN ? rateLimitingGTN.name : 'NICHT GEFUNDEN'}\n`);
    
    if (prepareGTN) {
      if (!connections['Prepare GTN/EAN_Loop']) {
        connections['Prepare GTN/EAN_Loop'] = { main: [[]] };
      }
      
      const gtnOutputs = connections['Prepare GTN/EAN_Loop'].main[0] || [];
      
      // Prüfe ob es zu Adult "Rate Limiting" geht (FALSCH!)
      const goesToAdult = rateLimitingAdult && gtnOutputs.some(c => c.node === rateLimitingAdult.name);
      const goesToGTN = rateLimitingGTN && gtnOutputs.some(c => c.node === rateLimitingGTN.name);
      
      if (goesToAdult) {
        console.log(`   ❌ FEHLER: Prepare GTN/EAN_Loop geht zu "${rateLimitingAdult.name}" (FALSCH - das ist für Adult!)`);
        
        // Entferne falsche Connection
        connections['Prepare GTN/EAN_Loop'].main[0] = gtnOutputs.filter(c => c.node !== rateLimitingAdult.name);
        console.log(`   ✅ Falsche Connection zu "${rateLimitingAdult.name}" entfernt`);
        changes++;
        
        // Füge korrekte Connection hinzu (falls Rate Limiting GTN/EAN existiert)
        if (rateLimitingGTN && !goesToGTN) {
          connections['Prepare GTN/EAN_Loop'].main[0].push({
            node: rateLimitingGTN.name,
            type: 'main',
            index: 0
          });
          console.log(`   ✅ Korrekte Connection zu "${rateLimitingGTN.name}" hinzugefügt`);
          changes++;
        } else if (!rateLimitingGTN) {
          console.log(`   ⚠️  Rate Limiting GTN/EAN nicht gefunden - Connection bleibt entfernt`);
        }
      } else if (goesToGTN) {
        console.log(`   ✅ Prepare GTN/EAN_Loop → ${rateLimitingGTN.name} (korrekt verbunden)`);
      } else {
        // Keine Connection, füge hinzu (falls Rate Limiting GTN/EAN existiert)
        if (rateLimitingGTN) {
          connections['Prepare GTN/EAN_Loop'].main[0] = [{
            node: rateLimitingGTN.name,
            type: 'main',
            index: 0
          }];
          console.log(`   ✅ Prepare GTN/EAN_Loop → ${rateLimitingGTN.name} (hinzugefügt)`);
          changes++;
        } else {
          console.log(`   ⚠️  Rate Limiting GTN/EAN nicht gefunden - keine Connection möglich`);
        }
      }
    } else {
      console.log('   ⚠️  Prepare GTN/EAN_Loop Node nicht gefunden');
    }
    
    console.log();
    
    // Speichere Workflow
    if (changes > 0) {
      console.log(`💾 Speichere ${changes} Änderungen...\n`);
      
      const cleanSettings = workflow.settings ? 
        { executionOrder: workflow.settings.executionOrder || 'v1' } : 
        { executionOrder: 'v1' };
      
      const updatePayload = {
        name: workflow.name,
        nodes: nodes,
        connections: connections,
        settings: cleanSettings
      };
      
      await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
      
      console.log('✅ Workflow erfolgreich aktualisiert!\n');
      console.log(`📊 ZUSAMMENFASSUNG:`);
      console.log(`   Änderungen: ${changes}`);
      console.log(`   Prepare Multi Country Loop: Code korrigiert (sequenziell)`);
      console.log(`   Prepare GTN/EAN_Loop: Verbindung korrigiert (nicht mehr zu Adult Rate Limiting)\n`);
    } else {
      console.log('✅ Keine Änderungen notwendig - alles ist bereits korrekt!\n');
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

fixPrepareMultiCountryError();

