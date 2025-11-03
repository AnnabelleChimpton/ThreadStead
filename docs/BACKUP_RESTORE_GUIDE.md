# Threadstead Backup & Restore Guide

## Table of Contents
- [Overview](#overview)
- [Backup System](#backup-system)
- [Restoring Backups - Windows (WSL)](#restoring-backups---windows-wsl)
- [Restoring Backups - Windows (Native)](#restoring-backups---windows-native)
- [Restoring to Production](#restoring-to-production)
- [Restoring to Local Dev Environment](#restoring-to-local-dev-environment)
- [Troubleshooting](#troubleshooting)

---

## Overview

Your Threadstead application has automated daily backups:
- **Schedule:** Every day at 2:00 AM UTC
- **Location:** NAS device at `NAS_IP_ADDRESS` (via Tailscale)
- **Path:** `/home/BACKUP_USER/backups/threadstead/`
- **Retention:** 30 days (automatic cleanup)
- **Encryption:** AES-256-CBC
- **Contents:** PostgreSQL database, system configs, crontab

---

## Backup System

### Automated Backups
- **Script:** `/opt/backup/threadstead-backup.sh`
- **Cron Job:** `0 2 * * * /opt/backup/threadstead-backup.sh >> /var/log/threadstead-backup.log 2>&1`
- **Logs:** `/var/log/threadstead-backup.log`
- **Encryption Key:** `/opt/backup/.backup-encryption-key`

### Backup Script

The complete backup script is located at `/opt/backup/threadstead-backup.sh` on the production server.

A copy of the script is also available in this repository at: `scripts/threadstead-backup.sh`

**Key features:**
- PostgreSQL database dump (custom format)
- System configuration backup (.env, crontab)
- Compression (tar.gz)
- AES-256-CBC encryption
- Transfer to NAS via SSH/cat (works around UGreen NAS SCP restrictions)
- Size verification after transfer
- Automatic cleanup of old backups (30-day retention)
- Automatic cleanup of temporary files

### Manual Backup
To run a backup manually:
```bash
sudo /opt/backup/threadstead-backup.sh
```

### Viewing Backups
```bash
# SSH to NAS (replace NAS_IP_ADDRESS with your Tailscale NAS IP)
ssh BACKUP_USER@NAS_IP_ADDRESS

# List backups
ls -lh /home/BACKUP_USER/backups/threadstead/

# Example filename: threadstead-backup-2025-10-30_20-41-47.tar.gz.enc
```

---

## Restoring Backups - Windows (WSL)

### Prerequisites
- Windows Subsystem for Linux (WSL) installed
- Tailscale installed on Windows
- SSH access to production server

### Step 1: Get the Encryption Key

```bash
# From WSL, SSH to production server and get the key
ssh DEPLOY_USER@your-production-server "sudo cat /opt/backup/.backup-encryption-key"
```

**Copy the output and save it somewhere safe (password manager)!**

### Step 2: Save Encryption Key Locally

```bash
# Create restore directory
mkdir -p ~/backup-restore
cd ~/backup-restore

# Save the key
nano encryption-key.txt
# Paste the key, then Ctrl+X, Y, Enter

# Secure the key file
chmod 400 encryption-key.txt
```

### Step 3: Install Tailscale on Windows

1. Download from https://tailscale.com/download/windows
2. Install and authenticate
3. Verify you can see the NAS: `ping NAS_IP_ADDRESS`

### Step 4: Download Backup from NAS

```bash
# List available backups
ssh BACKUP_USER@NAS_IP_ADDRESS "ls -lh /home/BACKUP_USER/backups/threadstead/"

# Download the backup you want (replace filename)
scp BACKUP_USER@NAS_IP_ADDRESS:/home/BACKUP_USER/backups/threadstead/threadstead-backup-YYYY-MM-DD_HH-MM-SS.tar.gz.enc ~/backup-restore/

# Or download via cat if scp doesn't work
ssh BACKUP_USER@NAS_IP_ADDRESS "cat /home/BACKUP_USER/backups/threadstead/threadstead-backup-YYYY-MM-DD_HH-MM-SS.tar.gz.enc" > ~/backup-restore/backup.tar.gz.enc
```

### Step 5: Decrypt the Backup

```bash
cd ~/backup-restore

# Get the encryption key content
ENCRYPTION_KEY=$(cat encryption-key.txt)

# Decrypt using the key as a password string (NOT file reference)
openssl enc -aes-256-cbc -d \
  -in backup.tar.gz.enc \
  -out backup.tar.gz \
  -pass pass:$ENCRYPTION_KEY

# Verify decryption worked (should show "1F 8B" for valid gzip)
xxd backup.tar.gz | head -n 1
```

**Note:** You must use `-pass pass:` (not `-pass file:`) for the decryption to work correctly.

### Step 6: Extract the Backup

```bash
# Extract
tar -xzf backup.tar.gz

# View contents
ls -la threadstead-backup-*/
```

You should see:
- `database.dump` - PostgreSQL database backup
- `configs/` - Configuration files
- `MANIFEST.txt` - Backup metadata

### Step 7: Restore Database (Local Dev)

**Option A: Restore to local PostgreSQL**

```bash
# Create new database (don't overwrite existing!)
createdb threadstead_restored

# Restore
pg_restore -d threadstead_restored --clean --if-exists \
  threadstead-backup-*/database.dump

# Verify
psql threadstead_restored -c "SELECT COUNT(*) FROM users;"
psql threadstead_restored -c "SELECT COUNT(*) FROM posts;"
```

**Option B: Copy to Windows and restore**

```bash
# Copy database dump to Windows
cp threadstead-backup-*/database.dump /mnt/c/Users/YourUsername/Downloads/

# Then use pgAdmin or pg_restore on Windows
```

---

## Restoring Backups - Windows (Native)

### Prerequisites
- OpenSSL for Windows
- Tailscale installed
- 7-Zip or similar for extracting .tar.gz

### Step 1: Install OpenSSL for Windows

1. Download from https://slproweb.com/products/Win32OpenSSL.html
2. Install "Win64 OpenSSL v3.x.x" (full version, not Light)
3. Add to PATH or note installation directory (usually `C:\Program Files\OpenSSL-Win64\bin\`)

### Step 2: Get Encryption Key

```powershell
# Open PowerShell
# SSH to production and get the key
ssh DEPLOY_USER@your-production-server "sudo cat /opt/backup/.backup-encryption-key"
```

**Copy and save this key!**

### Step 3: Save Encryption Key Locally

```powershell
# Create restore directory
New-Item -ItemType Directory -Path C:\backup-restore -Force
cd C:\backup-restore

# Save the key (paste when prompted)
notepad encryption-key.txt
# Paste the key, save and close
```

### Step 4: Download Backup from NAS

```powershell
# List backups
ssh BACKUP_USER@NAS_IP_ADDRESS "ls -lh /home/BACKUP_USER/backups/threadstead/"

# Download backup
scp BACKUP_USER@NAS_IP_ADDRESS:/home/BACKUP_USER/backups/threadstead/threadstead-backup-YYYY-MM-DD_HH-MM-SS.tar.gz.enc C:\backup-restore\backup.tar.gz.enc

# Or if scp doesn't work:
ssh BACKUP_USER@NAS_IP_ADDRESS "cat /home/BACKUP_USER/backups/threadstead/threadstead-backup-YYYY-MM-DD_HH-MM-SS.tar.gz.enc" > C:\backup-restore\backup.tar.gz.enc
```

### Step 5: Decrypt the Backup

```powershell
# Get the encryption key
$encryptionKey = Get-Content C:\backup-restore\encryption-key.txt

# Decrypt using the key as a password string (adjust OpenSSL path if different)
& "C:\Program Files\OpenSSL-Win64\bin\openssl.exe" enc -aes-256-cbc -d `
  -in C:\backup-restore\backup.tar.gz.enc `
  -out C:\backup-restore\backup.tar.gz `
  -pass pass:$encryptionKey

# Verify decryption worked (should show "1F 8B 08" for valid gzip)
$bytes = [System.IO.File]::ReadAllBytes("C:\backup-restore\backup.tar.gz")
Write-Host "File signature (should be '1F 8B 08'):"
($bytes[0..2] | ForEach-Object { $_.ToString("X2") }) -join " "
```

**Important:** You must use `-pass pass:` (not `-pass file:`) for the decryption to work correctly. The warning about deprecated key derivation is expected and can be ignored.

### Step 6: Extract the Backup

**⚠️ If you get "Unrecognized archive format" error:**
This usually means the decryption failed or file is corrupted. First verify the file:

```powershell
# Run the verification script
cd C:\Users\pesky\Git\threadstead\scripts
.\verify-backup.ps1 -BackupPath "C:\backup-restore\backup.tar.gz"
```

If verification fails, re-download the backup and try decryption again.

**Method A: Automated Extraction (Recommended)**
```powershell
# Run the extraction script (tries multiple methods)
cd C:\Users\pesky\Git\threadstead\scripts
.\extract-backup.ps1 -BackupFile "C:\backup-restore\backup.tar.gz" -OutputDir "C:\backup-restore"
```

**Method B: Manual - Using 7-Zip (Most Reliable)**
1. Download from https://www.7-zip.org/ if not installed
2. Right-click `backup.tar.gz`
3. 7-Zip → Extract Here (extracts .gz to .tar)
4. Right-click the resulting `backup.tar`
5. 7-Zip → Extract Here (extracts .tar contents)

**Method C: Manual - PowerShell with tar (Windows 10+)**
```powershell
# Change to the directory first
cd C:\backup-restore

# Extract
tar -xzf backup.tar.gz

# If that fails, try two-step extraction:
# Step 1: Decompress gzip
gzip -d backup.tar.gz
# Step 2: Extract tar
tar -xf backup.tar
```

**Method D: Use WSL (if installed)**
```powershell
# Extract using Linux tools in WSL
wsl tar -xzf /mnt/c/backup-restore/backup.tar.gz -C /mnt/c/backup-restore/
```

### Step 7: Restore Database (Windows)

**Using pg_restore:**

```powershell
# Find the database dump
cd C:\backup-restore\threadstead-backup-*

# Restore to local PostgreSQL
pg_restore -h localhost -U postgres -d threadstead_local --clean --if-exists database.dump
```

**Or use pgAdmin:**
1. Open pgAdmin
2. Right-click database → Restore
3. Select `database.dump` file
4. Click Restore

---

## Restoring to Production

### ⚠️ WARNING
Restoring to production will **overwrite your current database**! Only do this if:
- You need to recover from data loss
- You're doing a rollback after a bad deployment
- You've tested the backup first

### Prerequisites
- SSH access to production server
- Confirmed backup file is good
- Downtime window scheduled

### Step 1: Preparation

```bash
# SSH to production
ssh DEPLOY_USER@your-production-server

# Stop the application (adjust based on your setup)
sudo systemctl stop your-app-service  # or pm2 stop, docker stop, etc.

# IMPORTANT: Backup current database before overwriting!
sudo -u postgres pg_dump -d YOUR_DB_NAME --format=custom --file=/tmp/pre-restore-backup-$(date +%Y%m%d-%H%M%S).dump
```

### Step 2: Download Backup

```bash
# Download from NAS (nas-backup should be configured in /root/.ssh/config)
sudo bash -c 'ssh nas-backup "cat /home/BACKUP_USER/backups/threadstead/threadstead-backup-YYYY-MM-DD_HH-MM-SS.tar.gz.enc" > /tmp/restore.tar.gz.enc'
```

### Step 3: Decrypt and Extract

```bash
# Decrypt
sudo openssl enc -aes-256-cbc -d \
  -in /tmp/restore.tar.gz.enc \
  -out /tmp/restore.tar.gz \
  -pass file:/opt/backup/.backup-encryption-key

# Extract
cd /tmp
sudo tar -xzf restore.tar.gz

# Verify contents
ls -la threadstead-backup-*/
```

### Step 4: Restore Database

```bash
# Restore database (replace YOUR_DB_USER and YOUR_DB_NAME with your actual values)
sudo pg_restore -h localhost -p 5432 -U YOUR_DB_USER -d YOUR_DB_NAME \
  --clean --if-exists \
  /tmp/threadstead-backup-*/database.dump

# Verify database
sudo -u postgres psql YOUR_DB_NAME -c "SELECT COUNT(*) FROM users;"
sudo -u postgres psql YOUR_DB_NAME -c "SELECT COUNT(*) FROM posts;"
```

### Step 5: Restore Configs (if needed)

```bash
# Check configs
ls -la /tmp/threadstead-backup-*/configs/

# Restore .env if needed (CAREFUL - review first!)
sudo cp /tmp/threadstead-backup-*/configs/.env ~/YOUR_APP_DIR/.env

# Restore crontab if needed
crontab /tmp/threadstead-backup-*/configs/crontab.txt
```

### Step 6: Restart Application

```bash
# Restart your application
sudo systemctl start your-app-service  # or pm2 restart, docker start, etc.

# Check logs
sudo journalctl -u your-app-service -f
# or
pm2 logs
```

### Step 7: Cleanup

```bash
# Remove temporary files
sudo rm -rf /tmp/threadstead-backup-*
sudo rm /tmp/restore.tar.gz*
```

---

## Restoring to Local Dev Environment

### Prerequisites
- Local PostgreSQL installed
- Development environment set up

### Step 1: Download and Decrypt Backup

Follow steps from either:
- [Windows WSL Method](#restoring-backups---windows-wsl) - Steps 1-6
- [Windows Native Method](#restoring-backups---windows-native) - Steps 1-6

### Step 2: Create Test Database

```bash
# WSL/Linux
createdb threadstead_dev

# Or connect to PostgreSQL
psql -U postgres
CREATE DATABASE threadstead_dev;
\q
```

### Step 3: Restore to Dev Database

```bash
# WSL/Linux
pg_restore -h localhost -U postgres -d threadstead_dev \
  --clean --if-exists \
  threadstead-backup-*/database.dump
```

**Windows PowerShell:**
```powershell
pg_restore -h localhost -U postgres -d threadstead_dev `
  --clean --if-exists `
  C:\backup-restore\threadstead-backup-*\database.dump
```

### Step 4: Update .env for Dev

```bash
# Point your app to the restored database
DATABASE_URL="postgresql://postgres:password@localhost:5432/threadstead_dev"
```

### Step 5: Start Your Dev Server

```bash
npm run dev
# or
yarn dev
```

### Step 6: Verify Data

Open your app and check:
- Users exist
- Posts are visible
- All data looks correct

---

## Troubleshooting

### "Permission denied" errors

```bash
# Make sure encryption key file has correct permissions
chmod 400 encryption-key.txt
```

### "bad decrypt" or decryption fails

**Common Issue:** If you get "Unrecognized archive format" when extracting, the decryption likely failed silently.

**Solution:** Make sure you're using `-pass pass:` (NOT `-pass file:`):

```bash
# CORRECT - Use pass:
ENCRYPTION_KEY=$(cat encryption-key.txt)
openssl enc -aes-256-cbc -d -in backup.tar.gz.enc -out backup.tar.gz -pass pass:$ENCRYPTION_KEY

# WRONG - Don't use file:
openssl enc -aes-256-cbc -d -in backup.tar.gz.enc -out backup.tar.gz -pass file:encryption-key.txt
```

**Windows:**
```powershell
# CORRECT
$key = Get-Content encryption-key.txt
& "C:\Program Files\OpenSSL-Win64\bin\openssl.exe" enc -aes-256-cbc -d -in backup.tar.gz.enc -out backup.tar.gz -pass pass:$key
```

**Verify decryption worked:**
```bash
# Linux/Mac/WSL - should show "1f 8b" at start
xxd backup.tar.gz | head -n 1

# Windows PowerShell - should show "1F 8B 08"
$bytes = [System.IO.File]::ReadAllBytes("backup.tar.gz")
($bytes[0..2] | ForEach-Object { $_.ToString("X2") }) -join " "
```

Other checks:
- Verify you're using the correct encryption key
- Check the backup file isn't corrupted:
  ```bash
  file backup.tar.gz.enc  # Should say "data"
  ```

### Database restore fails

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify database exists
psql -U postgres -l | grep threadstead

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Can't connect to NAS

```bash
# Check Tailscale is connected
tailscale status

# Ping the NAS
ping NAS_IP_ADDRESS

# Test SSH
ssh BACKUP_USER@NAS_IP_ADDRESS "echo test"
```

### Backup files are missing

```bash
# Check retention policy hasn't deleted them
# Backups older than 30 days are auto-deleted

# List all backups
ssh BACKUP_USER@NAS_IP_ADDRESS "ls -lht /home/BACKUP_USER/backups/threadstead/"
```

### SCP/Download is slow

The backup files are encrypted and compressed, typical sizes:
- Small database (< 10MB): ~1-2 MB encrypted
- Medium database (100MB): ~10-20 MB encrypted
- Large database (1GB+): ~100-200 MB encrypted

Over Tailscale VPN, expect download speeds of 1-10 MB/s depending on your connection.

---

## Important Notes

1. **Save your encryption key!** Without it, backups are useless
   - Store in password manager
   - Keep offline copy in safe place
   - Don't commit to git!

2. **Test restores regularly**
   - Monthly restore test recommended
   - Verify data integrity
   - Practice the restore process

3. **Monitor backup logs**
   ```bash
   # Check recent backups succeeded
   sudo tail -50 /var/log/threadstead-backup.log
   ```

4. **Backup retention**
   - 30 days automatic
   - Older backups are deleted automatically
   - Adjust `RETENTION_DAYS` in `/opt/backup/threadstead-backup.sh` if needed

5. **Off-site backups**
   - Your NAS is at home (off-site from production)
   - Consider additional cloud backup for critical data
   - Download important backups to local machine periodically

---

## Quick Reference Commands

### List all backups
```bash
ssh BACKUP_USER@NAS_IP_ADDRESS "ls -lht /home/BACKUP_USER/backups/threadstead/"
```

### Download latest backup (WSL/Linux)
```bash
LATEST=$(ssh BACKUP_USER@NAS_IP_ADDRESS "ls -t /home/BACKUP_USER/backups/threadstead/*.enc | head -1")
ssh BACKUP_USER@NAS_IP_ADDRESS "cat $LATEST" > ~/backup-restore/latest-backup.tar.gz.enc
```

### Decrypt backup
```bash
# Read key into variable and use -pass pass: (NOT -pass file:)
ENCRYPTION_KEY=$(cat encryption-key.txt)
openssl enc -aes-256-cbc -d -in backup.tar.gz.enc -out backup.tar.gz -pass pass:$ENCRYPTION_KEY

# Verify it worked (should show "1f 8b")
xxd backup.tar.gz | head -n 1
```

### Extract backup
```bash
tar -xzf backup.tar.gz
```

### Restore database
```bash
pg_restore -d database_name --clean --if-exists threadstead-backup-*/database.dump
```

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review backup logs: `/var/log/threadstead-backup.log`
3. Verify encryption key is correct
4. Test with a fresh backup

---

**Last Updated:** October 31, 2025
