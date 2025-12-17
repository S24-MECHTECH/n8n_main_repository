/**
 * ANALYZE CURRENT EXECUTION
 * Analysiert die aktuelle laufende Execution im Detail
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

async function analyzeCurrentExecution() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 AKTUELLE EXECUTION ANALYSIEREN');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Hole die neueste Execution
    const allExecutions = await n8nRequest('/api/v1/executions?limit=20');
    const executions = allExecutions.data || allExecutions.results || [];
    const workflowExecs = executions.filter(e => e.workflowId === WORKFLOW_ID);
    
    if (workflowExecs.length === 0) {
      console.log('⚠️  Keine Executions gefunden für diesen Workflow!\n');
      return;
    }
    
    // Finde die neueste (laufende oder kürzlich beendete)
    const latest = workflowExecs[0];
    const execDetails = await getExecutionDetails(latest.id);
    
    if (!execDetails) {
      console.log('❌ Konnte Execution-Details nicht abrufen!\n');
      return;
    }
    
    console.log(`📌 Execution ID: ${latest.id}`);
    console.log(`   Status: ${latest.finished === false ? '🟢 RUNNING' : latest.stoppedAt ? '✅ FINISHED' : '❌ ERROR'}`);
    console.log(`   Gestartet: ${new Date(latest.startedAt).toLocaleString()}`);
    
    if (latest.stoppedAt) {
      const duration = new Date(latest.stoppedAt) - new Date(latest.startedAt);
      console.log(`   Beendet: ${new Date(latest.stoppedAt).toLocaleString()}`);
      console.log(`   Dauer: ${formatTime(duration)}\n`);
    } else {
      const duration = Date.now() - new Date(latest.startedAt).getTime();
      console.log(`   Laufzeit: ${formatTime(duration)} (läuft noch...)\n`);
    }
    
    // Analysiere Node-Daten
    const runData = execDetails.data?.resultData?.runData || {};
    const nodeNames = Object.keys(runData);
    
    if (nodeNames.length === 0) {
      console.log('⚠️  Keine Node-Daten gefunden!\n');
      return;
    }
    
    console.log('📊 NODE-ANALYSE:\n');
    
    // Finde Nodes die gerade laufen (ohne stoppedAt)
    const runningNodes = [];
    const finishedNodes = [];
    
    nodeNames.forEach(nodeName => {
      const nodeData = runData[nodeName];
      if (Array.isArray(nodeData)) {
        nodeData.forEach(exec => {
          if (exec.startTime) {
            if (!exec.stoppedAt) {
              // Node läuft noch
              const duration = Date.now() - new Date(exec.startTime).getTime();
              runningNodes.push({
                name: nodeName,
                startTime: exec.startTime,
                duration: duration
              });
            } else {
              // Node ist fertig
              finishedNodes.push({
                name: nodeName,
                startTime: exec.startTime,
                stoppedAt: exec.stoppedAt,
                executionTime: exec.executionTime
              });
            }
          }
        });
      }
    });
    
    // Zeige Nodes die gerade laufen
    if (runningNodes.length > 0) {
      console.log('🟡 NODES DIE GERADE LAUFEN (HIER HÄNGT DER WORKFLOW):\n');
      runningNodes.forEach(node => {
        const runTime = formatTime(node.duration);
        console.log(`   ⏳ ${node.name}`);
        console.log(`      Läuft seit: ${runTime}`);
        console.log(`      Start: ${new Date(node.startTime).toLocaleTimeString()}`);
        
        // Warnung wenn sehr lange
        if (node.duration > 60000) { // > 1 Minute
          console.log(`      ⚠️  WARNUNG: Läuft bereits sehr lange!`);
        }
        console.log();
      });
    } else {
      console.log('✅ Keine Nodes laufen aktuell (Workflow wartet oder beendet)\n');
    }
    
    // Zeige die letzten abgeschlossenen Nodes
    if (finishedNodes.length > 0) {
      console.log('✅ LETZTE ABGESCHLOSSENE NODES (die letzten 5):\n');
      
      // Sortiere nach stoppedAt (neueste zuerst)
      finishedNodes.sort((a, b) => new Date(b.stoppedAt) - new Date(a.stoppedAt));
      
      finishedNodes.slice(0, 5).forEach(node => {
        const duration = formatTime(node.executionTime);
        console.log(`   ${node.name}`);
        console.log(`      Dauer: ${duration}`);
        console.log(`      Beendet: ${new Date(node.stoppedAt).toLocaleTimeString()}\n`);
      });
    }
    
    // Zeige alle Nodes mit Status
    console.log(`📋 ALLE AUSGEFÜHRTEN NODES (${nodeNames.length}):\n`);
    nodeNames.slice(0, 15).forEach(name => {
      const nodeData = runData[name];
      if (nodeData && Array.isArray(nodeData) && nodeData.length > 0) {
        const lastExec = nodeData[nodeData.length - 1];
        const status = lastExec.stoppedAt ? '✅' : '🟡';
        const duration = lastExec.executionTime ? formatTime(lastExec.executionTime) : 
                        (lastExec.startTime ? formatTime(Date.now() - new Date(lastExec.startTime).getTime()) + ' (läuft)' : 'N/A');
        console.log(`   ${status} ${name}`);
        console.log(`      ${duration}`);
        
        // Zeige Fehler wenn vorhanden
        if (lastExec.error) {
          console.log(`      ❌ FEHLER: ${JSON.stringify(lastExec.error).substring(0, 200)}`);
        }
        console.log();
      }
    });
    
    if (nodeNames.length > 15) {
      console.log(`   ... und ${nodeNames.length - 15} weitere Nodes\n`);
    }
    
    // Prüfe auf globale Fehler
    if (execDetails.data?.resultData?.error) {
      console.log('\n❌ GLOBALER FEHLER GEFUNDEN:\n');
      console.log(JSON.stringify(execDetails.data.resultData.error, null, 2));
      console.log();
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

async function getExecutionDetails(executionId) {
  try {
    return await n8nRequest(`/api/v1/executions/${executionId}`);
  } catch (error) {
    return null;
  }
}

analyzeCurrentExecution();
