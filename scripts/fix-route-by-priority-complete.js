/**
 * 🎓 SENIOR ANALYSIS: Route by Priority Complete Fix
 * Behebt alle Route-by-Priority Strukturprobleme
 * 
 * Struktur:
 * Route by Priority (Category) → Update Node → Rate Limiting → (Weiter)
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

// Mapping: Route Category → Update Node Pattern → Rate Limiting Pattern
const routeCategoryMapping = {
  'adult': {
    updatePattern: /adult/i,
    rateLimitingPattern: /rate limiting$/i // "Rate Limiting" ohne Suffix
  },
  'image': {
    updatePattern: /image/i,
    rateLimitingPattern: /rate limiting image/i
  },
  'text': {
    updatePattern: /text/i,
    rateLimitingPattern: /rate limiting text/i
  },
  'merchant': {
    updatePattern: /merchant/i,
    rateLimitingPattern: /rate limiting merchant/i
  },
  'country': {
    updatePattern: /country|multi/i,
    rateLimitingPattern: /rate limiting country/i
  },
  'gtn': {
    updatePattern: /gtin|gtn|ean/i,
    rateLimitingPattern: /rate limiting gtn|rate limiting ean/i
  }
};

function detectCategory(routeNodeName, nodes) {
  const name = routeNodeName.toLowerCase();
  
  // Prüfe ob Route Node einen spezifischen Kategorie-Namen hat
  for (const [category, patterns] of Object.entries(routeCategoryMapping)) {
    if (name.includes(category)) {
      return category;
    }
  }
  
  // Falls keine spezifische Kategorie: Prüfe alle Outputs der Route Node
  // um die Kategorie aus den verbundenen Nodes zu ermitteln
  return null; // Wird später durch Analyse der Verbindungen bestimmt
}

async function fixRouteByPriorityComplete() {
  console.log('\n' + '='.repeat(80));
  console.log('🎓 SENIOR ANALYSIS: Route by Priority Complete Fix');
  console.log('='.repeat(80) + '\n');
  
  try {
    // 1. Workflow laden
    console.log('📥 Lade Workflow...\n');
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes;
    let connections = workflow.connections || {};
    let changes = 0;
    
    console.log(`✅ Workflow geladen: ${workflow.name}\n`);
    
    // 2. Finde alle Route by Priority Nodes
    console.log('🔍 Finde Route by Priority Nodes...\n');
    const routeNodes = nodes.filter(n => {
      const name = n.name.toLowerCase();
      return (name.includes('route') && name.includes('priority')) ||
             name.includes('route by priority');
    });
    
    console.log(`   Gefunden: ${routeNodes.length} Route by Priority Nodes\n`);
    routeNodes.forEach(node => console.log(`   - ${node.name}`));
    console.log();
    
    if (routeNodes.length === 0) {
      console.log('⚠️  Keine Route by Priority Nodes gefunden!\n');
      return;
    }
    
    // 3. Für jede Route Node: Korrigiere Struktur
    console.log('🔧 Korrigiere Route → Update → Rate Limiting Struktur...\n');
    
    // Finde alle Update Nodes und Rate Limiting Nodes
    const allUpdateNodes = nodes.filter(n => n.name.toLowerCase().includes('update'));
    const allRateLimitingNodes = nodes.filter(n => 
      (n.name.toLowerCase().includes('rate') || n.name.toLowerCase().includes('wait'))
    );
    
    console.log(`   Update Nodes gefunden: ${allUpdateNodes.length}`);
    allUpdateNodes.forEach(n => console.log(`      - ${n.name}`));
    console.log(`   Rate Limiting Nodes gefunden: ${allRateLimitingNodes.length}`);
    allRateLimitingNodes.forEach(n => console.log(`      - ${n.name}`));
    console.log();
    
    routeNodes.forEach(routeNode => {
      const routeName = routeNode.name;
      const routeConn = connections[routeName];
      const routeOutputs = routeConn && routeConn.main && routeConn.main[0] ? 
        routeConn.main[0].map(c => nodes.find(n => n.name === c.node)).filter(Boolean) : [];
      
      console.log(`\n   📋 Verarbeite: ${routeName}`);
      console.log(`      Aktuelle Outputs: ${routeOutputs.map(n => n.name).join(', ') || 'KEINE'}`);
      
      // Für jede mögliche Kategorie: Prüfe ob passende Update/Rate Limiting Nodes existieren
      let category = null;
      let updateNode = null;
      let rateLimitingNode = null;
      
      for (const [cat, patterns] of Object.entries(routeCategoryMapping)) {
        const potentialUpdateNodes = allUpdateNodes.filter(n => {
          const name = n.name.toLowerCase();
          return patterns.updatePattern.test(name);
        });
        
        const potentialRateNodes = allRateLimitingNodes.filter(n => {
          const name = n.name.toLowerCase();
          return patterns.rateLimitingPattern.test(name);
        });
        
        if (potentialUpdateNodes.length > 0 && potentialRateNodes.length > 0) {
          // Prüfe ob Route Node bereits zu dieser Kategorie gehört (durch bestehende Verbindungen)
          const hasConnectionToCategory = routeOutputs.some(output => {
            return potentialUpdateNodes.some(u => u.name === output.name);
          });
          
          if (hasConnectionToCategory || !category) {
            category = cat;
            updateNode = potentialUpdateNodes[0];
            rateLimitingNode = potentialRateNodes[0];
          }
        }
      }
      
      if (!category || !updateNode || !rateLimitingNode) {
        console.log(`      ⚠️  Kann Kategorie nicht eindeutig bestimmen`);
        console.log(`      Versuche alle Kategorien durchzugehen...`);
        
        // Versuche jede Kategorie zu fixen (für alle die passende Nodes haben)
        for (const [cat, patterns] of Object.entries(routeCategoryMapping)) {
          const potentialUpdateNodes = allUpdateNodes.filter(n => {
            const name = n.name.toLowerCase();
            return patterns.updatePattern.test(name);
          });
          
          const potentialRateNodes = allRateLimitingNodes.filter(n => {
            const name = n.name.toLowerCase();
            return patterns.rateLimitingPattern.test(name);
          });
          
          if (potentialUpdateNodes.length > 0 && potentialRateNodes.length > 0) {
            console.log(`      → Versuche Kategorie "${cat}" mit ${potentialUpdateNodes[0].name} → ${potentialRateNodes[0].name}`);
            
            // Route kann zu mehreren Update Nodes gehen (je nach Output-Branch)
            // Lass uns für diese Route alle passenden Verbindungen erstellen
            // ABER: Route sollte nur EINE Verbindung haben, also nehmen wir die erste Kategorie
            if (!updateNode) {
              category = cat;
              updateNode = potentialUpdateNodes[0];
              rateLimitingNode = potentialRateNodes[0];
              break;
            }
          }
        }
      }
      
      if (!updateNode || !rateLimitingNode) {
        console.log(`      ❌ Keine passenden Update/Rate Limiting Nodes gefunden`);
        return;
      }
      
      console.log(`      Kategorie: ${category}`);
      console.log(`      Update Node: ${updateNode.name}`);
      console.log(`      Rate Limiting Node: ${rateLimitingNode.name}`);
      
      console.log(`      Update Node: ${updateNode.name}`);
      console.log(`      Rate Limiting Node: ${rateLimitingNode.name}`);
      
      // Route → Update
      if (!connections[routeName]) {
        connections[routeName] = { main: [[]] };
      }
      
      const routeOutputs = connections[routeName].main[0] || [];
      const hasUpdateConnection = routeOutputs.some(c => c.node === updateNode.name);
      
      if (!hasUpdateConnection) {
        // Entferne alle anderen Outputs (Route sollte nur zu Update gehen)
        connections[routeName].main[0] = [{
          node: updateNode.name,
          type: 'main',
          index: 0
        }];
        console.log(`      ✅ ${routeName} → ${updateNode.name} (verbunden)`);
        changes++;
      } else {
        console.log(`      ⏭️  ${routeName} → ${updateNode.name} (bereits verbunden)`);
      }
      
      // Update → Rate Limiting
      if (!connections[updateNode.name]) {
        connections[updateNode.name] = { main: [[]] };
      }
      
      const updateOutputs = connections[updateNode.name].main[0] || [];
      const hasRateConnection = updateOutputs.some(c => c.node === rateLimitingNode.name);
      
      if (!hasRateConnection) {
        // Entferne alle anderen Outputs (Update sollte nur zu Rate Limiting gehen)
        connections[updateNode.name].main[0] = [{
          node: rateLimitingNode.name,
          type: 'main',
          index: 0
        }];
        console.log(`      ✅ ${updateNode.name} → ${rateLimitingNode.name} (verbunden)`);
        changes++;
      } else {
        console.log(`      ⏭️  ${updateNode.name} → ${rateLimitingNode.name} (bereits verbunden)`);
      }
    });
    
    console.log('\n');
    
    // 4. Speichere Workflow
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
      console.log(`   Route by Priority Nodes: ${routeNodes.length}`);
      console.log(`   Struktur korrigiert: Route → Update → Rate Limiting\n`);
    } else {
      console.log('✅ Keine Änderungen notwendig - Route-Struktur ist bereits korrekt!\n');
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

fixRouteByPriorityComplete();
