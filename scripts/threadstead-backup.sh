#!/bin/bash
# Nightly ThreadStead backup: database dump + configs, encrypted, kept on this
# server and copied to the NAS. Runs as root from cron:
#
#   0 2 * * * /opt/backup/threadstead-backup.sh >> /var/log/threadstead-backup.log 2>&1
#
# Install as /opt/backup/threadstead-backup.sh (root, mode 700). Secrets and
# per-server values live in /opt/backup/threadstead-backup.conf (root, mode 600):
#
#   DB_NAME="..."
#   DB_USER="..."
#   PGPASSWORD="..."
#   NAS_PATH="/home/<nas user>/backups/threadstead"
#   APP_ENV_FILE="/home/<app user>/<app dir>/.env"
#
# Plaintext (the dump, the .env copy) only exists inside a mode-700 work
# directory under $LOCAL_DIR, and the EXIT trap removes it however the script
# ends. The encrypted archive is always kept in $LOCAL_DIR for
# $LOCAL_RETENTION_DAYS, so a night the NAS is down still leaves a backup;
# archives that haven't reached the NAS yet are sent the next time it answers.
#
# Decrypt (archives made from 2026-10-27 on):
#   openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 \
#     -in X.tar.gz.enc -out X.tar.gz -pass pass:"$(cat encryption-key.txt)"
# Older archives were made without -pbkdf2: drop "-pbkdf2 -iter 600000".

set -Eeuo pipefail
umask 077
shopt -s nullglob

CONFIG_FILE="/opt/backup/threadstead-backup.conf"
ENCRYPTION_KEY_FILE="/opt/backup/.backup-encryption-key"
LOCAL_DIR="/var/backups/threadstead"
LOCAL_RETENTION_DAYS=14
NAS_HOST="nas-backup"  # SSH alias configured in /root/.ssh/config
NAS_RETENTION_DAYS=30
PBKDF2_ITER=600000

DB_HOST="localhost"
DB_PORT="5432"
DB_NAME=""
DB_USER=""
PGPASSWORD=""
NAS_PATH=""
APP_ENV_FILE=""

log() { echo "[$(date '+%F %T %Z')] $*"; }

fail() {
    log "BACKUP FAILED: $*"
    logger -t threadstead-backup -p user.err "BACKUP FAILED: $*" || true
}

WORK_DIR=""
cleanup() {
    if [ -n "$WORK_DIR" ]; then
        rm -rf "$WORK_DIR"
    fi
}
trap cleanup EXIT
trap 'fail "line $LINENO: \"$BASH_COMMAND\" exited with $?"' ERR
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

# shellcheck source=/dev/null
source "$CONFIG_FILE"
export PGPASSWORD

install -d -m 700 -o root -g root "$LOCAL_DIR"

exec 9> "$LOCAL_DIR/.lock"
if ! flock -n 9; then
    fail "another backup is still running"
    exit 1
fi

# Work dirs left by a run that was killed outright (SIGKILL, power loss).
rm -rf "$LOCAL_DIR"/.work.*

BACKUP_NAME="threadstead-backup-$(date +%Y-%m-%d_%H-%M-%S)"
ARCHIVE="$LOCAL_DIR/$BACKUP_NAME.tar.gz.enc"
WORK_DIR=$(mktemp -d "$LOCAL_DIR/.work.XXXXXX")
STAGE="$WORK_DIR/$BACKUP_NAME"
mkdir -p "$STAGE/configs"

log "Starting Threadstead backup $BACKUP_NAME..."

# 1. Database
log "Dumping database..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --format=custom \
  --file="$STAGE/database.dump"

# 2. System configs
log "Backing up system configs..."
if [ -n "$APP_ENV_FILE" ]; then
    if [ -f "$APP_ENV_FILE" ]; then
        cp "$APP_ENV_FILE" "$STAGE/configs/.env"
    else
        log "WARNING: $APP_ENV_FILE not found, so the app .env is not in this backup"
    fi
fi
crontab -l > "$STAGE/configs/crontab.txt" 2>/dev/null || true

# 3. Manifest
{
    echo "Threadstead Backup"
    echo "Date: $(date)"
    echo "Hostname: $(hostname)"
    echo "Database: $DB_NAME"
    echo "Database Size: $(du -sh "$STAGE/database.dump" | cut -f1)"
} > "$STAGE/MANIFEST.txt"

# 4. Compress + encrypt in one pipe, so no plaintext tarball is written
log "Compressing and encrypting..."
tar -czf - -C "$WORK_DIR" "$BACKUP_NAME" \
  | openssl enc -aes-256-cbc -salt -pbkdf2 -iter "$PBKDF2_ITER" -md sha256 \
      -pass "file:$ENCRYPTION_KEY_FILE" \
      -out "$WORK_DIR/$BACKUP_NAME.tar.gz.enc"

# 5. Prove the archive opens and the dump inside reads end to end
log "Verifying the encrypted archive..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter "$PBKDF2_ITER" -md sha256 \
  -pass "file:$ENCRYPTION_KEY_FILE" \
  -in "$WORK_DIR/$BACKUP_NAME.tar.gz.enc" \
  | tar -xzOf - "$BACKUP_NAME/database.dump" \
  | pg_restore -f /dev/null

mv "$WORK_DIR/$BACKUP_NAME.tar.gz.enc" "$ARCHIVE"
cleanup
WORK_DIR=""
log "Saved $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

# 6. Local retention
find "$LOCAL_DIR" -maxdepth 1 \( -name 'threadstead-backup-*.tar.gz.enc' -o -name 'threadstead-backup-*.tar.gz.enc.sent' \) \
  -mtime +"$LOCAL_RETENTION_DAYS" -delete

# 7. Send every archive the NAS doesn't have yet, oldest first. Each one is
# written as .partial, size-checked, then renamed, so the NAS never holds a
# half-written archive under its real name.
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=4 "$NAS_HOST")

send_to_nas() {
    local file="$1"
    local dest
    dest="$NAS_PATH/$(basename "$file")"
    "${SSH[@]}" "cat > '$dest.partial' && test \"\$(stat -c%s '$dest.partial')\" = '$(stat -c%s "$file")' && mv '$dest.partial' '$dest'" < "$file"
}

log "Transferring to NAS..."
nas_ok=1
sent=0
pending=0
for file in "$LOCAL_DIR"/threadstead-backup-*.tar.gz.enc; do
    if [ -e "$file.sent" ]; then
        continue
    fi
    if [ "$nas_ok" = 1 ] && send_to_nas "$file"; then
        touch "$file.sent"
        sent=$((sent + 1))
        log "Sent $(basename "$file")"
    else
        nas_ok=0
        pending=$((pending + 1))
    fi
done

if [ "$nas_ok" != 1 ]; then
    fail "could not copy to the NAS ($NAS_HOST). $pending encrypted backup(s) are kept in $LOCAL_DIR and will be sent on the next run that reaches it."
    exit 1
fi

# 8. NAS retention
log "Removing NAS backups older than $NAS_RETENTION_DAYS days..."
if ! "${SSH[@]}" "find '$NAS_PATH' -maxdepth 1 \( -name 'threadstead-backup-*.tar.gz.enc' -o -name 'threadstead-backup-*.partial' \) -mtime +$NAS_RETENTION_DAYS -delete"; then
    log "WARNING: could not prune old backups on the NAS"
fi

log "BACKUP OK: $BACKUP_NAME saved locally and sent to the NAS ($sent archive(s) sent this run)"
