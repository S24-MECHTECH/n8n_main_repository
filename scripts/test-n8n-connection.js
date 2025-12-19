/**
 * 🔍 TEST N8N CONNECTION
 * Prüft ob n8n Server erreichbar ist
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';

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

function testConnection() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/v1/workflows', N8N_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY || '',
        'Accept': 'application/json'
      },
      timeout: 10000
    };
    
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          data: data.substring(0, 500) // Erste 500 Zeichen
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });
    
    req.end();
  });
}

async function runTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 TEST N8N CONNECTION');
  console.log('='.repeat(80) + '\n');
  
  console.log(`📡 Server URL: ${N8N_URL}`);
  console.log(`🔑 API Key: ${N8N_API_KEY ? '✅ Vorhanden' : '❌ Fehlt'}\n`);
  
  if (!N8N_API_KEY) {
    console.log('❌ API Key fehlt!');
    console.log('\n💡 Prüfe Config-Pfade:');
    const configPaths = [
      path.join(__dirname, '..', '..', '.cursor', 'mcp.json'),
      path.join(__dirname, '..', '..', '.cursor', 'FUNKTIONIERENDE_CONFIG.json'),
      path.join(process.env.USERPROFILE || process.env.HOME, '.cursor', 'mcp.json')
    ];
    configPaths.forEach(p => {
      console.log(`   - ${p} (${fs.existsSync(p) ? '✅' : '❌'})`);
    });
    process.exit(1);
  }
  
  console.log('🔄 Teste Verbindung...\n');
  
  try {
    const result = await testConnection();
    
    console.log('✅ VERBINDUNG ERFOLGREICH!\n');
    console.log(`   Status Code: ${result.statusCode}`);
    console.log(`   Status Message: ${result.statusMessage}`);
    console.log(`   Response Length: ${result.data.length} bytes`);
    
    if (result.statusCode === 200) {
      console.log('\n   ✅ Server ist erreichbar und API Key ist gültig!');
    } else if (result.statusCode === 401) {
      console.log('\n   ⚠️  API Key ist ungültig!');
    } else {
      console.log(`\n   ⚠️  Unerwarteter Status Code: ${result.statusCode}`);
    }
    
    console.log('');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.log('❌ VERBINDUNG FEHLGESCHLAGEN!\n');
    console.log(`   Fehler: ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n   💡 DNS-Problem: Server-Hostname nicht aufgelöst');
      console.log('   💡 Prüfe: Internet-Verbindung, Server-URL korrekt?');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n   💡 Connection Refused: Server läuft nicht oder Port falsch');
      console.log('   💡 Prüfe: Server Status, Firewall, Port');
    } else if (error.message.includes('timeout')) {
      console.log('\n   💡 Timeout: Server antwortet nicht');
      console.log('   💡 Prüfe: Server Status, Netzwerk-Latenz');
    }
    
    console.log('');
    console.log('='.repeat(80) + '\n');
    process.exit(1);
  }
}

if (require.main === module) {
  runTest();
}

module.exports = { testConnection };
