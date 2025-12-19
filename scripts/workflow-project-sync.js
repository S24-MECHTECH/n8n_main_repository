#!/usr/bin/env node
/**
 * WORKFLOW-PROJEKT SYNC - PERMANENTER ABGLEICH ZU CURSOR
 * 
 * Läuft kontinuierlich und hält Verbindung zu Cursor aktiv
 * Sync: cursor-status-live.json <-> Workflow-Projekt-Struktur
 * 
 * Jeder Workflow = Ein Projekt
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WORKFLOW_ID = 'ftZOou7HNgLOwzE5';
const WORKFLOW_NAME = 'MERCHANT_CENTER_ADMIN';
const REPO_DIR = path.join(__dirname, '..');
const STATUS_FILE = path.join(REPO_DIR, 'cursor-status-live.json');
const PROJECT_DIR = path.join(REPO_DIR, 'projects', WORKFLOW_ID);
const PROJECT_STATUS_FILE = path.join(PROJECT_DIR, 'status.json');
const PROJECT_CONFIG_FILE = path.join(PROJECT_DIR, 'config.json');
const SESSIONS_DIR = path.join(PROJECT_DIR, 'sessions');
const SYNC_INTERVAL = 5 * 1000; // 5 Sekunden

/**
 * Initialisiere Projekt-Struktur
 */
