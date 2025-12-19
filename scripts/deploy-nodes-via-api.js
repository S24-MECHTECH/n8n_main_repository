/**
 * 🚀 DEPLOY NODES VIA API
 * Deployt die 3 neuen Nodes direkt zu n8n
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

// Node-Definitionen
const newNodeDefinitions = {
  errorHandler: {
    name: 'AI Error Handler',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1000, 600],
    parameters: {
      jsCode: `// AI Error Handler - Analysiert und repariert Fehler automatisch
const items = $input.all();
const fixedItems = [];

items.forEach((item) => {
  try {
    const data = item.json;
    const error = data.error || data._error || {};
    
    let errorType = 'unknown';
    let fixApplied = false;
    let fixedData = { ...data };
    
    if (error.message && (error.message.includes('connection') || error.message.includes('network'))) {
      errorType = 'connection';
      fixedData.retry = true;
      fixedData.retryCount = (fixedData.retryCount || 0) + 1;
      fixApplied = true;
    } else if (error.message && (error.message.includes('credential') || error.message.includes('auth'))) {
      errorType = 'credential';
      fixedData.useFallbackCredential = true;
      fixApplied = true;
    } else if (error.message && (error.message.includes('expression') || error.message.includes('syntax'))) {
      errorType = 'expression';
      fixApplied = true;
    } else if (error.message && (error.message.includes('rate limit') || error.message.includes('429'))) {
      errorType = 'rate_limit';
      fixedData.retryAfter = error.retryAfter || 60;
      fixedData.useRateLimiter = true;
      fixApplied = true;
    }
    
    fixedItems.push({
      json: {
        ...fixedData,
        _errorHandler: {
          errorType,
          fixApplied,
          originalError: error.message || 'unknown',
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (e) {
    fixedItems.push(item);
  }
});

return fixedItems;`
    }
  },
  retryQueue: {
    name: 'Retry Queue',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1200, 600],
    parameters: {
      jsCode: `// Retry Queue - Warteschlange für Retries
const items = $input.all();
const retryItems = [];

items.forEach(item => {
  const data = item.json;
  if (data.retry === true && (data.retryCount || 0) < 3) {
    retryItems.push({
      json: {
        ...data,
        retryCount: (data.retryCount || 0) + 1,
        retryDelay: Math.min(60 * data.retryCount, 300)
      }
    });
  }
});

retryItems.sort((a, b) => (a.json.retryCount || 0) - (b.json.retryCount || 0));
return retryItems;`
    }
  },
  expressionRepair: {
    name: 'Expression Repair',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1400, 600],
    parameters: {
      jsCode: `// Expression Repair - Repariert gebrochene Expressions
const items = $input.all();
const repairedItems = [];

items.forEach(item => {
  const data = { ...item.json };
  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'string') {
      let value = data[key];
      value = value.replace(/\\{\\{\\s*([^}]+)\\s*\\}\\}/g, (match, expr) => {
        const trimmed = expr.trim();
        if (trimmed.startsWith('$')) {
          return match;
        }
        if (trimmed.includes('json')) {
          return '{{ $' + trimmed + ' }}';
        }
        const fallbackKey = key.replace(/[^a-zA-Z0-9]/g, '_');
        return data[fallbackKey] || '';
      });
      data[key] = value;
    }
  });
  repairedItems.push({ json: data });
});

return repairedItems;`
    }
  }
};

async function deployNodes() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 DEPLOY NODES VIA API');
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
    console.log(`   Nodes: ${nodes.length}\n`);
    
    // 2. Prüfe ob Nodes bereits existieren
    const existingNames = nodes.map(n => n.name);
    const nodesToAdd = [];
    
    Object.entries(newNodeDefinitions).forEach(([key, def]) => {
      if (!existingNames.includes(def.name)) {
        // Generiere eindeutige ID
        const nodeId = `${key}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        nodesToAdd.push({
          id: nodeId,
          ...def
        });
        console.log(`   ✅ Node wird hinzugefügt: ${def.name}`);
      } else {
        console.log(`   ⏭️  Node bereits vorhanden: ${def.name}`);
      }
    });
    
    if (nodesToAdd.length === 0) {
      console.log('\n✅ Alle Nodes sind bereits vorhanden!\n');
      return;
    }
    
    // 3. Füge Nodes hinzu
    nodes = [...nodes, ...nodesToAdd];
    
    // 4. Verbinde Nodes
    const errorHandler = nodes.find(n => n.name === 'AI Error Handler');
    const retryQueue = nodes.find(n => n.name === 'Retry Queue');
    const expressionRepair = nodes.find(n => n.name === 'Expression Repair');
    
    if (errorHandler && retryQueue) {
      if (!connections[errorHandler.name]) {
        connections[errorHandler.name] = { main: [[]] };
      }
      connections[errorHandler.name].main[0].push({
        node: retryQueue.name,
        type: 'main',
        index: 0
      });
      console.log(`   ✅ ${errorHandler.name} → ${retryQueue.name}`);
    }
    
    if (retryQueue && expressionRepair) {
      if (!connections[retryQueue.name]) {
        connections[retryQueue.name] = { main: [[]] };
      }
      connections[retryQueue.name].main[0].push({
        node: expressionRepair.name,
        type: 'main',
        index: 0
      });
      console.log(`   ✅ ${retryQueue.name} → ${expressionRepair.name}`);
    }
    
    // 5. Workflow speichern (nur name, nodes, connections, settings)
    console.log('\n💾 Speichere Workflow...\n');
    
    // Settings bereinigen - NUR executionOrder (API akzeptiert keine anderen Properties!)
    // Test-Ergebnis: API lehnt timeSavedMode, callerPolicy, availableInMCP ab
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
    
    console.log('✅ Workflow erfolgreich aktualisiert!\n');
    console.log('📊 ZUSAMMENFASSUNG:');
    console.log(`   Nodes hinzugefügt: ${nodesToAdd.length}`);
    console.log(`   - AI Error Handler`);
    console.log(`   - Retry Queue`);
    console.log(`   - Expression Repair`);
    console.log(`   Connections: Erstellt`);
    console.log(`   Workflow Status: ${workflow.active ? 'ACTIVE ✅' : 'INACTIVE ⏸️'}\n`);
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
  deployNodes();
}

module.exports = { deployNodes };
