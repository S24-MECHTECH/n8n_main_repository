/**
 * MONITOR WORKFLOW EXECUTION
 * Überwacht einen laufenden Workflow und zeigt wo er hängt
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

async function findRunningExecutions() {
  try {
    const allExecutions = await n8nRequest('/api/v1/executions?limit=100');
    const executions = allExecutions.data || allExecutions.results || [];
    
    return executions.filter(exec => 
      exec.workflowId === WORKFLOW_ID && 
      (exec.finished === false || ['running', 'waiting', 'new'].includes(exec.mode))
    );
  } catch (error) {
    console.error('Fehler beim Abrufen der Executions:', error.message);
    return [];
  }
}

async function getExecutionDetails(executionId) {
  try {
    return await n8nRequest(`/api/v1/executions/${executionId}`);
  } catch (error) {
    return null;
  }
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

function getNodeStatus(executionData) {
  if (!executionData || !executionData.data) return null;
  
  const nodes = executionData.data.resultData?.runData || {};
  const nodeNames = Object.keys(nodes);
  
  // Finde den letzten ausgeführten Node
  let lastNode = null;
  let lastTime = 0;
  
  nodeNames.forEach(nodeName => {
    const nodeData = nodes[nodeName];
    if (Array.isArray(nodeData) && nodeData.length > 0) {
      const lastExecution = nodeData[nodeData.length - 1];
      if (lastExecution.startTime && lastExecution.startTime > lastTime) {
        lastTime = lastExecution.startTime;
        lastNode = {
          name: nodeName,
          startTime: lastExecution.startTime,
          executionTime: lastExecution.executionTime,
          status: lastExecution.executionTime ? 'finished' : 'running',
          stoppedAt: lastExecution.stoppedAt
        };
      }
    }
  });
  
  // Finde Nodes die gerade laufen (ohne stoppedAt)
  const runningNodes = [];
  nodeNames.forEach(nodeName => {
    const nodeData = nodes[nodeName];
    if (Array.isArray(nodeData)) {
      nodeData.forEach(exec => {
        if (exec.startTime && !exec.stoppedAt && exec.executionTime === undefined) {
          runningNodes.push({
            name: nodeName,
            startTime: exec.startTime,
            duration: Date.now() - new Date(exec.startTime).getTime()
          });
        }
      });
    }
  });
  
  return {
    lastNode,
    runningNodes,
    allNodes: nodeNames
  };
}

async function monitorWorkflow() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 WORKFLOW EXECUTION MONITOR');
  console.log('='.repeat(80) + '\n');
  console.log(`📌 Workflow ID: ${WORKFLOW_ID}\n`);
  
  let lastStatus = null;
  let checkCount = 0;
  const maxChecks = 300; // Max 5 Minuten (300 * 1 Sekunde)
  
  while (checkCount < maxChecks) {
    try {
      // Finde laufende Executions
      const runningExecs = await findRunningExecutions();
      
      if (runningExecs.length === 0) {
        if (checkCount === 0) {
          console.log('⚠️  Keine laufenden Executions gefunden!\n');
          console.log('💡 Mögliche Ursachen:');
          console.log('   - Workflow wurde noch nicht gestartet');
          console.log('   - Workflow ist bereits beendet');
          console.log('   - Workflow ist fehlgeschlagen\n');
          console.log('📋 Warten auf neue Execution... (drücken Sie Strg+C zum Abbrechen)\n');
        }
        
        // Prüfe auf die neueste Execution (auch wenn beendet)
        try {
          const allExecutions = await n8nRequest('/api/v1/executions?limit=10');
          const executions = allExecutions.data || allExecutions.results || [];
          const workflowExecs = executions.filter(e => e.workflowId === WORKFLOW_ID);
          
          if (workflowExecs.length > 0) {
            const latest = workflowExecs[0];
            const status = latest.finished === false ? 'running' : (latest.stoppedAt ? 'finished' : 'error');
            const execDetails = await getExecutionDetails(latest.id);
            
            if (execDetails) {
              const nodeStatus = getNodeStatus(execDetails);
              
              console.log(`📊 Letzte Execution (${status}):`);
              console.log(`   ID: ${latest.id}`);
              console.log(`   Gestartet: ${new Date(latest.startedAt).toLocaleString()}`);
              
              if (nodeStatus && nodeStatus.lastNode) {
                console.log(`   Letzter Node: ${nodeStatus.lastNode.name}`);
                console.log(`   Status: ${nodeStatus.lastNode.status}`);
              }
              
              if (latest.stoppedAt) {
                console.log(`   Beendet: ${new Date(latest.stoppedAt).toLocaleString()}`);
                break;
              }
            }
          }
        } catch (e) {
          // Ignore
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        checkCount++;
        continue;
      }
      
      // Überwache alle laufenden Executions
      for (const exec of runningExecs) {
        const execDetails = await getExecutionDetails(exec.id);
        
        if (!execDetails) continue;
        
        const nodeStatus = getNodeStatus(execDetails);
        const currentStatus = `${exec.id}-${execDetails.finished}`;
        
        // Zeige Update nur wenn sich etwas geändert hat
        if (currentStatus !== lastStatus) {
          console.clear();
          console.log('\n' + '='.repeat(80));
          console.log('🔍 WORKFLOW EXECUTION MONITOR');
          console.log('='.repeat(80) + '\n');
          
          console.log(`📌 Execution ID: ${exec.id}`);
          console.log(`   Status: ${exec.finished === false ? '🟢 RUNNING' : exec.stoppedAt ? '✅ FINISHED' : '❌ ERROR'}`);
          console.log(`   Gestartet: ${new Date(exec.startedAt).toLocaleString()}`);
          
          if (exec.stoppedAt) {
            const duration = new Date(exec.stoppedAt) - new Date(exec.startedAt);
            console.log(`   Dauer: ${formatTime(duration)}`);
            console.log(`   Beendet: ${new Date(exec.stoppedAt).toLocaleString()}\n`);
            continue;
          } else {
            const duration = Date.now() - new Date(exec.startedAt).getTime();
            console.log(`   Laufzeit: ${formatTime(duration)}\n`);
          }
          
          if (nodeStatus) {
            // Zeige Nodes die gerade laufen
            if (nodeStatus.runningNodes.length > 0) {
              console.log('🟡 NODES DIE GERADE LAUFEN:\n');
              nodeStatus.runningNodes.forEach(node => {
                const runTime = formatTime(node.duration);
                console.log(`   ⏳ ${node.name}`);
                console.log(`      Läuft seit: ${runTime}`);
                console.log(`      Start: ${new Date(node.startTime).toLocaleTimeString()}\n`);
              });
            }
            
            // Zeige letzten abgeschlossenen Node
            if (nodeStatus.lastNode && nodeStatus.lastNode.status === 'finished') {
              console.log('✅ LETZTER ABGESCHLOSSENER NODE:\n');
              console.log(`   ${nodeStatus.lastNode.name}`);
              console.log(`   Dauer: ${formatTime(nodeStatus.lastNode.executionTime)}`);
              console.log(`   Beendet: ${new Date(nodeStatus.lastNode.stoppedAt).toLocaleTimeString()}\n`);
            }
            
            // Zeige alle ausgeführten Nodes
            console.log(`📊 AUSGEFÜHRTE NODES (${nodeStatus.allNodes.length}):`);
            nodeStatus.allNodes.slice(0, 10).forEach(name => {
              const nodeData = execDetails.data.resultData.runData[name];
              if (nodeData && Array.isArray(nodeData) && nodeData.length > 0) {
                const lastExec = nodeData[nodeData.length - 1];
                const status = lastExec.stoppedAt ? '✅' : '🟡';
                const duration = lastExec.executionTime ? formatTime(lastExec.executionTime) : 'läuft...';
                console.log(`   ${status} ${name} (${duration})`);
              }
            });
            
            if (nodeStatus.allNodes.length > 10) {
              console.log(`   ... und ${nodeStatus.allNodes.length - 10} weitere\n`);
            } else {
              console.log();
            }
          }
          
          // Prüfe auf Fehler
          if (execDetails.data && execDetails.data.resultData && execDetails.data.resultData.error) {
            console.log('❌ FEHLER GEFUNDEN:\n');
            console.log(JSON.stringify(execDetails.data.resultData.error, null, 2));
            console.log();
          }
          
          lastStatus = currentStatus;
        }
      }
      
      // Prüfe ob alle Executions beendet sind
      const stillRunning = runningExecs.filter(e => !e.stoppedAt && e.finished === false);
      if (stillRunning.length === 0) {
        console.log('\n✅ Alle Executions sind beendet!\n');
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Update alle Sekunde
      checkCount++;
      
    } catch (error) {
      console.error('\n❌ FEHLER beim Monitoring:', error.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
      checkCount++;
    }
  }
  
  if (checkCount >= maxChecks) {
    console.log('\n⏱️  Monitoring-Zeit abgelaufen (5 Minuten)\n');
  }
  
  console.log('='.repeat(80) + '\n');
}

// Starte Monitoring
monitorWorkflow().catch(error => {
  console.error('\n❌ KRITISCHER FEHLER:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
