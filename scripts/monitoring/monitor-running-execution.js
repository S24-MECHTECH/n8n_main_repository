/**
 * MONITOR RUNNING EXECUTION
 * Überwacht eine gerade laufende Execution in Echtzeit
 */

const https = require('https');
const http = require('http');

// Konfiguration
const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const N8N_API_KEY = process.env.N8N_API_KEY || process.argv[2];
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5'; // ***MECHTECH_MERCHANT_CENTER_ADMIN

if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY fehlt!');
  process.exit(1);
}

/**
 * n8n API Request
 */
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Analysiere Node-Execution auf Fehler
 */
function analyzeExecution(execution) {
  const errors = [];
  const nodeStatus = {};
  
  if (!execution.data || !execution.data.resultData) {
    return { errors, nodeStatus };
  }
  
  const resultData = execution.data.resultData;
  
  if (resultData.runData) {
    for (const [nodeName, nodeExecutions] of Object.entries(resultData.runData)) {
      const nodeErrors = [];
      let successCount = 0;
      let errorCount = 0;
      
      for (const exec of nodeExecutions) {
        if (exec.error) {
          errorCount++;
          nodeErrors.push({
            error: exec.error.message || exec.error,
            execution: exec
          });
        } else {
          successCount++;
        }
      }
      
      nodeStatus[nodeName] = {
        total: nodeExecutions.length,
        success: successCount,
        errors: errorCount,
        nodeErrors
      };
      
      if (nodeErrors.length > 0) {
        errors.push({
          node: nodeName,
          errors: nodeErrors,
          total: nodeExecutions.length,
          success: successCount,
          failed: errorCount
        });
      }
    }
  }
  
  return { errors, nodeStatus };
}

/**
 * Hauptfunktion
 */
async function monitorRunningExecution() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 MONITOR RUNNING EXECUTION');
  console.log('='.repeat(80));
  console.log(`Workflow ID: ${WORKFLOW_ID}`);
  console.log(`n8n URL: ${N8N_URL}\n`);
  
  try {
    // Finde laufende Execution
    console.log('🔍 Suche laufende Execution...\n');
    
    const executions = await n8nRequest(`/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=10`);
    const execList = executions.data || [];
    
    const runningExecution = execList.find(e => !e.finished);
    
    if (!runningExecution) {
      console.log('⏳ Keine laufende Execution gefunden.');
      console.log('   Prüfe letzte Execution...\n');
      
      if (execList.length > 0) {
        const lastExecution = execList[0];
        console.log(`📊 Letzte Execution: ${lastExecution.id}`);
        console.log(`   Status: ${lastExecution.finished ? 'Abgeschlossen' : 'Läuft'}\n`);
        
        // Hole Details
        const details = await n8nRequest(`/api/v1/executions/${lastExecution.id}`);
        const { errors, nodeStatus } = analyzeExecution(details.data);
        
        if (errors.length > 0) {
          console.log(`❌ ${errors.length} NODES MIT FEHLERN:\n`);
          
          errors.forEach(errorNode => {
            console.log(`\n🔴 Node: ${errorNode.node}`);
            console.log(`   Gesamt: ${errorNode.total} | Erfolg: ${errorNode.success} | Fehler: ${errorNode.failed}`);
            
            errorNode.errors.forEach((err, idx) => {
              console.log(`\n   Fehler ${idx + 1}:`);
              console.log(`   ${err.error}`);
              
              // Spezielle Analyse für "strang 53 items"
              if (err.error.includes('53') || errorNode.node.includes('Prepare Products Loop')) {
                console.log(`\n   💡 DIAGNOSE (Strang 53 Items):`);
                console.log(`   - Prüfe ob Analyze Products2 korrekte Daten liefert`);
                console.log(`   - Prüfe ob Prepare Products Loop auf richtige Node zugreift`);
                console.log(`   - Prüfe ob products_needing_fix Array existiert`);
              }
            });
          });
          
          // Zeige Nodes die erfolgreich waren
          console.log('\n' + '='.repeat(80));
          console.log('✅ ERFOLGREICHE NODES:\n');
          
          Object.entries(nodeStatus).forEach(([nodeName, status]) => {
            if (status.errors === 0 && status.total > 0) {
              console.log(`   ✅ ${nodeName}: ${status.success}/${status.total}`);
            }
          });
        } else {
          console.log('✅ Keine Fehler gefunden!');
        }
      }
      
      return;
    }
    
    console.log(`✅ Laufende Execution gefunden: ${runningExecution.id}\n`);
    
    // Monitor-Loop
    let finished = false;
    let checkCount = 0;
    const maxChecks = 300; // 5 Minuten bei 1s Intervall
    
    while (!finished && checkCount < maxChecks) {
      try {
        const execDetails = await n8nRequest(`/api/v1/executions/${runningExecution.id}`);
        const exec = execDetails.data;
        
        if (exec.finished) {
          finished = true;
          console.log('\n✅ Execution abgeschlossen!\n');
          
          const { errors, nodeStatus } = analyzeExecution(exec);
          
          if (errors.length > 0) {
            console.log(`❌ ${errors.length} NODES MIT FEHLERN:\n`);
            
            errors.forEach(errorNode => {
              console.log(`\n🔴 Node: ${errorNode.node}`);
              console.log(`   Gesamt: ${errorNode.total} | Erfolg: ${errorNode.success} | Fehler: ${errorNode.failed}`);
              
              errorNode.errors.slice(0, 3).forEach((err, idx) => {
                console.log(`\n   Fehler ${idx + 1}: ${err.error.substring(0, 200)}`);
              });
              
              if (errorNode.errors.length > 3) {
                console.log(`   ... und ${errorNode.errors.length - 3} weitere Fehler`);
              }
            });
          } else {
            console.log('✅ Alle Nodes erfolgreich ausgeführt!');
          }
          
          // Zeige Zusammenfassung
          console.log('\n' + '='.repeat(80));
          console.log('📊 ZUSAMMENFASSUNG:\n');
          
          Object.entries(nodeStatus).forEach(([nodeName, status]) => {
            const icon = status.errors === 0 ? '✅' : '❌';
            console.log(`${icon} ${nodeName}: ${status.success}/${status.total} erfolgreich`);
          });
          
        } else {
          // Zeige Status alle 5 Sekunden
          if (checkCount % 5 === 0) {
            const { nodeStatus } = analyzeExecution(exec);
            const totalNodes = Object.keys(nodeStatus).length;
            const errorNodes = Object.values(nodeStatus).filter(s => s.errors > 0).length;
            
            console.log(`⏳ Läuft... | Nodes: ${totalNodes} | Fehler: ${errorNodes}`);
          }
        }
        
        await sleep(1000);
        checkCount++;
        
      } catch (error) {
        console.error(`❌ Fehler beim Überwachen: ${error.message}`);
        await sleep(2000);
        checkCount++;
      }
    }
    
    if (checkCount >= maxChecks) {
      console.log('\n⏱️  Timeout erreicht');
    }
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Ausführung
monitorRunningExecution();
