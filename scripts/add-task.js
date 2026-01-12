/**
 * ADD TASK - Fügt Task zu cursor-tasks.json hinzu
 * Usage: node add-task.js <type> <command>
 * Beispiel: node add-task.js deploy-connections "node scripts/auto-deploy-connections.js"
 */

const fs = require('fs');
const path = require('path');

const TASKS_FILE = path.join(__dirname, '..', 'claude-outputs', 'cursor-tasks.json');

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
    const dir = path.dirname(TASKS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TASKS_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Fehler beim Speichern: ${error.message}`);
    return false;
  }
}

function addTask(type, command) {
  const data = loadTasks();
  
  const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const newTask = {
    id: taskId,
    status: 'PENDING',
    type: type,
    command: command,
    created: new Date().toISOString(),
    completed: null,
    error: null
  };
  
  data.tasks.push(newTask);
  
  // Aktualisiere Metadata
  const pendingTasks = data.tasks.filter(t => t.status === 'PENDING').length;
  data.metadata.activeTasks = pendingTasks;
  
  if (saveTasks(data)) {
    console.log(`✅ Task hinzugefuegt: ${taskId}`);
    console.log(`   Type: ${type}`);
    console.log(`   Command: ${command}`);
    return true;
  } else {
    console.error('❌ Fehler beim Hinzufuegen des Tasks');
    return false;
  }
}

// Command Line Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node add-task.js <type> <command>');
    console.log('');
    console.log('Beispiele:');
    console.log('  node add-task.js deploy-connections "node scripts/auto-deploy-connections.js"');
    console.log('  node add-task.js update-gemini "node scripts/update-gemini-json-handlers.js"');
    process.exit(1);
  }
  
  const type = args[0];
  const command = args.slice(1).join(' ');
  
  addTask(type, command);
}

module.exports = { addTask };
