/**
 * WATCH LIVE EXECUTION
 * Überwacht eine laufende Execution in Echtzeit
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

function formatTime(ms) {
  if (!ms) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

async function watchLiveExecution() {
  console.log('\n' + '='.repeat(80));
  console.log('👁️  LIVE EXECUTION WATCHER');
  console.log('='.repeat(80) + '\n');
  console.log(`📌 Workflow ID: ${WORKFLOW_ID}\n`);
  console.log('Warte auf laufende Execution... (Ctrl+C zum Abbrechen)\n');
  
  let lastNodeStatus = null;
  let checkCount = 0;
  
  while (true) {
    try {
      // Hole alle Executions
      const allExecutions = await n8nRequest('/api/v1/executions?limit=50');
      const executions = allExecutions.data || allExecutions.results || [];
      const workflowExecs = executions.filter(e => e.workflowId === WORKFLOW_ID);
      
      // Finde laufende Executions (finished === false und kein stoppedAt)
      const runningExecs = workflowExecs.filter(e => 
        e.finished === false || (!e.stoppedAt && (Date.now() - new Date(e.startedAt).getTime() < 3600000))
      );
      
      // Oder neueste Execution wenn keine läuft
      const targetExec = runningExecs.length > 0 ? runningExecs[0] : workflowExecs[0];
      
      if (!targetExec) {
        if (checkCount === 0) {
          console.log('⚠️  Keine Executions gefunden!');
          console.log('💡 Starten Sie den Workflow in n8n...\n');
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        checkCount++;
        continue;
      }
      
      const execDetails = await n8nRequest(`/api/v1/executions/${targetExec.id}`);
      
      if (!execDetails || !execDetails.data) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        checkCount++;
        continue;
      }
      
      const runData = execDetails.data.resultData?.runData || {};
      const nodeNames = Object.keys(runData);
      
      // Finde aktuellen Status
      const runningNodes = [];
      const finishedNodes = [];
      
      nodeNames.forEach(nodeName => {
        const nodeData = runData[nodeName];
        if (Array.isArray(nodeData)) {
          nodeData.forEach(exec => {
            if (exec.startTime) {
              if (!exec.stoppedAt && exec.executionTime === undefined) {
                const duration = Date.now() - new Date(exec.startTime).getTime();
                runningNodes.push({ name: nodeName, startTime: exec.startTime, duration });
              } else if (exec.stoppedAt) {
                finishedNodes.push({ 
                  name: nodeName, 
                  stoppedAt: exec.stoppedAt,
                  executionTime: exec.executionTime 
                });
              }
            }
          });
        }
      });
      
      // Sortiere finishedNodes nach stoppedAt
      finishedNodes.sort((a, b) => new Date(b.stoppedAt) - new Date(a.stoppedAt));
      
      const currentStatus = JSON.stringify({
        running: runningNodes.map(n => n.name),
        lastFinished: finishedNodes[0]?.name
      });
      
      // Nur Update zeigen wenn sich etwas geändert hat
      if (currentStatus !== lastNodeStatus) {
        console.clear();
        console.log('\n' + '='.repeat(80));
        console.log('👁️  LIVE EXECUTION WATCHER');
        console.log('='.repeat(80) + '\n');
        
        console.log(`📌 Execution ID: ${targetExec.id}`);
        const isRunning = targetExec.finished === false || runningNodes.length > 0;
        console.log(`   Status: ${isRunning ? '🟢 RUNNING' : targetExec.stoppedAt ? '✅ FINISHED' : '❓ UNKNOWN'}`);
        console.log(`   Gestartet: ${new Date(targetExec.startedAt).toLocaleString()}`);
        
        if (targetExec.stoppedAt) {
          const duration = new Date(targetExec.stoppedAt) - new Date(targetExec.startedAt);
          console.log(`   Beendet: ${new Date(targetExec.stoppedAt).toLocaleString()}`);
          console.log(`   Dauer: ${formatTime(duration)}\n`);
        } else {
          const duration = Date.now() - new Date(targetExec.startedAt).getTime();
          console.log(`   Laufzeit: ${formatTime(duration)}\n`);
        }
        
        if (runningNodes.length > 0) {
          console.log('🟡 ⚠️  NODES DIE GERADE LAUFEN (HIER HÄNGT DER WORKFLOW):\n');
          runningNodes.forEach(node => {
            const runTime = formatTime(node.duration);
            console.log(`   ⏳ ${node.name}`);
            console.log(`      Läuft seit: ${runTime}`);
            
            if (node.duration > 60000) {
              console.log(`      ⚠️  WARNUNG: Läuft bereits sehr lange (>1 Minute)!`);
            }
            if (node.duration > 300000) {
              console.log(`      🔴 KRITISCH: Läuft bereits >5 Minuten - möglicherweise hängt der Workflow!`);
            }
            console.log();
          });
        }
        
        if (finishedNodes.length > 0) {
          console.log('✅ LETZTE ABGESCHLOSSENE NODES (die letzten 5):\n');
          finishedNodes.slice(0, 5).forEach(node => {
            const duration = formatTime(node.executionTime);
            console.log(`   ${node.name} (${duration})`);
          });
          console.log();
        }
        
        console.log(`📊 Insgesamt ${nodeNames.length} Nodes wurden ausgeführt\n`);
        console.log('Aktualisiert alle 2 Sekunden... (Ctrl+C zum Abbrechen)\n');
        
        lastNodeStatus = currentStatus;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Update alle 2 Sekunden
      checkCount++;
      
    } catch (error) {
      console.error('\n❌ FEHLER:', error.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
      checkCount++;
    }
  }
}

watchLiveExecution().catch(error => {
  console.error('\n❌ KRITISCHER FEHLER:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
