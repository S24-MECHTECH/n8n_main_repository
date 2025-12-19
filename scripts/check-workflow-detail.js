/**
 * DETAIL CHECK WORKFLOW
 * Zeigt ALLE Nodes und Connections im Detail
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

async function checkWorkflowDetail() {
  console.log('\n' + '='.repeat(80));
  console.log('DETAIL CHECK WORKFLOW');
  console.log('='.repeat(80) + '\n');
  
  try {
    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY nicht gefunden!');
    }
    
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || {};
    
    console.log(`Workflow: ${workflow.name}`);
    console.log(`Active: ${workflow.active ? 'JA' : 'NEIN'}`);
    console.log(`Total Nodes: ${nodes.length}\n`);
    
    // 1. Zeige ALLE Switch Nodes
    console.log('='.repeat(80));
    console.log('ALLE SWITCH NODES:');
    console.log('='.repeat(80) + '\n');
    
    const switchNodes = nodes.filter(n => n.type === 'n8n-nodes-base.switch' || n.name.includes('Switch'));
    console.log(`Gefunden: ${switchNodes.length} Switch Node(s)\n`);
    
    if (switchNodes.length === 0) {
      console.log('❌ KEINE SWITCH NODES GEFUNDEN!\n');
    } else {
      switchNodes.forEach((node, idx) => {
        console.log(`${idx + 1}. ${node.name}`);
        console.log(`   Type: ${node.type}`);
        console.log(`   ID: ${node.id}`);
        console.log('');
      });
    }
    
    // 2. Zeige ALLE Rate Limiting Nodes
    console.log('='.repeat(80));
    console.log('ALLE RATE LIMITING NODES:');
    console.log('='.repeat(80) + '\n');
    
    const rateLimitingNodes = nodes.filter(n => n.name.includes('Rate Limiting'));
    console.log(`Gefunden: ${rateLimitingNodes.length} Rate Limiting Node(s)\n`);
    
    rateLimitingNodes.forEach((node, idx) => {
      console.log(`${idx + 1}. ${node.name}`);
      console.log(`   Type: ${node.type}`);
      console.log(`   ID: ${node.id}`);
      
      // Zeige Connections
      const nodeConnections = connections[node.name]?.main?.[0] || [];
      console.log(`   Connections: ${nodeConnections.length}`);
      nodeConnections.forEach(conn => {
        const target = typeof conn === 'object' ? conn.node : conn;
        console.log(`      → ${target}`);
      });
      console.log('');
    });
    
    // 3. Zeige ALLE Gemini Nodes
    console.log('='.repeat(80));
    console.log('ALLE GEMINI NODES:');
    console.log('='.repeat(80) + '\n');
    
    const geminiNodes = nodes.filter(n => 
      n.name.includes('Gemini') || 
      n.type.includes('gemini') || 
      n.type.includes('Gemini')
    );
    console.log(`Gefunden: ${geminiNodes.length} Gemini Node(s)\n`);
    
    geminiNodes.forEach((node, idx) => {
      console.log(`${idx + 1}. ${node.name}`);
      console.log(`   Type: ${node.type}`);
      console.log(`   ID: ${node.id}`);
      
      // Zeige Connections
      const nodeConnections = connections[node.name]?.main?.[0] || [];
      console.log(`   Output Connections: ${nodeConnections.length}`);
      nodeConnections.forEach(conn => {
        const target = typeof conn === 'object' ? conn.node : conn;
        console.log(`      → ${target}`);
      });
      
      // Prüfe Input Connections
      let inputConnections = 0;
      for (const [fromNode, conns] of Object.entries(connections)) {
        if (conns.main) {
          for (const outputArray of conns.main) {
            if (Array.isArray(outputArray)) {
              const hasConnection = outputArray.some(conn => {
                const target = typeof conn === 'object' ? conn.node : conn;
                return target === node.name;
              });
              if (hasConnection) inputConnections++;
            }
          }
        }
      }
      console.log(`   Input Connections: ${inputConnections}`);
      console.log('');
    });
    
    // 4. SUMMARY
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    console.log(`Switch Nodes: ${switchNodes.length}`);
    console.log(`Rate Limiting Nodes: ${rateLimitingNodes.length}`);
    console.log(`Gemini Nodes: ${geminiNodes.length}`);
    console.log(`Workflow Active: ${workflow.active ? 'JA' : 'NEIN'}`);
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  checkWorkflowDetail();
}

module.exports = { checkWorkflowDetail };
