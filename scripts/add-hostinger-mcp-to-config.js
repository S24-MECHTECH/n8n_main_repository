#!/usr/bin/env node
/**
 * ADD HOSTINGER MCP TO CONFIG
 * Fügt hostinger-mcp zur mcp.json hinzu (nach erfolgreichem Test)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HOSTINGER_API_TOKEN = 'Jce18ENasrd7NFL70O949P9mqXeQoS8NjSQt54qV3f81cbc6';

// Pfade zu beiden möglichen Config-Dateien
const MCP_CONFIG_PATHS = [
  path.join(__dirname, '..', '..', '.cursor', 'mcp.json'),
  path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
  path.join(process.env.USERPROFILE || process.env.HOME, '.cursor', 'mcp.json')
];

const hostingerMCPConfig = {
  "hostinger-mcp": {
    "command": "npx",
    "args": [
      "hostinger-api-mcp@latest"
    ],
    "env": {
      "API_TOKEN": HOSTINGER_API_TOKEN
    }
  }
};

function addHostingerMCPToConfig() {
  console.log('\n' + '='.repeat(80));
  console.log('ADD HOSTINGER MCP TO CONFIG');
  console.log('='.repeat(80) + '\n');
  
  let configUpdated = false;
  
  for (const configPath of MCP_CONFIG_PATHS) {
    try {
      if (!fs.existsSync(configPath)) {
        console.log(`⏭️  Überspringe (nicht vorhanden): ${configPath}\n`);
        continue;
      }
      
      console.log(`📋 Verarbeite: ${configPath}\n`);
      
      // Lade aktuelle Config
      let config = {};
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configContent);
      } catch (e) {
        console.log(`   ⚠️  Konnte Config nicht lesen: ${e.message}\n`);
        continue;
      }
      
      // Initialisiere mcpServers falls nicht vorhanden
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
      
      // Prüfe ob hostinger-mcp bereits existiert
      if (config.mcpServers['hostinger-mcp']) {
        console.log('   ⚠️  hostinger-mcp existiert bereits!\n');
        console.log('   Aktuelle Config:');
        console.log(JSON.stringify(config.mcpServers['hostinger-mcp'], null, 2));
        console.log('');
        
        // Frage ob überschrieben werden soll
        console.log('   💡 Überschreiben? (Update API_TOKEN)\n');
        // In Production: könnte User-Input abfragen, hier: überschreiben
      }
      
      // Füge/Update hostinger-mcp
      config.mcpServers['hostinger-mcp'] = hostingerMCPConfig['hostinger-mcp'];
      
      // Speichere Config
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      console.log(`   ✅ Config aktualisiert: ${configPath}\n`);
      
      configUpdated = true;
      
      // Zeige aktualisierte Config
      console.log('   Aktualisierte mcpServers:');
      console.log(JSON.stringify(config.mcpServers, null, 2));
      console.log('');
      
    } catch (error) {
      console.error(`   ❌ Fehler bei ${configPath}: ${error.message}\n`);
    }
  }
  
  // REPORT
  console.log('='.repeat(80));
  console.log('REPORT');
  console.log('='.repeat(80) + '\n');
  
  if (configUpdated) {
    console.log('✅ HOSTINGER MCP CONFIG HINZUGEFÜGT:\n');
    console.log('   Server: hostinger-mcp');
    console.log('   Command: npx hostinger-api-mcp@latest');
    console.log('   API_TOKEN: [gesetzt]\n');
    
    console.log('📋 NÄCHSTE SCHRITTE:\n');
    console.log('   1. Cursor/Claude Desktop vollständig NEU STARTEN');
    console.log('   2. Warten 10-30 Sekunden');
    console.log('   3. Prüfen ob hostinger-mcp Server grün wird');
    console.log('   4. Tools verfügbar: list_mcp_resources()\n');
    
    console.log('⚠️  WICHTIG:\n');
    console.log('   - Neustart ist ERFORDERLICH damit MCP Server geladen wird');
    console.log('   - Package wird beim ersten Start installiert (30-60 Sekunden)');
    console.log('   - API_TOKEN ist in Config gespeichert\n');
  } else {
    console.log('❌ KEINE CONFIG AKTUALISIERT\n');
    console.log('   Prüfe ob Config-Dateien existieren\n');
  }
  
  console.log('='.repeat(80) + '\n');
  
  return configUpdated;
}

if (require.main === module) {
  const success = addHostingerMCPToConfig();
  process.exit(success ? 0 : 1);
}

module.exports = { addHostingerMCPToConfig };
