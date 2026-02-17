#!/bin/bash
# Daily backup script for OpenClaw workspace
# Run via cron: 0 2 * * * /Users/openclaw-megatron/.openclaw/workspace/scripts/daily-backup.sh

BACKUP_DIR="$HOME/backups/openclaw-workspace"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
SOURCE_DIR="$HOME/.openclaw/workspace"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create dated backup folder
mkdir -p "$BACKUP_DIR/$DATE"

# Backup workspace (excluding node_modules, .git, and large files)
echo "Starting backup at $(date)"
rsync -av --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude 'Trash' \
    "$SOURCE_DIR/" "$BACKUP_DIR/$DATE/workspace"

# Create latest symlink
rm -f "$BACKUP_DIR/latest"
ln -s "$BACKUP_DIR/$DATE" "$BACKUP_DIR/latest"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -maxdepth 1 -type d -name "????-??-??" -mtime +7 -exec rm -rf {} \;

echo "Backup completed at $(date)"
echo "Backup location: $BACKUP_DIR/$DATE"
