#!/bin/bash
PROJECT_DIR="/workspaces/corpflow-ai-command-center"
cd $PROJECT_DIR

# Run Sync with explicit Python path
/usr/bin/python3 $PROJECT_DIR/core/engine/sync_sheets.py >> $PROJECT_DIR/heartbeat.log 2>&1

# Update the Auditor
./auditor.sh >> $PROJECT_DIR/heartbeat.log 2>&1

echo "💓 Heartbeat manual pulse at $(date)" >> $PROJECT_DIR/heartbeat.log
