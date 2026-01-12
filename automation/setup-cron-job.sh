#!/bin/bash
#
# SETUP CRON JOB
# Richtet Cron Job ein für tägliche Workflow-Fixes (alle 6 Stunden)
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WRAPPER_SCRIPT="$SCRIPT_DIR/fix-workflow-with-github-status.js"

# Prüfe ob Script existiert
if [ ! -f "$WRAPPER_SCRIPT" ]; then
    echo "❌ ERROR: $WRAPPER_SCRIPT nicht gefunden!"
    exit 1
fi

# Mache Script ausführbar
chmod +x "$WRAPPER_SCRIPT"

# Cron Job Eintrag (alle 6 Stunden)
CRON_ENTRY="0 */6 * * * cd $SCRIPT_DIR && node $WRAPPER_SCRIPT >> /var/log/workflow-fix.log 2>&1"

# Prüfe ob Cron Job bereits existiert
if crontab -l 2>/dev/null | grep -q "fix-workflow-with-github-status.js"; then
    echo "⚠️  Cron Job existiert bereits!"
    echo "   Aktueller Eintrag:"
    crontab -l | grep "fix-workflow-with-github-status.js"
    echo ""
    read -p "Überschreiben? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Abgebrochen."
        exit 0
    fi
    
    # Entferne alten Eintrag
    crontab -l | grep -v "fix-workflow-with-github-status.js" | crontab -
fi

# Füge neuen Cron Job hinzu
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✅ Cron Job eingerichtet:"
echo "   $CRON_ENTRY"
echo ""
echo "📋 Nächste Ausführungen:"
crontab -l | grep "fix-workflow-with-github-status.js"
echo ""
echo "📝 Logs: /var/log/workflow-fix.log"
echo ""


