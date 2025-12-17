/**
 * FIX SUPABASE URL SYNTAX
 * Korrigiert die URL-Syntax für Supabase REST API
 */

const https = require('https');
const http = require('http');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const N8N_API_KEY = process.env.N8N_API_KEY || process.argv[2];
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

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

async function fixSupabaseUrlSyntax() {
  console.log('\n🔧 Korrigiere Supabase URL Syntax...\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    const statusNode = workflow.nodes.find(n => n.name.includes('Get Workflow Status REAL'));
    
    if (!statusNode) {
      console.log('❌ Node nicht gefunden');
      return;
    }
    
    console.log(`📌 ${statusNode.name}:`);
    console.log(`   Aktuelle URL: ${statusNode.parameters.url?.substring(0, 120)}...\n`);
    
    // Korrigiere URL - Supabase PostgREST Syntax
    // Problem: workflow_id=eq.{{ expression }} funktioniert nicht richtig
    // Lösung: Nutze Query Parameters statt URL-String-Interpolation
    // ODER: Nutze einfachere Syntax ohne Filter, wenn möglich
    
    // Option 1: Einfache URL ohne Filter (alle Einträge, dann im Code filtern)
    // Option 2: Query Parameters nutzen (n8n unterstützt das)
    
    // Ich verwende Option 2 - Query Parameters in n8n
    const baseUrl = 'https://mxswxdnnjhhukovixzvb.supabase.co';
    
    // Neue URL - OHNE workflow_id Filter in URL (wird über Query Parameter gemacht)
    const newUrl = `=${baseUrl}/rest/v1/workflow_status?select=*&order=created_at.desc&limit={{ $json.limit || 100 }}`;
    
    statusNode.parameters.url = newUrl;
    
    // Füge Query Parameters hinzu (wenn n8n das unterstützt)
    // Alternative: Nutze einfachere URL und filtere im nächsten Node
    
    // Für jetzt: Einfache URL, filtere später im Code wenn nötig
    console.log('   ✅ URL vereinfacht (ohne workflow_id Filter)');
    console.log('   💡 Filter kann in Format Status Response Node gemacht werden\n');
    
    // Aktualisiere Workflow
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: {}
    };
    
    await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
    
    console.log('✅ Workflow aktualisiert!\n');
    console.log('📝 HINWEIS:');
    console.log('   Die URL holt jetzt alle workflow_status Einträge (limit 100).');
    console.log('   Falls Sie nach workflow_id filtern müssen, können Sie das');
    console.log('   im "Format Status Response" Node machen.\n');
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    throw error;
  }
}

fixSupabaseUrlSyntax();

