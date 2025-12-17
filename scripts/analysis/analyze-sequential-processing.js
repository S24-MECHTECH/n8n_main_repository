/**
 * ANALYZE SEQUENTIAL PROCESSING
 * Analysiert warum Artikel nicht sequenziell durch alle Prepare-Stränge laufen
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

async function analyzeSequentialProcessing() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ANALYSE SEQUENTIELLE VERARBEITUNG');
  console.log('='.repeat(80) + '\n');
  
  try {
    const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
    const connections = workflow.connections || {};
    
    console.log(`✅ Workflow geladen: ${workflow.name}\n`);
    
    // Finde alle Prepare-Nodes in der erwarteten Reihenfolge
    const expectedOrder = [
      'Prepare Products Loop',
      'Prepare Images Loop',
      'Prepare Text Loop',
      'Prepare Merchant Quality Loop',
      'Prepare Multi Country Loop',
      'Prepare GTN/EAN_Loop'
    ];
    
    const prepareNodes = [];
    expectedOrder.forEach(name => {
      const node = workflow.nodes.find(n => n.name === name);
      if (node) {
        prepareNodes.push(node);
      }
    });
    
    console.log(`📌 Gefundene Prepare-Nodes (${prepareNodes.length}/${expectedOrder.length}):\n`);
    prepareNodes.forEach((node, i) => {
      console.log(`   ${i + 1}. ${node.name} (${node.type})`);
    });
    
    // Analysiere Code-Nodes auf Loop-Verhalten
    console.log('\n🔍 CODE-NODE ANALYSE:\n');
    
    prepareNodes.forEach(node => {
      if (node.type.includes('code')) {
        const code = node.parameters.jsCode || '';
        const isLoop = code.includes('return') && (code.includes('.map(') || code.includes('.slice('));
        const hasInput = code.includes('$input') || code.includes('$(');
        
        console.log(`📌 ${node.name}:`);
        console.log(`   Code vorhanden: ${code.length > 0 ? '✅' : '❌'} (${code.length} Zeichen)`);
        console.log(`   Loop-Pattern: ${isLoop ? '✅' : '❌'}`);
        console.log(`   Input-Referenz: ${hasInput ? '✅' : '❌'}`);
        
        // Prüfe ob Code ein Array zurückgibt (wichtig für sequenzielle Verarbeitung)
        const returnsArray = code.includes('return') && (
          code.includes('.map(') || 
          code.includes('[') && code.includes(']')
        );
        console.log(`   Gibt Array zurück: ${returnsArray ? '✅' : '❌'}`);
        
        // Prüfe ob Code Items einzeln verarbeitet
        const processesSingle = code.includes('map(') || code.includes('forEach(');
        console.log(`   Verarbeitet Items einzeln: ${processesSingle ? '✅' : '❌'}`);
        console.log();
      }
    });
    
    // Analysiere Connections
    console.log('\n🔗 VERKABELUNGS-ANALYSE:\n');
    
    function traceFlow(nodeId, visited = new Set(), chain = [], depth = 0) {
      if (visited.has(nodeId) || depth > 20) {
        return chain;
      }
      visited.add(nodeId);
      
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (!node) return chain;
      
      chain.push({
        name: node.name,
        type: node.type,
        id: node.id
      });
      
      const nodeConnections = connections[nodeId] || {};
      const outputs = nodeConnections.main || [];
      
      if (outputs.length > 0 && outputs[0].length > 0) {
        const nextNodeId = outputs[0][0].node;
        return traceFlow(nextNodeId, visited, chain, depth + 1);
      }
      
      return chain;
    }
    
    const prepareProductsLoop = workflow.nodes.find(n => n.name === 'Prepare Products Loop');
    
    if (prepareProductsLoop) {
      console.log('📊 AKTUELLER FLOW (von Prepare Products Loop):\n');
      
      const chain = traceFlow(prepareProductsLoop.id);
      chain.forEach((node, i) => {
        const indent = '  '.repeat(i);
        console.log(`${indent}${i + 1}. ${node.name} [${node.type}]`);
      });
      
      console.log('\n');
      
      // Prüfe ob sequenzielle Kette vorhanden ist
      const prepareNamesInChain = chain
        .map(n => n.name)
        .filter(name => name.toLowerCase().includes('prepare'));
      
      console.log(`📋 Prepare-Nodes in Kette: ${prepareNamesInChain.length}/${expectedOrder.length}`);
      prepareNamesInChain.forEach((name, i) => {
        const expectedIndex = expectedOrder.findIndex(e => e === name);
        const isCorrect = expectedIndex === i;
        console.log(`   ${isCorrect ? '✅' : '⚠️'} ${name} (Position: ${i}, Erwartet: ${expectedIndex >= 0 ? expectedIndex : '?'})`);
      });
    }
    
    // PROBLEM-ANALYSE
    console.log('\n⚠️  PROBLEM-ANALYSE:\n');
    
    // Prüfe ob Rate Limiting die Items bündelt
    const rateLimitingNode = workflow.nodes.find(n => 
      n.name.toLowerCase().includes('rate limiting') && 
      !n.name.toLowerCase().includes('gtn')
    );
    
    if (rateLimitingNode) {
      console.log(`📍 Rate Limiting Node: ${rateLimitingNode.name}`);
      const rateLimitingConnections = connections[rateLimitingNode.id] || {};
      const rateOutputs = rateLimitingConnections.main || [];
      
      console.log(`   Outputs: ${rateOutputs.length}`);
      rateOutputs.forEach((outputArray, outputIndex) => {
        outputArray.forEach(conn => {
          const targetNode = workflow.nodes.find(n => n.id === conn.node);
          if (targetNode) {
            console.log(`   → Output ${outputIndex}: ${targetNode.name}`);
          }
        });
      });
      
      // Prüfe ob Rate Limiting zwischen Prepare-Strängen steht
      const rateLimitingInChain = chain.some(n => n.id === rateLimitingNode.id);
      if (rateLimitingInChain) {
        console.log('   ⚠️  Rate Limiting ist in der Prepare-Kette - das könnte Items bündeln!');
      }
    }
    
    // Prüfe ob Code-Nodes korrekt Items einzeln durchleiten
    console.log('\n🔍 DETAILANALYSE: Code-Verhalten\n');
    
    const prepareProductsCode = prepareNodes[0]?.parameters?.jsCode || '';
    if (prepareProductsCode) {
      console.log('📌 Prepare Products Loop Code-Analyse:');
      
      // Prüfe ob Code Items einzeln zurückgibt
      const returnsItems = prepareProductsCode.includes('.map(') && 
                          prepareProductsCode.includes('return');
      
      if (returnsItems) {
        console.log('   ✅ Code gibt Items als Array zurück (korrekt für n8n Loop)');
      } else {
        console.log('   ❌ Code gibt möglicherweise nicht korrekt Items zurück');
      }
      
      // Prüfe ob Code alle Items auf einmal zurückgibt oder einzeln
      const hasSlice = prepareProductsCode.includes('.slice(');
      if (hasSlice) {
        console.log('   ⚠️  Code verwendet .slice() - könnte Items bündeln');
      }
    }
    
    // FINDINGS
    console.log('\n' + '='.repeat(80));
    console.log('📊 ZUSAMMENFASSUNG & EMPFEHLUNGEN');
    console.log('='.repeat(80) + '\n');
    
    console.log('🔍 VERMUTETES PROBLEM:');
    console.log('   n8n verarbeitet Items standardmäßig PARALLEL, nicht sequenziell!');
    console.log('   Wenn Prepare Products Loop ein Array zurückgibt, werden alle Items');
    console.log('   PARALLEL durch die nachfolgenden Nodes verarbeitet.\n');
    
    console.log('💡 LÖSUNG:');
    console.log('   1. Jeder Prepare-Loop muss EIN Item verarbeiten');
    console.log('   2. Code muss EIN Item zurückgeben (nicht Array)');
    console.log('   3. ODER: Loop-Node verwenden für sequenzielle Verarbeitung\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

analyzeSequentialProcessing();

