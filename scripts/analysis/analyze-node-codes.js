/**
 * ANALYZE NODE CODES
 * Analysiert die aktuellen Codes der Prepare-Nodes und vergleicht mit Original-Logik
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

async function analyzeNodeCodes() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ANALYSE: NODE CODES UND SPEZIFISCHE LOGIK');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    
    const nodesToAnalyze = [
      {
        name: 'Prepare Images Loop',
        expectedKeywords: ['image', 'images', 'imageLink', 'image_link', 'imageUrl']
      },
      {
        name: 'Prepare Text Loop',
        expectedKeywords: ['title', 'description', 'text', 'content']
      },
      {
        name: 'Prepare Merchant Quality Loop',
        expectedKeywords: ['quality', 'merchant', 'quality_score', 'qualityScore']
      },
      {
        name: 'Prepare Multi Country Loop',
        expectedKeywords: ['country', 'countries', 'multi', 'destination', 'shipping']
      },
      {
        name: 'Prepare GTN/EAN_Loop',
        expectedKeywords: ['gtin', 'ean', 'mpn', 'brand', 'gtin_ean', 'productId']
      }
    ];
    
    nodesToAnalyze.forEach(nodeConfig => {
      const node = workflow.nodes.find(n => n.name === nodeConfig.name);
      if (!node) {
        console.log(`❌ ${nodeConfig.name}: Node nicht gefunden!\n`);
        return;
      }
      
      const code = node.parameters?.jsCode || '';
      
      console.log(`📌 ${nodeConfig.name}:`);
      console.log(`   Code Länge: ${code.length} Zeichen\n`);
      
      // Prüfe ob spezifische Keywords vorhanden sind
      console.log(`   🔍 Suche nach spezifischen Keywords:`);
      const foundKeywords = [];
      nodeConfig.expectedKeywords.forEach(keyword => {
        const found = code.toLowerCase().includes(keyword.toLowerCase());
        if (found) {
          foundKeywords.push(keyword);
          console.log(`      ✅ "${keyword}" gefunden`);
        } else {
          console.log(`      ❌ "${keyword}" NICHT gefunden`);
        }
      });
      
      // Zeige Code-Ausschnitt
      console.log(`\n   📄 Code-Ausschnitt (erste 300 Zeichen):`);
      const codePreview = code.substring(0, 300).replace(/\n/g, '\\n');
      console.log(`      ${codePreview}...`);
      
      // Prüfe wichtige Patterns
      console.log(`\n   🔍 Wichtige Patterns:`);
      const hasInputFirst = code.includes('$input.first()');
      const hasConfig = code.includes('Shop Configuration2') || code.includes('config');
      const hasReturn = code.includes('return {');
      const hasProductId = code.includes('product_id') || code.includes('productId');
      const hasShopId = code.includes('shop_id') || code.includes('shopId');
      
      console.log(`      ${hasInputFirst ? '✅' : '❌'} $input.first() verwendet`);
      console.log(`      ${hasConfig ? '✅' : '❌'} Shop Configuration referenziert`);
      console.log(`      ${hasReturn ? '✅' : '❌'} Return Statement vorhanden`);
      console.log(`      ${hasProductId ? '✅' : '❌'} Product ID vorhanden`);
      console.log(`      ${hasShopId ? '✅' : '❌'} Shop ID vorhanden`);
      
      // Bewertung
      console.log(`\n   📊 BEWERTUNG:`);
      if (foundKeywords.length === 0) {
        console.log(`      ⚠️  KRITISCH: Keine spezifischen Keywords gefunden!`);
        console.log(`      → Code ist nur ein Basis-Template`);
        console.log(`      → Spezifische Logik muss hinzugefügt werden!`);
      } else if (foundKeywords.length < nodeConfig.expectedKeywords.length / 2) {
        console.log(`      ⚠️  WARNUNG: Nur ${foundKeywords.length}/${nodeConfig.expectedKeywords.length} Keywords gefunden`);
        console.log(`      → Möglicherweise fehlt spezifische Logik`);
      } else {
        console.log(`      ✅ OK: ${foundKeywords.length}/${nodeConfig.expectedKeywords.length} Keywords gefunden`);
        console.log(`      → Spezifische Logik scheint vorhanden zu sein`);
      }
      
      console.log('\n' + '-'.repeat(80) + '\n');
    });
    
    // Zeige vollständigen Code für GTN/EAN_Loop (größter Code)
    const gtinNode = workflow.nodes.find(n => n.name === 'Prepare GTN/EAN_Loop');
    if (gtinNode) {
      console.log('📄 VOLLSTÄNDIGER CODE: Prepare GTN/EAN_Loop\n');
      console.log(gtinNode.parameters.jsCode);
      console.log('\n' + '='.repeat(80) + '\n');
    }
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

analyzeNodeCodes();

