#!/bin/bash
set -e

# Configuration
BACKUP_DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="/tmp/threadstead-backup-$BACKUP_DATE"
NAS_HOST="nas-backup"  # SSH alias configured in ~/.ssh/config
NAS_PATH="/home/BACKUP_USER/backups/threadstead"
RETENTION_DAYS=30
ENCRYPTION_KEY_FILE="/opt/backup/.backup-encryption-key"

# Database config
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="YOUR_DB_NAME"
DB_USER="YOUR_DB_USER"
export PGPASSWORD="YOUR_DB_PASSWORD"

# Create temp backup directory
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting Threadstead backup..."

# 1. Backup PostgreSQL database
echo "[$(date)] Dumping database..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --format=custom \
  --file="$BACKUP_DIR/database.dump"

if [ $? -ne 0 ]; then
    echo "[$(date)] ERROR: Database backup failed!"
    rm -rf "$BACKUP_DIR"
    exit 1
fi

# 2. Backup system configs
echo "[$(date)] Backing up system configs..."
mkdir -p "$BACKUP_DIR/configs"

# Application .env file
if [ -f "$HOME/.env" ]; then
    cp "$HOME/.env" "$BACKUP_DIR/configs/"
fi

# Crontab
crontab -l > "$BACKUP_DIR/configs/crontab.txt" 2>/dev/null || true

# 3. Create manifest
echo "Threadstead Backup" > "$BACKUP_DIR/MANIFEST.txt"
echo "Date: $(date)" >> "$BACKUP_DIR/MANIFEST.txt"
echo "Hostname: $(hostname)" >> "$BACKUP_DIR/MANIFEST.txt"
echo "Database: $DB_NAME" >> "$BACKUP_DIR/MANIFEST.txt"
echo "Database Size: $(du -sh "$BACKUP_DIR/database.dump" | cut -f1)" >> "$BACKUP_DIR/MANIFEST.txt"

# 4. Compress
echo "[$(date)] Compressing backup..."
tar -czf "/tmp/threadstead-backup-$BACKUP_DATE.tar.gz" -C /tmp "threadstead-backup-$BACKUP_DATE"

# 5. Encrypt
echo "[$(date)] Encrypting backup..."
openssl enc -aes-256-cbc \
  -salt \
  -in "/tmp/threadstead-backup-$BACKUP_DATE.tar.gz" \
  -out "/tmp/threadstead-backup-$BACKUP_DATE.tar.gz.enc" \
  -pass "file:$ENCRYPTION_KEY_FILE"

# 6. Transfer to NAS
echo "[$(date)] Transferring to NAS..."
cat "/tmp/threadstead-backup-$BACKUP_DATE.tar.gz.enc" | ssh "$NAS_HOST" "cat > $NAS_PATH/threadstead-backup-$BACKUP_DATE.tar.gz.enc"

if [ $? -ne 0 ]; then
    echo "[$(date)] ERROR: Transfer to NAS failed!"
    rm -rf "$BACKUP_DIR"
    rm -f "/tmp/threadstead-backup-$BACKUP_DATE.tar.gz"
    rm -f "/tmp/threadstead-backup-$BACKUP_DATE.tar.gz.enc"
    exit 1
fi

# 7. Verify transfer
echo "[$(date)] Verifying transfer..."
REMOTE_SIZE=$(ssh "$NAS_HOST" "stat -c%s $NAS_PATH/threadstead-backup-$BACKUP_DATE.tar.gz.enc" 2>/dev/null)
LOCAL_SIZE=$(stat -c%s "/tmp/threadstead-backup-$BACKUP_DATE.tar.gz.enc")

if [ "$REMOTE_SIZE" != "$LOCAL_SIZE" ]; then
    echo "[$(date)] WARNING: File size mismatch!"
fi

# 8. Cleanup local files
echo "[$(date)] Cleaning up local files..."
rm -rf "$BACKUP_DIR"
rm -f "/tmp/threadstead-backup-$BACKUP_DATE.tar.gz"
rm -f "/tmp/threadstead-backup-$BACKUP_DATE.tar.gz.enc"

# 9. Cleanup old backups on NAS
echo "[$(date)] Removing backups older than $RETENTION_DAYS days..."
ssh "$NAS_HOST" "find $NAS_PATH -name 'threadstead-backup-*.tar.gz.enc' -mtime +$RETENTION_DAYS -delete"

echo "[$(date)] ✅ Backup completed successfully!"
