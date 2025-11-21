# Chat Message Cleanup Script

## Overview

Automatically deletes old chat messages to prevent database bloat and maintain performance.

## Usage

### Test Mode (Preview Only)
```bash
npx tsx scripts/cleanup-old-chat-messages.ts --dry-run
```

### Live Mode (Actually Delete)
```bash
npx tsx scripts/cleanup-old-chat-messages.ts
```

### Custom Retention Period
```bash
# Delete messages older than 30 days
CHAT_RETENTION_DAYS=30 npx tsx scripts/cleanup-old-chat-messages.ts

# Delete messages older than 7 days
CHAT_RETENTION_DAYS=7 npx tsx scripts/cleanup-old-chat-messages.ts
```

## Configuration

**Environment Variable**: `CHAT_RETENTION_DAYS`
**Default**: 90 days
**Recommended**: 30-90 days for community chat

## Cron Job Setup

### Production Server (Linux/Mac)

Edit your crontab:
```bash
crontab -e
```

Add one of these entries:

**Option 1: Daily at 3 AM**
```cron
0 3 * * * cd /path/to/threadstead && npx tsx scripts/cleanup-old-chat-messages.ts >> logs/chat-cleanup.log 2>&1
```

**Option 2: Weekly on Sunday at 2 AM**
```cron
0 2 * * 0 cd /path/to/threadstead && npx tsx scripts/cleanup-old-chat-messages.ts >> logs/chat-cleanup.log 2>&1
```

**Option 3: Monthly on 1st at 1 AM**
```cron
0 1 1 * * cd /path/to/threadstead && npx tsx scripts/cleanup-old-chat-messages.ts >> logs/chat-cleanup.log 2>&1
```

### Verify Cron Job
```bash
# List current cron jobs
crontab -l

# Check log output
tail -f logs/chat-cleanup.log
```

## What It Does

1. **Analyzes** current message database
2. **Identifies** messages older than retention period
3. **Deletes** old messages (keeps recent ones)
4. **Reports** statistics and freed space

## Output Example

```
🧹 CHAT MESSAGE CLEANUP
======================

📅 Retention period: 90 days
🗓️  Cutoff date: 2025-08-23T03:00:00.000Z
🔍 Mode: LIVE DELETE

1️⃣ Analyzing chat messages...
   💬 Total messages: 15,487
   🗑️  Messages to delete: 12,203
   ✅ Messages to keep: 3,284

   📊 Old messages by room:
      lounge: 12,203

2️⃣ Deleting 12,203 old messages...
   ✅ Deleted 12,203 messages in 1.34s

3️⃣ Cleanup complete!
   📊 Remaining messages: 3,284
   💾 Freed up ~78.8% of storage

✨ Done!
```

## Safety Features

- ✅ **Dry-run mode** - Preview before deleting
- ✅ **Date-based** - Only deletes by age, never deletes recent messages
- ✅ **Transaction-safe** - Uses Prisma's safe deletion
- ✅ **Detailed logging** - Full audit trail of what was deleted
- ✅ **Error handling** - Graceful failure, no data corruption

## Monitoring

Check logs regularly:
```bash
# Today's cleanup
grep "CHAT MESSAGE CLEANUP" logs/chat-cleanup.log | tail -20

# Messages deleted this month
grep "Deleted" logs/chat-cleanup.log | tail -30
```

## Troubleshooting

**Script fails with permission error:**
```bash
chmod +x scripts/cleanup-old-chat-messages.ts
```

**Database connection error:**
```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Test database connection
npx prisma db pull
```

**No messages deleted:**
- All messages are within retention period (normal for new deployments)
- Run with `--dry-run` to see what would be deleted

## Recommended Schedule

| Traffic Level | Retention | Schedule |
|--------------|-----------|----------|
| Low (< 100 msgs/day) | 90 days | Weekly |
| Medium (100-1000 msgs/day) | 60 days | Daily |
| High (> 1000 msgs/day) | 30 days | Daily |

## Production Checklist

- [ ] Test with `--dry-run` first
- [ ] Run once manually to verify
- [ ] Add to crontab with logging
- [ ] Monitor first few executions
- [ ] Set up log rotation for cleanup logs
- [ ] Document retention policy for users

## Notes

- Messages are **permanently deleted** (no recovery)
- Chat history before retention period is lost
- Consider user expectations before setting short retention
- Disk space savings depend on total message volume
