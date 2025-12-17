/**
 * FIND RUNNING EXECUTION
 * Findet die aktuell laufende Execution
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

async function findRunningExecution() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 SUCHE LAUFENDE EXECUTION');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Hole alle Executions
    const allExecutions = await n8nRequest('/api/v1/executions?limit=100');
    const executions = allExecutions.data || allExecutions.results || [];
    const workflowExecs = executions.filter(e => e.workflowId === WORKFLOW_ID);
    
    console.log(`📊 Gefundene Executions für Workflow: ${workflowExecs.length}\n`);
    
    // Finde laufende Executions
    const now = Date.now();
    const runningExecs = workflowExecs.filter(e => {
      // Prüfe ob finished === false ODER ob kein stoppedAt vorhanden ist UND recently gestartet
      const isNotFinished = e.finished === false;
      const hasNoStopTime = !e.stoppedAt;
      const recentlyStarted = e.startedAt && (now - new Date(e.startedAt).getTime() < 3600000); // < 1 Stunde
      
      return isNotFinished || (hasNoStopTime && recentlyStarted);
    });
    
    if (runningExecs.length > 0) {
      console.log(`🟢 LAUFENDE EXECUTIONS GEFUNDEN: ${runningExecs.length}\n`);
      
      for (const exec of runningExecs.slice(0, 3)) {
        const duration = now - new Date(exec.startedAt).getTime();
        
        console.log(`📌 Execution ID: ${exec.id}`);
        console.log(`   Gestartet: ${new Date(exec.startedAt).toLocaleString()}`);
        console.log(`   Laufzeit: ${formatTime(duration)}`);
        console.log(`   Finished: ${exec.finished}`);
        console.log(`   Stopped At: ${exec.stoppedAt || 'NICHT BEENDET'}\n`);
        
        // Hole Details
        try {
          const execDetails = await n8nRequest(`/api/v1/executions/${exec.id}`);
          
          if (execDetails && execDetails.data) {
            const runData = execDetails.data.resultData?.runData || {};
            const nodeNames = Object.keys(runData);
            
            console.log(`   📊 Nodes ausgeführt: ${nodeNames.length}`);
            
            // Finde Nodes die gerade laufen
            const runningNodes = [];
            const finishedNodes = [];
            
            nodeNames.forEach(nodeName => {
              const nodeData = runData[nodeName];
              if (Array.isArray(nodeData)) {
                nodeData.forEach(exec => {
                  if (exec.startTime) {
                    if (!exec.stoppedAt && exec.executionTime === undefined) {
                      const nodeDuration = now - new Date(exec.startTime).getTime();
                      runningNodes.push({ name: nodeName, duration: nodeDuration, startTime: exec.startTime });
                    } else if (exec.stoppedAt) {
                      finishedNodes.push({ name: nodeName, stoppedAt: exec.stoppedAt });
                    }
                  }
                });
              }
            });
            
            if (runningNodes.length > 0) {
              console.log(`\n   🟡 NODES DIE GERADE LAUFEN:\n`);
              runningNodes.forEach(node => {
                const runTime = formatTime(node.duration);
                console.log(`      ⏳ ${node.name}`);
                console.log(`         Läuft seit: ${runTime}`);
                
                if (node.duration > 60000) {
                  console.log(`         ⚠️  WARNUNG: Läuft bereits sehr lange!`);
                }
                console.log();
              });
            }
            
            if (finishedNodes.length > 0) {
              finishedNodes.sort((a, b) => new Date(b.stoppedAt) - new Date(a.stoppedAt));
              console.log(`   ✅ Letzte abgeschlossene Nodes:\n`);
              finishedNodes.slice(0, 3).forEach(node => {
                console.log(`      ${node.name}`);
              });
              console.log();
            }
          }
        } catch (e) {
          console.log(`   ⚠️  Konnte Details nicht abrufen: ${e.message}\n`);
        }
        
        console.log('   ' + '-'.repeat(76) + '\n');
      }
    } else {
      console.log('⚠️  KEINE LAUFENDEN EXECUTIONS GEFUNDEN\n');
      
      // Zeige die neuesten Executions
      if (workflowExecs.length > 0) {
        console.log('📋 NEUESTE EXECUTIONS:\n');
        workflowExecs.slice(0, 5).forEach(exec => {
          const status = exec.finished === false ? '🟢 RUNNING' : exec.stoppedAt ? '✅ FINISHED' : '❌ ERROR';
          const duration = exec.stoppedAt ? 
            new Date(exec.stoppedAt) - new Date(exec.startedAt) :
            Date.now() - new Date(exec.startedAt);
          
          console.log(`   ${status} ID: ${exec.id}`);
          console.log(`      Gestartet: ${new Date(exec.startedAt).toLocaleString()}`);
          console.log(`      Dauer: ${formatTime(duration)}`);
          if (exec.stoppedAt) {
            console.log(`      Beendet: ${new Date(exec.stoppedAt).toLocaleString()}`);
          }
          console.log();
        });
      }
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

findRunningExecution();