function initProjectStructure() {
  if (!fs.existsSync(PROJECT_DIR)) {
    fs.mkdirSync(PROJECT_DIR, { recursive: true });
  }
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
  
  // Projekt-Config erstellen falls nicht vorhanden
  if (!fs.existsSync(PROJECT_CONFIG_FILE)) {
    const config = {
      workflow_id: WORKFLOW_ID,
      workflow_name: WORKFLOW_NAME,
      created: new Date().toISOString(),
      description: 'Workflow-Projekt für permanenten Cursor-Abgleich',
      cursor_sync: {
        enabled: true,
        status_file: 'cursor-status-live.json',
        sync_interval: SYNC_INTERVAL
      }
    };
    fs.writeFileSync(PROJECT_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  }
}

/**
 * Lade aktuellen Status aus cursor-status-live.json
 */
function loadCursorStatus() {
  if (fs.existsSync(STATUS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Speichere Status in Projekt-Struktur
 */
function saveProjectStatus(cursorStatus) {
  const projectStatus = {
    workflow_id: WORKFLOW_ID,
    workflow_name: WORKFLOW_NAME,
    timestamp: new Date().toISOString(),
    cursor_sync: {
      last_sync: new Date().toISOString(),
      status_file: 'cursor-status-live.json',
      status_source: 'cursor'
    },
    current_status: cursorStatus || {
      status: 'unknown',
      message: 'No status from cursor'
    },
    sync_active: true
  };
  
  fs.writeFileSync(PROJECT_STATUS_FILE, JSON.stringify(projectStatus, null, 2), 'utf8');
}

/**
 * Finde aktuelle Session oder erstelle neue
 */
function getCurrentSession() {
  const sessionFiles = fs.existsSync(SESSIONS_DIR) 
    ? fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'))
    : [];
  
  // Suche aktive Session (end_time = null)
  for (const file of sessionFiles) {
    const sessionPath = path.join(SESSIONS_DIR, file);
    try {
      const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
      if (session.status === 'active' && !session.end_time) {
        return { session, file };
      }
    } catch (e) {
      // Ignore errors
    }
  }
  
  // Erstelle neue Session
  const sessionId = `session_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}_${Date.now()}`;
  const session = {
    session_id: sessionId,
    workflow_id: WORKFLOW_ID,
    workflow_name: WORKFLOW_NAME,
    start_time: new Date().toISOString(),
    end_time: null,
    status: 'active',
    tasks: [],
    changes: {
      workflow_hash: null,
      files_changed: [],
      commits: []
    },
    cursor_sync: {
      last_read: new Date().toISOString(),
      last_written: null,
      status_file: 'cursor-status-live.json'
    }
  };
  
  const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`);
  fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2), 'utf8');
  
  return { session, file: `${sessionId}.json` };
}

/**
 * Update Session mit aktuellem Status
 */
function updateSession(sessionInfo, cursorStatus) {
  if (!sessionInfo) return;
  
  const { session, file } = sessionInfo;
  const sessionPath = path.join(SESSIONS_DIR, file);
  
  // Update last_read
  session.cursor_sync.last_read = new Date().toISOString();
  
  // Wenn Status sich geändert hat, als Task hinzufügen
  if (cursorStatus && cursorStatus.current_task) {
    const lastTask = session.tasks[session.tasks.length - 1];
    if (!lastTask || lastTask.task !== cursorStatus.current_task) {
      session.tasks.push({
        task: cursorStatus.current_task,
        status: cursorStatus.status || 'running',
        timestamp: cursorStatus.timestamp || new Date().toISOString(),
        result: cursorStatus.findings || 'Status updated'
      });
    }
  }
  
  // Update session status basierend auf cursor status
  if (cursorStatus) {
    if (cursorStatus.status === 'ERROR') {
      session.status = 'error';
    } else if (cursorStatus.status === 'DONE' || cursorStatus.status === 'COMPLETE') {
      // Session bleibt aktiv, aber markiere letzte Aufgabe als done
      if (session.tasks.length > 0) {
        session.tasks[session.tasks.length - 1].status = 'done';
      }
    }
  }
  
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf8');
}

/**
 * Sync-Funktion (wird regelmäßig aufgerufen)
 */
function sync() {
  try {
    // 1. Lade Cursor-Status
    const cursorStatus = loadCursorStatus();
    
    // 2. Speichere in Projekt-Struktur
    saveProjectStatus(cursorStatus);
    
    // 3. Update aktuelle Session
    const sessionInfo = getCurrentSession();
    updateSession(sessionInfo, cursorStatus);
    
    // 4. Log (optional, nur wenn Änderung)
    if (cursorStatus) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ✅ Sync: ${cursorStatus.status || 'unknown'} - ${cursorStatus.current_task || 'no task'}`);
    }
    
    return { success: true, cursorStatus, sessionId: sessionInfo?.session?.session_id };
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Sync error:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Starte kontinuierlichen Sync
 */
function startContinuousSync() {
  console.log('\n' + '='.repeat(100));
  console.log('🔄 WORKFLOW-PROJEKT SYNC - PERMANENTER ABGLEICH ZU CURSOR');
  console.log(`   Workflow: ${WORKFLOW_NAME} (${WORKFLOW_ID})`);
  console.log(`   Sync-Interval: ${SYNC_INTERVAL / 1000} Sekunden`);
  console.log('='.repeat(100) + '\n');
  
  // Initialisiere Struktur
  initProjectStructure();
  console.log('✅ Projekt-Struktur initialisiert\n');
  
  // Erster Sync sofort
  sync();
  
  // Dann regelmäßig
  const interval = setInterval(() => {
    sync();
  }, SYNC_INTERVAL);
  
  console.log('✅ Kontinuierlicher Sync gestartet');
  console.log('   Drücke Ctrl+C zum Beenden\n');
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stoppe Sync...');
    clearInterval(interval);
    
    // Schließe aktuelle Session
    const sessionInfo = getCurrentSession();
    if (sessionInfo && sessionInfo.session) {
      const session = sessionInfo.session;
      session.end_time = new Date().toISOString();
      session.status = 'completed';
      const sessionPath = path.join(SESSIONS_DIR, sessionInfo.file);
      fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf8');
    }
    
    console.log('✅ Sync gestoppt\n');
    process.exit(0);
  });
}

/**
 * Einmaliger Sync (für Script-Integration)
 */
function oneTimeSync() {
  initProjectStructure();
  return sync();
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const continuous = args.includes('--continuous');
  
  if (continuous) {
    startContinuousSync();
  } else {
    // Einmaliger Sync
    initProjectStructure();
    const result = sync();
    console.log(result.success ? '✅ Sync erfolgreich' : `❌ Sync fehlgeschlagen: ${result.error}`);
    process.exit(result.success ? 0 : 1);
  }
}

module.exports = { sync, oneTimeSync, initProjectStructure, getCurrentSession };
