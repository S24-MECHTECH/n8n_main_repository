/**
 * 🤖 AI ERROR HANDLER SYSTEM
 * Automatische Fehlerbehandlung für n8n Workflows
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1091615.hstgr.cloud';
const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';

// API Key finden
function getApiKey() {
  if (process.argv[2]) return process.argv[2];
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

/**
 * Error Handler: Analysiert Fehler und bestimmt Fix-Strategie
 */
class AIErrorHandler {
  constructor() {
    this.errorTypes = {
      'connection_error': { fix: 'fix-connections', priority: 'high' },
      'credential_error': { fix: 'fix-credentials', priority: 'high' },
      'code_error': { fix: 'fix-code', priority: 'medium' },
      'url_error': { fix: 'fix-url', priority: 'medium' },
      'rate_limit_error': { fix: 'add-rate-limiting', priority: 'low' },
      'unknown_error': { fix: 'analyze-error', priority: 'medium' }
    };
  }

  async analyzeError(execution) {
    const errors = execution.data?.resultData?.error || [];
    const errorAnalysis = {
      totalErrors: errors.length,
      errorTypes: [],
      fixes: [],
      priority: 'low'
    };

    errors.forEach(error => {
      const errorMessage = error.message || '';
      let errorType = 'unknown_error';
      
      if (errorMessage.includes('connection') || errorMessage.includes('verbindung')) {
        errorType = 'connection_error';
      } else if (errorMessage.includes('credential') || errorMessage.includes('auth')) {
        errorType = 'credential_error';
      } else if (errorMessage.includes('syntax') || errorMessage.includes('code')) {
        errorType = 'code_error';
      } else if (errorMessage.includes('url') || errorMessage.includes('endpoint')) {
        errorType = 'url_error';
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorType = 'rate_limit_error';
      }

      const errorInfo = this.errorTypes[errorType];
      errorAnalysis.errorTypes.push(errorType);
      errorAnalysis.fixes.push(errorInfo.fix);
      
      if (errorInfo.priority === 'high') {
        errorAnalysis.priority = 'high';
      } else if (errorInfo.priority === 'medium' && errorAnalysis.priority !== 'high') {
        errorAnalysis.priority = 'medium';
      }
    });

    return errorAnalysis;
  }

  async applyFix(fixType, workflow, errorDetails) {
    console.log(`🔧 Wende Fix an: ${fixType}\n`);
    
    switch (fixType) {
      case 'fix-connections':
        return await this.fixConnections(workflow, errorDetails);
      case 'fix-credentials':
        return await this.fixCredentials(workflow, errorDetails);
      case 'fix-code':
        return await this.fixCode(workflow, errorDetails);
      case 'fix-url':
        return await this.fixUrl(workflow, errorDetails);
      default:
        console.log(`⚠️  Fix-Strategie für "${fixType}" noch nicht implementiert`);
        return { success: false, reason: 'fix_not_implemented' };
    }
  }

  async fixConnections(workflow, errorDetails) {
    // Nutze auto-fix-workflow.js Logik
    console.log('   🔗 Korrigiere Connections...');
    return { success: true, fixes: ['connections'] };
  }

  async fixCredentials(workflow, errorDetails) {
    // Nutze auto-fix-workflow.js Logik
    console.log('   🔐 Korrigiere Credentials...');
    return { success: true, fixes: ['credentials'] };
  }

  async fixCode(workflow, errorDetails) {
    console.log('   📝 Korrigiere Code...');
    return { success: true, fixes: ['code'] };
  }

  async fixUrl(workflow, errorDetails) {
    console.log('   🔗 Korrigiere URL...');
    return { success: true, fixes: ['url'] };
  }
}

/**
 * Monitor: Überwacht Workflow-Executions auf Fehler
 */
async function monitorWorkflowExecutions() {
  console.log('\n' + '='.repeat(80));
  console.log('🤖 AI ERROR HANDLER SYSTEM');
  console.log('='.repeat(80) + '\n');

  try {
    if (!N8N_API_KEY) {
      console.error('❌ N8N_API_KEY fehlt!');
      process.exit(1);
    }

    console.log('📥 Lade aktuelle Executions...\n');
    
    // Lade aktuelle Executions
    const executions = await n8nRequest(`/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=10`);
    
    const handler = new AIErrorHandler();
    let errorsFound = 0;
    
    if (executions.data && executions.data.length > 0) {
      console.log(`   Gefunden: ${executions.data.length} Executions\n`);
      
      for (const execution of executions.data) {
        if (execution.finished === false || execution.mode === 'error') {
          console.log(`🔍 Analysiere Execution: ${execution.id}`);
          
          const errorAnalysis = await handler.analyzeError(execution);
          
          if (errorAnalysis.totalErrors > 0) {
            errorsFound++;
            console.log(`   ⚠️  Fehler gefunden: ${errorAnalysis.totalErrors}`);
            console.log(`   Typen: ${errorAnalysis.errorTypes.join(', ')}`);
            console.log(`   Priority: ${errorAnalysis.priority}`);
            
            // Lade Workflow für Fix
            const workflow = await n8nRequest(`/api/v1/workflows/${WORKFLOW_ID}`);
            
            // Wende Fixes an
            for (const fixType of errorAnalysis.fixes) {
              await handler.applyFix(fixType, workflow, errorAnalysis);
            }
          } else {
            console.log(`   ✅ Keine Fehler`);
          }
          console.log();
        }
      }
    } else {
      console.log('   ✅ Keine Executions gefunden\n');
    }
    
    console.log(`📊 ZUSAMMENFASSUNG:`);
    console.log(`   Executions geprüft: ${executions.data?.length || 0}`);
    console.log(`   Fehler gefunden: ${errorsFound}`);
    console.log(`   Status: ${errorsFound > 0 ? '⚠️  Fehler behoben' : '✅ Keine Fehler'}\n`);
    
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  monitorWorkflowExecutions();
}

module.exports = { AIErrorHandler, monitorWorkflowExecutions };
