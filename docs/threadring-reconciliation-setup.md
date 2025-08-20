# ThreadRing Reconciliation Setup Guide

This guide explains how to set up ThreadRing counter reconciliation for different deployment scenarios.

## 🔄 What is ThreadRing Reconciliation?

ThreadRing reconciliation is a background process that:
- Verifies ThreadRing counter accuracy (`directChildrenCount`, `totalDescendantsCount`)
- Fixes any discrepancies automatically
- Ensures The Spool genealogy tree stays consistent
- Runs periodically to maintain data integrity

## 🚀 Deployment Scenarios

### 1. Traditional VPS/Dedicated Server (Recommended)

**Setup Required:** ✅ **None - works automatically**

```bash
# The scheduler starts automatically when the server runs
npm run build
npm start

# Optionally configure interval (default: 24 hours)
export THREADRING_RECONCILIATION_HOURS=12
```

**Environment Variables:**
```bash
# Optional: Change reconciliation interval (hours)
THREADRING_RECONCILIATION_HOURS=24

# Optional: Disable automatic reconciliation
DISABLE_THREADRING_RECONCILIATION=true

# Development: Force enable in non-production
FORCE_THREADRING_RECONCILIATION=true
```

**Manual Reconciliation:**
```bash
# Run immediately
npm run threadrings:reconcile

# Or via API (admin required)
curl -X POST http://your-server.com/api/admin/threadrings/reconcile
```

### 2. Docker Container

**Setup Required:** ✅ **None - works automatically**

```dockerfile
# In your Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build

# Set environment variables
ENV NODE_ENV=production
ENV THREADRING_RECONCILIATION_HOURS=24

# Start the application
CMD ["npm", "start"]
```

**Docker Compose:**
```yaml
services:
  threadstead:
    build: .
    environment:
      - NODE_ENV=production
      - THREADRING_RECONCILIATION_HOURS=24
      - DATABASE_URL=postgresql://...
    restart: unless-stopped  # Important for scheduler continuity
```

### 3. Serverless Platforms (Vercel, Netlify)

**Setup Required:** ⚠️ **Additional cron setup needed**

Serverless functions spin down when not in use, so the in-memory scheduler won't work reliably.

**Option A: Vercel Cron Jobs (Recommended)**
```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/admin/threadrings/reconcile",
      "schedule": "0 2 * * *"  // Daily at 2 AM UTC
    }
  ]
}
```

**Option B: External Cron Service**
```bash
# Use a service like GitHub Actions, cron-job.org, or similar
# to hit your reconciliation endpoint daily

curl -X POST https://your-app.vercel.app/api/admin/threadrings/reconcile \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Option C: Manual Only**
```bash
# Disable automatic reconciliation
DISABLE_THREADRING_RECONCILIATION=true

# Run manually when needed
npm run threadrings:reconcile
```

### 4. Platform-as-a-Service (Railway, Render, etc.)

**Setup Required:** ✅ **None - works automatically**

Most PaaS providers keep your app running continuously, so the automatic scheduler works fine.

```bash
# Just deploy normally
git push origin main

# Optionally set environment variables in platform dashboard:
THREADRING_RECONCILIATION_HOURS=24
```

### 5. Shared Hosting

**Setup Required:** ⚠️ **May need manual setup**

Shared hosting often puts apps to sleep when inactive.

**Check if automatic works:**
```bash
# Deploy and check logs after 24+ hours
# If you see "ThreadRing reconciliation scheduler started" - you're good!
```

**If automatic doesn't work:**
```bash
# Option 1: Set up cron job on hosting provider
0 2 * * * cd /path/to/app && npm run threadrings:reconcile

# Option 2: Disable automatic and run manually
DISABLE_THREADRING_RECONCILIATION=true
```

## 📊 Monitoring & Verification

### Check if Reconciliation is Working

**1. Check Server Logs:**
```bash
# Look for these messages in your logs:
# ✅ "ThreadRing reconciliation scheduler started (24h interval)"
# ✅ "ThreadRing reconciliation completed - all counters accurate"
# ⚠️ "ThreadRing reconciliation found and fixed X counter discrepancies"
```

**2. Manual Status Check:**
```bash
# Run manual reconciliation to see current state
npm run threadrings:reconcile

# Or via API
curl -X GET http://your-server.com/api/admin/threadrings/reconcile-scheduler
```

**3. Database Verification:**
```sql
-- Check if The Spool counter matches total rings
SELECT 
  (SELECT totalDescendantsCount FROM "ThreadRing" WHERE "isSystemRing" = true) as spool_count,
  (SELECT COUNT(*) FROM "ThreadRing" WHERE "isSystemRing" = false) as actual_count;
```

### Troubleshooting

**Scheduler Not Starting:**
```bash
# Check environment variables
echo $NODE_ENV
echo $DISABLE_THREADRING_RECONCILIATION
echo $THREADRING_RECONCILIATION_HOURS

# Force enable for testing
export FORCE_THREADRING_RECONCILIATION=true
npm run dev
```

**Counters Still Wrong:**
```bash
# Run manual reconciliation
npm run threadrings:reconcile

# Check for specific errors in output
# Most issues are automatically fixed
```

**High Memory Usage:**
```bash
# If you have thousands of ThreadRings, consider:
# 1. Increase reconciliation interval
THREADRING_RECONCILIATION_HOURS=168  # Weekly instead of daily

# 2. Or disable automatic reconciliation
DISABLE_THREADRING_RECONCILIATION=true
# Then run manually during low-traffic periods
```

## 🎯 Recommendations by Deployment Type

| Deployment Type | Recommendation | Setup Required |
|----------------|----------------|----------------|
| **VPS/Dedicated** | ✅ Use automatic scheduler | None |
| **Docker** | ✅ Use automatic scheduler | Ensure `restart: unless-stopped` |
| **Vercel** | ⚠️ Use Vercel Cron Jobs | Add `vercel.json` cron config |
| **Netlify** | ⚠️ Use external cron service | Configure external service |
| **Railway/Render** | ✅ Use automatic scheduler | None |
| **Shared Hosting** | ⚠️ Check if works, fallback to manual | Test first, configure cron if needed |

## 💡 Best Practices

1. **Monitor Logs**: Watch for reconciliation messages in production logs
2. **Test First**: Run manual reconciliation before relying on automatic
3. **Set Appropriate Interval**: Daily (24h) is good for most sites
4. **Have Backup Plan**: Keep manual reconciliation available
5. **Document Your Setup**: Note which method you're using for your deployment

## 🔧 Manual Reconciliation Commands

```bash
# Check counter accuracy (safe, read-only check)
npm run threadrings:reconcile

# API endpoints (admin authentication required)
POST /api/admin/threadrings/reconcile              # Run reconciliation
GET  /api/admin/threadrings/reconcile-scheduler    # Get scheduler status
POST /api/admin/threadrings/reconcile-scheduler    # Control scheduler
```

The reconciliation system is designed to be robust and handle most deployment scenarios automatically, with fallback options for edge cases.