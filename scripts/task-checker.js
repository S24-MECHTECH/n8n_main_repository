/**
 * TASK CHECKER - Auto-Task-System
 * Prüft cursor-tasks.json alle 30 Sekunden
 * Prüft GitHub Tasks von Claude
 * Führt PENDING Tasks aus
 * Markiert als DONE/ERROR
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const TASKS_FILE = path.join(__dirname, '..', 'claude-outputs', 'cursor-tasks.json');
const GITHUB_TASKS_FILE = path.join(__dirname, '..', '.github', 'claude-tasks.json');
const GITHUB_TASKS_FILE_ALT = path.join(__dirname, '..', 'claude-outputs', 'github-tasks.json');
const CHECK_INTERVAL = 30000; // 30 Sekunden

// GitHub Config (aus Repository-Struktur oder env)
const GITHUB_REPO = process.env.GITHUB_REPO || 'S24-MECHTECH/n8n_main_repository';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

function loadTasks() {
  try {
    if (!fs.existsSync(TASKS_FILE)) {
      return {
        tasks: [],
        metadata: {
          lastCheck: null,
          activeTasks: 0,
          completedTasks: 0,
          errorTasks: 0
        }
      };
    }
    return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
  } catch (error) {
    console.error(`Fehler beim Laden von Tasks: ${error.message}`);
    return {
      tasks: [],
      metadata: {
        lastCheck: null,
        activeTasks: 0,
        completedTasks: 0,
        errorTasks: 0
      }
    };
  }
}

function saveTasks(data) {
  try {
    // Stelle sicher dass Verzeichnis existiert
    const dir = path.dirname(TASKS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(TASKS_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Fehler beim Speichern von Tasks: ${error.message}`);
    return false;
  }
}

async function executeTask(task) {
  console.log(`\n[${new Date().toISOString()}] Task ausfuehren: ${task.id} (${task.type})`);
  console.log(`Command: ${task.command}`);
  
  try {
    const { stdout, stderr } = await execAsync(task.command, {
      cwd: path.join(__dirname, '..'),
      maxBuffer: 10 * 1024 * 1024 // 10MB
    });
    
    if (stdout) {
      console.log(`STDOUT: ${stdout.substring(0, 500)}...`);
    }
    
    if (stderr) {
      console.log(`STDERR: ${stderr.substring(0, 500)}...`);
    }
    
    // Task als DONE markieren
    task.status = 'DONE';
    task.completed = new Date().toISOString();
    task.error = null;
    
    console.log(`✅ Task ${task.id} erfolgreich abgeschlossen`);
    
    return true;
  } catch (error) {
    console.error(`❌ Task ${task.id} fehlgeschlagen: ${error.message}`);
    
    // Task als ERROR markieren
    task.status = 'ERROR';
    task.completed = new Date().toISOString();
    task.error = error.message;
    
    return false;
  }
}

function updateMetadata(data) {
  const pendingTasks = data.tasks.filter(t => t.status === 'PENDING').length;
  const doneTasks = data.tasks.filter(t => t.status === 'DONE').length;
  const errorTasks = data.tasks.filter(t => t.status === 'ERROR').length;
  
  data.metadata = {
    lastCheck: new Date().toISOString(),
    activeTasks: pendingTasks,
    completedTasks: doneTasks,
    errorTasks: errorTasks,
    lastGitHubCheck: data.metadata?.lastGitHubCheck || null
  };
  
  return data;
}

async function checkGitHubTasks() {
  try {
    // 1. Git pull um neueste Änderungen zu holen
    const repoPath = path.join(__dirname, '..');
    try {
      await execAsync('git pull', { cwd: repoPath, timeout: 10000 });
    } catch (error) {
      // Git pull kann fehlschlagen (kein repo, keine connection, etc.)
      // Nicht kritisch, fahre mit lokalen Dateien fort
    }
    
    // 2. Prüfe verschiedene mögliche GitHub Tasks Dateien
    const possibleFiles = [
      GITHUB_TASKS_FILE,
      GITHUB_TASKS_FILE_ALT,
      path.join(__dirname, '..', '.github', 'github-tasks.json'),
      path.join(__dirname, '..', 'github-tasks.json')
    ];
    
    let githubTasks = [];
    for (const filePath of possibleFiles) {
      if (fs.existsSync(filePath)) {
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (Array.isArray(content)) {
            githubTasks = content;
          } else if (content.tasks && Array.isArray(content.tasks)) {
            githubTasks = content.tasks;
          }
          if (githubTasks.length > 0) {
            console.log(`   GitHub Tasks gefunden in: ${path.basename(filePath)} (${githubTasks.length} Tasks)`);
            break;
          }
        } catch (error) {
          // Datei existiert aber JSON ist ungültig, überspringe
        }
      }
    }
    
    return githubTasks;
  } catch (error) {
    console.log(`   GitHub Tasks Check: ${error.message}`);
    return [];
  }
}

function mergeTasks(localTasks, githubTasks) {
  // GitHub Tasks haben Vorrang - überschreiben lokale Tasks
  const merged = [];
  const githubTaskIds = new Set();
  const localTaskMap = new Map(localTasks.map(t => [t.id, t]));
  
  // 1. Füge alle GitHub Tasks hinzu (haben Vorrang)
  for (const githubTask of githubTasks) {
    if (githubTask.status === 'PENDING' || githubTask.status === 'IN_PROGRESS') {
      const task = {
        ...githubTask,
        source: 'github',
        created: githubTask.created || new Date().toISOString()
      };
      merged.push(task);
      githubTaskIds.add(githubTask.id);
      
      if (localTaskMap.has(githubTask.id)) {
        console.log(`   GitHub Task überschreibt lokale Task: ${githubTask.id} (${githubTask.type})`);
      } else {
        console.log(`   Neue GitHub Task hinzugefügt: ${githubTask.id} (${githubTask.type})`);
      }
    }
  }
  
  // 2. Füge lokale Tasks hinzu, die nicht von GitHub überschrieben wurden
  for (const localTask of localTasks) {
    if (!githubTaskIds.has(localTask.id)) {
      // Behalte lokale Tasks, die nicht DONE oder ERROR sind
      if (localTask.status === 'PENDING' || localTask.status === 'IN_PROGRESS') {
        merged.push(localTask);
      }
      // DONE/ERROR Tasks behalten (für Historie)
      else if (localTask.status === 'DONE' || localTask.status === 'ERROR') {
        merged.push(localTask);
      }
    }
  }
  
  return merged;
}

async function checkAndExecuteTasks() {
  const data = loadTasks();
  
  // 1. Prüfe GitHub Tasks von Claude (haben immer Vorrang!)
  console.log(`[${new Date().toISOString()}] Prüfe GitHub Tasks von Claude...`);
  const githubTasks = await checkGitHubTasks();
  
  if (githubTasks.length > 0) {
    console.log(`   ${githubTasks.length} GitHub Task(s) gefunden - werden ausgeführt!`);
    // Merge GitHub Tasks mit lokalen Tasks (GitHub Tasks haben Vorrang)
    data.tasks = mergeTasks(data.tasks, githubTasks);
    data.metadata.lastGitHubCheck = new Date().toISOString();
    saveTasks(data);
  } else {
    console.log(`   Keine GitHub Tasks gefunden`);
  }
  
  // 2. Finde PENDING oder IN_PROGRESS Tasks (IN_PROGRESS = wahrscheinlich abgebrochen)
  const pendingTasks = data.tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
  
  if (pendingTasks.length === 0) {
    console.log(`[${new Date().toISOString()}] Keine PENDING Tasks gefunden`);
    data.metadata.lastCheck = new Date().toISOString();
    saveTasks(data);
    return;
  }
  
  console.log(`\n[${new Date().toISOString()}] ${pendingTasks.length} Task(s) gefunden (PENDING/IN_PROGRESS)`);
  
  // Führe erste Task aus (PENDING hat Priorität, dann IN_PROGRESS)
  const taskToRun = pendingTasks.find(t => t.status === 'PENDING') || pendingTasks[0];
  const taskIndex = data.tasks.findIndex(t => t.id === taskToRun.id);
  const task = data.tasks[taskIndex];
  
  // Markiere als IN_PROGRESS
  task.status = 'IN_PROGRESS';
  task.started = new Date().toISOString();
  saveTasks(data);
  
  // Führe Task aus (übergib Referenz für direkte Modifikation)
  await executeTask(task, task);
  
  // Task wurde bereits in executeTask modifiziert, speichere direkt
  const finalData = updateMetadata(data);
  saveTasks(finalData);
  
  console.log(`\n[${new Date().toISOString()}] Task Check abgeschlossen`);
  console.log(`   Aktive Tasks: ${finalData.metadata.activeTasks}`);
  console.log(`   Erledigte Tasks: ${finalData.metadata.completedTasks}`);
  console.log(`   Fehlerhafte Tasks: ${finalData.metadata.errorTasks}`);
}

async function startTaskChecker() {
  console.log('='.repeat(80));
  console.log('TASK CHECKER GESTARTET');
  console.log('='.repeat(80));
  console.log(`Tasks File: ${TASKS_FILE}`);
  console.log(`GitHub Tasks: ${GITHUB_TASKS_FILE} (oder Alternativen)`);
  console.log(`Check Interval: ${CHECK_INTERVAL / 1000} Sekunden (GitHub Tasks von Claude)`);
  console.log(`GitHub Repo: ${GITHUB_REPO} (${GITHUB_BRANCH})`);
  console.log('Druecke Ctrl+C zum Beenden\n');
  
  // Erste Prüfung sofort
  await checkAndExecuteTasks();
  
  // Dann alle 30 Sekunden (GitHub Tasks von Claude)
  setInterval(async () => {
    await checkAndExecuteTasks();
  }, CHECK_INTERVAL);
}

// Graceful Shutdown
process.on('SIGINT', () => {
  console.log('\n\nTask Checker wird beendet...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nTask Checker wird beendet...');
  process.exit(0);
});

// Start Task Checker
if (require.main === module) {
  startTaskChecker().catch(error => {
    console.error(`Fataler Fehler: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { 
  checkAndExecuteTasks, 
  loadTasks, 
  saveTasks, 
  executeTask,
  checkGitHubTasks,
  mergeTasks
};
