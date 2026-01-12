/**
 * FIX PREPARE MULTI COUNTRY ERRORS & RATE LIMITING CONNECTION
 * - Behebt Errors in Prepare Multi Country Loop
 * - Korrigiert GTN/EAN → Rate Limiting GTN/EAN Connection (nicht Adult Rate Limiting)
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

async function fixPrepareMultiCountryAndRateLimiting() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX PREPARE MULTI COUNTRY & RATE LIMITING');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes;
    let connections = workflow.connections || {};
    let changes = 0;
    
    console.log(`✅ Workflow geladen: ${workflow.name}\n`);
    
    // 1. Analysiere Prepare Multi Country Loop
    console.log('🔍 FIX 1: Analysiere Prepare Multi Country Loop...\n');
    
    const prepareMultiCountry = nodes.find(n => n.name === 'Prepare Multi Country Loop');
    
    if (prepareMultiCountry) {
      console.log(`   ✅ Node gefunden: ${prepareMultiCountry.name}`);
      console.log(`   Type: ${prepareMultiCountry.type}\n`);
      
      // Prüfe Code
      const code = prepareMultiCountry.parameters?.jsCode || '';
      
      if (code) {
        console.log('   📄 Aktueller Code (erste 500 Zeichen):');
        console.log(`   ${code.substring(0, 500)}${code.length > 500 ? '...' : ''}\n`);
        
        // Prüfe auf häufige Fehler
        const hasReturn = code.includes('return');
        const usesInputFirst = code.includes('$input.first()');
        const usesInputAll = code.includes('$input.all()');
        const hasError = code.includes('getWorkflowStaticData') || code.includes('undefined');
        
        console.log('   🔍 Code-Analyse:');
        console.log(`      Hat return Statement: ${hasReturn ? '✅' : '❌'}`);
        console.log(`      Verwendet $input.first(): ${usesInputFirst ? '✅' : '❌'}`);
        console.log(`      Verwendet $input.all(): ${usesInputAll ? '⚠️  (könnte problematisch sein)' : '✅'}`);
        console.log(`      Potenzielle Fehler: ${hasError ? '⚠️  Ja' : '✅ Nein'}\n`);
        
        // Wenn Code fehlt oder problematisch ist, füge korrekten Code hinzu
        if (!hasReturn || !usesInputFirst || hasError) {
          console.log('   🔧 Korrigiere Code...\n');
          
          // Standard-Code für Prepare Multi Country Loop (sequenziell)
          prepareMultiCountry.parameters.jsCode = `// ============================================================================
// PREPARE MULTI COUNTRY LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// Multi-Country Logik hier
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
          
          console.log('   ✅ Code korrigiert (sequenzielle Verarbeitung)\n');
          changes++;
        } else {
          console.log('   ✅ Code sieht korrekt aus\n');
        }
      } else {
        console.log('   ⚠️  Kein Code gefunden, füge Standard-Code hinzu...\n');
        
        prepareMultiCountry.parameters = prepareMultiCountry.parameters || {};
        prepareMultiCountry.parameters.jsCode = `// ============================================================================
// PREPARE MULTI COUNTRY LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

return {
  json: {
    ...inputItem,
    action: 'multi_country',
    priority: 'multi_country',
    multi_country_processed: true,
    countries: inputItem.countries || [],
    shipping: inputItem.shipping || []
  }
};`;
        
        console.log('   ✅ Code hinzugefügt\n');
        changes++;
      }
    } else {
      console.log('   ⚠️  Prepare Multi Country Loop Node nicht gefunden!\n');
    }
    
    // 2. Fix Rate Limiting Connection (GTN/EAN → Rate Limiting GTN/EAN, NICHT "Rate Limiting" Adult)
    console.log('🔗 FIX 2: Korrigiere Rate Limiting Connection...\n');
    
    const prepareGTN = nodes.find(n => n.name === 'Prepare GTN/EAN_Loop');
    
    // Finde ALLE Rate Limiting Nodes
    const allRateLimitingNodes = nodes.filter(n => 
      (n.name.toLowerCase().includes('rate') || n.name.toLowerCase().includes('wait')) &&
      !n.name.toLowerCase().includes('product') &&
      !n.name.toLowerCase().includes('image') &&
      !n.name.toLowerCase().includes('text')
    );
    
    console.log('   📋 Gefundene Rate Limiting Nodes:');
    allRateLimitingNodes.forEach(node => {
      console.log(`      - ${node.name}`);
    });
    console.log();
    
    // Finde das RICHTIGE Rate Limiting für GTN/EAN
    // Sollte "Rate Limiting GTN/EAN" oder ähnlich heißen, NICHT nur "Rate Limiting"
    const rateLimitingGTN = nodes.find(n => {
      const name = n.name.toLowerCase();
      return (name.includes('rate') || name.includes('wait')) && 
             (name.includes('gtn') || name.includes('gtin') || name.includes('ean'));
    });
    
    // Das "Rate Limiting" (ohne Suffix) ist für Adult - soll NICHT verwendet werden
    const rateLimitingAdult = nodes.find(n => {
      const name = n.name.toLowerCase();
      return name === 'rate limiting' || 
             (name.includes('rate limiting') && 
              !name.includes('gtn') && 
              !name.includes('gtin') && 
              !name.includes('ean') &&
              !name.includes('image') &&
              !name.includes('text'));
    });
    
    console.log(`   🔍 Rate Limiting GTN/EAN gefunden: ${rateLimitingGTN ? rateLimitingGTN.name : 'NICHT GEFUNDEN'}`);
    console.log(`   🔍 Rate Limiting Adult gefunden: ${rateLimitingAdult ? rateLimitingAdult.name : 'NICHT GEFUNDEN'}\n`);
    
    if (prepareGTN) {
      if (!connections['Prepare GTN/EAN_Loop']) {
        connections['Prepare GTN/EAN_Loop'] = { main: [[]] };
      }
      
      const prepGTNConn = connections['Prepare GTN/EAN_Loop'].main[0] || [];
      
      // Prüfe ob es zu "Rate Limiting" (Adult) geht - das ist FALSCH!
      const goesToAdultRateLimiting = rateLimitingAdult && prepGTNConn.some(c => 
        c.node === rateLimitingAdult.name
      );
      
      // Prüfe ob es zu Rate Limiting GTN/EAN geht - das ist RICHTIG!
      const goesToGTNRateLimiting = rateLimitingGTN && prepGTNConn.some(c => 
        c.node === rateLimitingGTN.name
      );
      
      if (goesToAdultRateLimiting) {
        console.log(`   ❌ PROBLEM: Prepare GTN/EAN_Loop geht zu "${rateLimitingAdult.name}" (FALSCH!)`);
        console.log(`   ✅ KORREKTUR: Sollte zu "${rateLimitingGTN?.name || 'Rate Limiting GTN/EAN'}" gehen\n`);
        
        // Entferne falsche Connection zu Adult Rate Limiting
        connections['Prepare GTN/EAN_Loop'].main[0] = prepGTNConn.filter(c => c.node !== rateLimitingAdult.name);
        changes++;
        
        // Füge korrekte Connection hinzu
        if (rateLimitingGTN) {
          const hasCorrectConnection = connections['Prepare GTN/EAN_Loop'].main[0].some(c => 
            c.node === rateLimitingGTN.name
          );
          
          if (!hasCorrectConnection) {
            connections['Prepare GTN/EAN_Loop'].main[0].push({
              node: rateLimitingGTN.name,
              type: 'main',
              index: 0
            });
            
            console.log(`   ✅ Prepare GTN/EAN_Loop → ${rateLimitingGTN.name} (HINZUGEFÜGT)`);
            changes++;
          }
        }
      } else if (goesToGTNRateLimiting) {
        console.log(`   ✅ Prepare GTN/EAN_Loop → ${rateLimitingGTN.name} (bereits korrekt verbunden)`);
      } else if (rateLimitingGTN) {
        // Keine Connection vorhanden, füge hinzu
        console.log(`   ⚠️  Prepare GTN/EAN_Loop hat keine Connection, füge hinzu...`);
        
        connections['Prepare GTN/EAN_Loop'].main[0] = [{
          node: rateLimitingGTN.name,
          type: 'main',
          index: 0
        }];
        
        console.log(`   ✅ Prepare GTN/EAN_Loop → ${rateLimitingGTN.name}`);
        changes++;
      } else {
        console.log(`   ⚠️  Rate Limiting GTN/EAN Node nicht gefunden!`);
        console.log(`   💡 Mögliche Namen: "Rate Limiting GTN/EAN", "Rate Limiting GTIN", etc.\n`);
      }
    } else {
      console.log('   ⚠️  Prepare GTN/EAN_Loop Node nicht gefunden!\n');
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
      if (prepareMultiCountry) {
        console.log(`   Prepare Multi Country Loop: Code korrigiert`);
      }
      if (prepareGTN) {
        console.log(`   Prepare GTN/EAN_Loop → Rate Limiting: Korrigiert`);
      }
      console.log();
    } else {
      console.log('✅ Keine Änderungen notwendig - Alles ist bereits korrekt!\n');
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

fixPrepareMultiCountryAndRateLimiting();
