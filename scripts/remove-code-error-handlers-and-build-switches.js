/**
 * 🗑️ REMOVE CODE ERROR HANDLERS & BUILD SWITCH NODES
 * Entfernt alte Code-Nodes und erstellt Switch Nodes
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

// Strang-Definitionen
const strandDefinitions = [
  { name: 'Adult', updateNode: 'Update Product Adult Flag' },
  { name: 'Images', updateNode: 'Update Product Images' },
  { name: 'Text', updateNode: 'Update Product Text' },
  { name: 'Quality', updateNode: 'Update Merchant Settings' },
  { name: 'Country', updateNode: 'Update Country Feeds' },
  { name: 'GTN/EAN', updateNode: 'Update GTN/EAN' }
];

function createSwitchNode(strand, updateNode) {
  // Position: Rechts neben Update Node
  const position = [updateNode.position[0] + 350, updateNode.position[1]];
  
  return {
    id: `switch-error-${strand.name.toLowerCase().replace(/[\/\s]/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `Error Handler ${strand.name}`,
    type: 'n8n-nodes-base.switch',
    typeVersion: 3,
    position: position,
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          {
            conditions: {
              options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict'
              },
              conditions: [
                {
                  id: `err-code-429-${Date.now()}-1`,
                  leftValue: '={{ $json.error?.code || $json.code || 0 }}',
                  rightValue: 429,
                  operator: {
                    type: 'number',
                    operation: 'equals',
                    singleValue: true
                  }
                }
              ],
              combinator: 'and'
            },
            renameOutput: true,
            outputKey: 'RETRY'
          },
          {
            conditions: {
              options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict'
              },
              conditions: [
                {
                  id: `err-code-400-${Date.now()}-2`,
                  leftValue: '={{ $json.error?.code || $json.code || 0 }}',
                  rightValue: 400,
                  operator: {
                    type: 'number',
                    operation: 'equals',
                    singleValue: true
                  }
                }
              ],
              combinator: 'and'
            },
            renameOutput: true,
            outputKey: 'REROUTE'
          },
          {
            conditions: {
              options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict'
              },
              conditions: [
                {
                  id: `err-code-500-${Date.now()}-3`,
                  leftValue: '={{ $json.error?.code || $json.code || 0 }}',
                  rightValue: 500,
                  operator: {
                    type: 'number',
                    operation: 'equals',
                    singleValue: true
                  }
                }
              ],
              combinator: 'and'
            },
            renameOutput: true,
            outputKey: 'SKIP'
          }
        ]
      },
      options: {
        fallbackOutput: 'default'
      },
      fallbackOutput: 'ALERT'
    }
  };
}

async function removeAndBuild() {
  console.log('\n' + '='.repeat(80));
  console.log('🗑️ REMOVE CODE HANDLERS & BUILD SWITCH NODES');
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
    console.log(`   Nodes vorher: ${nodes.length}\n`);
    
    // Initialisiere connections
    if (!connections.main) connections.main = [[]];
    if (!connections.main[0]) connections.main[0] = [];
    
    // 2. Entferne alte Code-basierte Error Handler
    console.log('🗑️  Entferne alte Code-basierte Error Handler...\n');
    
    const codeErrorHandlers = nodes.filter(n => 
      n.type === 'n8n-nodes-base.code' && 
      n.name && (
        n.name.includes('AI Error Handler') ||
        n.name.includes('Error Handler') && !n.name.includes('Switch')
      )
    );
    
    const nodeIdsToRemove = new Set(codeErrorHandlers.map(n => n.id));
    
    // Entferne Connections zu diesen Nodes
    connections.main[0] = connections.main[0].filter(conn => 
      !nodeIdsToRemove.has(conn[0]?.node) && !nodeIdsToRemove.has(conn[1]?.node)
    );
    
    // Entferne Nodes
    nodes = nodes.filter(n => !nodeIdsToRemove.has(n.id));
    
    console.log(`   ✅ ${codeErrorHandlers.length} Code-Node(s) entfernt\n`);
    
    // 3. Erstelle Switch Nodes für jeden Strang
    console.log('🔀 Erstelle Switch Nodes...\n');
    
    let addedCount = 0;
    
    for (const strand of strandDefinitions) {
      console.log(`📋 STRANG: ${strand.name}\n`);
      
      // Finde Update Node
      const updateNode = nodes.find(n => n.name === strand.updateNode);
      if (!updateNode) {
        console.log(`   ⚠️  ${strand.updateNode} nicht gefunden - übersprungen\n`);
        continue;
      }
      
      // Prüfe ob Switch Node bereits existiert
      const existingSwitch = nodes.find(n => 
        n.name === `Error Handler ${strand.name}` && 
        n.type === 'n8n-nodes-base.switch'
      );
      
      if (existingSwitch) {
        console.log(`   ⏭️  Switch Node bereits vorhanden: ${existingSwitch.name}\n`);
        continue;
      }
      
      // Erstelle Switch Node
      const switchNode = createSwitchNode(strand, updateNode);
      nodes.push(switchNode);
      addedCount++;
      
      console.log(`   ✅ ${switchNode.name} erstellt`);
      console.log(`      Position: [${switchNode.position[0]}, ${switchNode.position[1]}]`);
      console.log(`      Cases: 429→RETRY, 400→REROUTE, 500→SKIP, Default→ALERT\n`);
    }
    
    if (addedCount === 0) {
      console.log('✅ Alle Switch Nodes bereits vorhanden\n');
    } else {
      console.log(`   📊 ${addedCount} Switch Node(s) erstellt\n`);
    }
    
    // 4. Deploy zu n8n
    console.log('🚀 Deploy zu n8n...\n');
    
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
    console.log('   ✅ Workflow aktualisiert\n');
    
    // 5. REPORT
    console.log('📊 REPORT\n');
    console.log('✅ SWITCH-BASED ERROR HANDLERS ERSTELLT');
    console.log(`   ✅ ${codeErrorHandlers.length} Code-Node(s) entfernt`);
    console.log(`   ✅ ${addedCount} Switch Node(s) erstellt`);
    console.log(`   ✅ Nodes jetzt: ${nodes.length}`);
    console.log('\n   💡 Switch Nodes sind GRAFISCH sichtbar!');
    console.log('   💡 Nächster Schritt: Connections bauen!\n');
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
  removeAndBuild();
}

module.exports = { removeAndBuild };
