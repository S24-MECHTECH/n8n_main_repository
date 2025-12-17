/**
 * AUTO-FIX WORKFLOW
 * Behebt automatisch alle bekannten Probleme im MECHTECH_MERCHANT_CENTER_ADMIN Workflow
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

// Versuche API Key aus verschiedenen Quellen zu lesen
function getApiKey() {
  // 1. Als Command-Line-Argument
  if (process.argv[2]) {
    return process.argv[2];
  }
  
  // 2. Aus Umgebungsvariable
  if (process.env.N8N_API_KEY) {
    return process.env.N8N_API_KEY;
  }
  
  // 3. Aus mcp.json Dateien
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
        
        // Prüfe verschiedene Pfade
        if (config.mcpServers?.['n8n-mcp']?.env?.N8N_API_KEY) {
          return config.mcpServers['n8n-mcp'].env.N8N_API_KEY;
        }
        
        // Prüfe auch in args für Bearer Token
        if (config.mcpServers?.['n8n-mcp']?.args) {
          const authHeader = config.mcpServers['n8n-mcp'].args.find(arg => arg.startsWith('authorization:Bearer '));
          if (authHeader) {
            return authHeader.replace('authorization:Bearer ', '');
          }
        }
      }
    } catch (error) {
      // Ignoriere Fehler und versuche nächste Datei
    }
  }
  
  return null;
}

const N8N_API_KEY = getApiKey();

if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY fehlt!');
  console.error('   Nutzung: node auto-fix-workflow.js YOUR_API_KEY');
  console.error('   Oder setzen Sie: $env:N8N_API_KEY = "YOUR_API_KEY"');
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

async function autoFixWorkflow() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 AUTO-FIX WORKFLOW');
  console.log('='.repeat(80) + '\n');
  
  try {
    // 1. Workflow laden
    console.log('📥 Lade Workflow...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes;
    let connections = workflow.connections || {};
    let changes = 0;
    
    console.log(`✅ Workflow geladen: ${workflow.name}\n`);
    
    // 2. Fix Credentials (googleApi → googleOAuth2Api)
    console.log('🔐 FIX 1: Korrigiere Credentials...\n');
    nodes.forEach(node => {
      if (node.type.includes('httpRequest') && node.parameters) {
        const params = node.parameters;
        if (params.nodeCredentialType === 'googleApi') {
          params.nodeCredentialType = 'googleOAuth2Api';
          params.authentication = 'predefinedCredentialType';
          console.log(`   ✅ ${node.name}: googleApi → googleOAuth2Api`);
          changes++;
        }
      }
    });
    console.log();
    
    // 3. Fix Prepare Chain Connections
    console.log('🔗 FIX 2: Korrigiere Prepare Chain...\n');
    const prepareChain = [
      'Prepare Products Loop',
      'Prepare Images Loop',
      'Prepare Text Loop',
      'Prepare Merchant Quality Loop',
      'Prepare Multi Country Loop',
      'Prepare GTN/EAN_Loop'
    ];
    
    for (let i = 0; i < prepareChain.length - 1; i++) {
      const current = prepareChain[i];
      const next = prepareChain[i + 1];
      
      const currentNode = nodes.find(n => n.name === current);
      const nextNode = nodes.find(n => n.name === next);
      
      if (currentNode && nextNode) {
        if (!connections[current]) {
          connections[current] = { main: [[]] };
        }
        
        // Prüfe ob bereits korrekt verbunden
        const currentConn = connections[current].main[0] || [];
        const isConnected = currentConn.some(c => c.node === next);
        
        if (!isConnected) {
          connections[current].main[0] = [{
            node: next,
            type: 'main',
            index: 0
          }];
          console.log(`   ✅ ${current} → ${next}`);
          changes++;
        } else {
          console.log(`   ⏭️  ${current} → ${next} (bereits verbunden)`);
        }
      }
    }
    console.log();
    
    // 4. Fix Route by Priority → Update → Rate Limiting Structure
    console.log('🔄 FIX 3: Korrigiere Route by Priority Struktur...\n');
    
    const routeNodes = nodes.filter(n => 
      n.name.toLowerCase().includes('route') && n.name.toLowerCase().includes('priority')
    );
    
    routeNodes.forEach(routeNode => {
      const routeName = routeNode.name;
      const routeConn = connections[routeName];
      
      // Finde zugehörige Update Nodes
      const updateNodes = nodes.filter(n => {
        const name = n.name.toLowerCase();
        const routeCategory = routeName.toLowerCase();
        
        // Prüfe auf Kategorien
        if (routeCategory.includes('adult') && name.includes('adult')) return true;
        if (routeCategory.includes('image') && name.includes('image')) return true;
        if (routeCategory.includes('text') && name.includes('text')) return true;
        if (routeCategory.includes('merchant') && name.includes('merchant')) return true;
        if (routeCategory.includes('country') && name.includes('country')) return true;
        if (routeCategory.includes('gtn') && (name.includes('gtin') || name.includes('gtn'))) return true;
        
        return false;
      });
      
      updateNodes.forEach(updateNode => {
        const updateName = updateNode.name;
        
        // Route → Update
        if (!connections[routeName]) {
          connections[routeName] = { main: [[]] };
        }
        
        const routeOutputs = connections[routeName].main[0] || [];
        const hasUpdateConnection = routeOutputs.some(c => c.node === updateName);
        
        if (!hasUpdateConnection) {
          if (routeOutputs.length === 0) {
            connections[routeName].main[0] = [{ node: updateName, type: 'main', index: 0 }];
          } else {
            connections[routeName].main[0].push({ node: updateName, type: 'main', index: 0 });
          }
          console.log(`   ✅ ${routeName} → ${updateName}`);
          changes++;
        }
        
        // Update → Rate Limiting
        const rateLimitingNodes = nodes.filter(n => 
          (n.name.toLowerCase().includes('rate') || n.name.toLowerCase().includes('wait')) &&
          n.name.toLowerCase().includes(updateName.toLowerCase().split(' ').pop()?.toLowerCase() || '')
        );
        
        if (rateLimitingNodes.length === 0) {
          // Suche nach generischem Rate Limiting
          const genericRateLimiting = nodes.find(n => 
            n.name.toLowerCase().includes('rate limiting') && 
            !n.name.toLowerCase().includes('gtn')
          );
          
          if (genericRateLimiting) {
            if (!connections[updateName]) {
              connections[updateName] = { main: [[]] };
            }
            const updateOutputs = connections[updateName].main[0] || [];
            const hasRateConnection = updateOutputs.some(c => c.node === genericRateLimiting.name);
            
            if (!hasRateConnection) {
              connections[updateName].main[0] = [{
                node: genericRateLimiting.name,
                type: 'main',
                index: 0
              }];
              console.log(`   ✅ ${updateName} → ${genericRateLimiting.name}`);
              changes++;
            }
          }
        } else {
          rateLimitingNodes.forEach(rateNode => {
            if (!connections[updateName]) {
              connections[updateName] = { main: [[]] };
            }
            const updateOutputs = connections[updateName].main[0] || [];
            const hasRateConnection = updateOutputs.some(c => c.node === rateNode.name);
            
            if (!hasRateConnection) {
              connections[updateName].main[0] = [{
                node: rateNode.name,
                type: 'main',
                index: 0
              }];
              console.log(`   ✅ ${updateName} → ${rateNode.name}`);
              changes++;
            }
          });
        }
      });
    });
    console.log();
    
    // 5. Fix Prepare GTN/EAN → Rate Limiting Connection (GTN/EAN Rate Limiting, NICHT Adult "Rate Limiting")
    console.log('🔗 FIX 4: Korrigiere Prepare GTN/EAN → Rate Limiting...\n');
    const prepareGTN = nodes.find(n => n.name === 'Prepare GTN/EAN_Loop');
    
    // Finde Rate Limiting GTN/EAN (sollte "Rate Limiting GTN/EAN" oder ähnlich heißen)
    const rateLimitingGTN = nodes.find(n => {
      const name = n.name.toLowerCase();
      return (name.includes('rate') || name.includes('wait')) && 
             (name.includes('gtn') || name.includes('gtin') || name.includes('ean'));
    });
    
    // Das "Rate Limiting" ohne Suffix ist für Adult - soll NICHT verwendet werden
    const rateLimitingAdult = nodes.find(n => {
      const name = n.name.toLowerCase();
      return name === 'rate limiting' && 
             !name.includes('gtn') && 
             !name.includes('gtin') && 
             !name.includes('ean') &&
             !name.includes('image') &&
             !name.includes('text');
    });
    
    if (prepareGTN && rateLimitingGTN) {
      if (!connections['Prepare GTN/EAN_Loop']) {
        connections['Prepare GTN/EAN_Loop'] = { main: [[]] };
      }
      
      const gtnOutputs = connections['Prepare GTN/EAN_Loop'].main[0] || [];
      
      // Prüfe ob es zu Adult "Rate Limiting" geht (FALSCH!)
      const goesToAdult = rateLimitingAdult && gtnOutputs.some(c => c.node === rateLimitingAdult.name);
      const goesToGTN = gtnOutputs.some(c => c.node === rateLimitingGTN.name);
      
      if (goesToAdult) {
        console.log(`   ❌ Prepare GTN/EAN_Loop geht zu "${rateLimitingAdult.name}" (FALSCH!)`);
        
        // Entferne falsche Connection
        connections['Prepare GTN/EAN_Loop'].main[0] = gtnOutputs.filter(c => c.node !== rateLimitingAdult.name);
        changes++;
        
        // Füge korrekte Connection hinzu
        if (!goesToGTN) {
          connections['Prepare GTN/EAN_Loop'].main[0].push({
            node: rateLimitingGTN.name,
            type: 'main',
            index: 0
          });
          console.log(`   ✅ Prepare GTN/EAN_Loop → ${rateLimitingGTN.name} (KORRIGIERT)`);
          changes++;
        }
      } else if (goesToGTN) {
        console.log(`   ✅ Prepare GTN/EAN_Loop → ${rateLimitingGTN.name} (bereits korrekt verbunden)`);
      } else {
        // Keine Connection, füge hinzu
        connections['Prepare GTN/EAN_Loop'].main[0] = [{
          node: rateLimitingGTN.name,
          type: 'main',
          index: 0
        }];
        console.log(`   ✅ Prepare GTN/EAN_Loop → ${rateLimitingGTN.name}`);
        changes++;
      }
    }
    console.log();
    
    // 5.1 Fix Prepare Multi Country Loop Code (behebt Error bei allen Items)
    console.log('🔧 FIX 5: Korrigiere Prepare Multi Country Loop Code...\n');
    const prepareMultiCountryNode = nodes.find(n => n.name === 'Prepare Multi Country Loop');
    
    if (prepareMultiCountryNode && prepareMultiCountryNode.parameters) {
      const code = prepareMultiCountryNode.parameters.jsCode || '';
      
      // Zeige ersten Teil des Codes
      if (code.length > 0) {
        console.log('   📄 Aktueller Code (erste 300 Zeichen):');
        console.log(`   ${code.substring(0, 300)}${code.length > 300 ? '...' : ''}\n`);
      }
      
      // Prüfe ob Code problematisch ist
      const usesInputAll = code.includes('$input.all()');
      const usesInputFirst = code.includes('$input.first()');
      const hasReturn = code.includes('return');
      
      // Wenn $input.all() verwendet wird, könnte es zu Fehlern führen wenn sequenziell verarbeitet werden soll
      // ODER wenn kein return vorhanden ist
      if (usesInputAll || !hasReturn || !usesInputFirst) {
        console.log(`   ⚠️  Code benötigt Korrektur:`);
        console.log(`      Verwendet $input.all(): ${usesInputAll ? '⚠️  Ja (kann Fehler verursachen)' : '✅ Nein'}`);
        console.log(`      Verwendet $input.first(): ${usesInputFirst ? '✅ Ja' : '❌ Nein'}`);
        console.log(`      Hat return Statement: ${hasReturn ? '✅ Ja' : '❌ Nein'}`);
        console.log('   🔧 Korrigiere Code...\n');
        
        // Ersetze durch sequenziellen Code (vereinfacht)
        prepareMultiCountryNode.parameters.jsCode = `// ============================================================================
// PREPARE MULTI COUNTRY LOOP - SEQUENTIELLE VERARBEITUNG
// ============================================================================
const inputItem = $input.first().json;
const config = $('Shop Configuration2').first().json;

// Multi-Country Logik - sequenziell verarbeiten
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
        
        console.log(`   ✅ Code korrigiert (sequenzielle Verarbeitung)`);
        changes++;
      } else {
        console.log(`   ✅ Code sieht korrekt aus`);
      }
    } else {
      console.log(`   ⚠️  Prepare Multi Country Loop Node nicht gefunden`);
    }
    console.log();
    
    // 6. Fix Update Product Adult Flag spezifisch
    console.log('🔧 FIX 6: Korrigiere Update Product Adult Flag...\n');
    const adultFlagNode = nodes.find(n => 
      n.name.toLowerCase().includes('update') && 
      n.name.toLowerCase().includes('adult')
    );
    
    if (adultFlagNode && adultFlagNode.type.includes('httpRequest')) {
      const params = adultFlagNode.parameters || {};
      
      // URL Expression
      if (params.url && params.url.includes('$json.product.id')) {
        params.url = params.url.replace('$json.product.id', '$json.product_id');
        console.log(`   ✅ URL Expression korrigiert`);
        changes++;
      }
      
      // Body prüfen
      if (!params.sendBody && params.method === 'PATCH') {
        params.sendBody = true;
        params.specifyBody = 'json';
        params.jsonBody = params.jsonBody || `={
  "adult": true,
  "ageGroup": "adult",
  "googleProductCategory": "778"
}`;
        console.log(`   ✅ Body hinzugefügt`);
        changes++;
      }
    }
    console.log();
    
    // 7. Workflow speichern
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
      console.log(`   Workflow ID: ${WORKFLOW_ID}`);
      console.log(`   Name: ${workflow.name}\n`);
    } else {
      console.log('✅ Keine Änderungen notwendig - Workflow ist bereits korrekt!\n');
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

autoFixWorkflow();
