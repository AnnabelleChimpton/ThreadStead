#!/usr/bin/env bash
# Deploy ThreadStead on the production server.
#
#   ./scripts/deploy.sh
#
# Stops at the first failing step, and checks the env BEFORE building or
# restarting, so a bad deploy leaves the running site untouched. Prints the
# previous commit so you can roll back.
#
# The server's checkout carries one commit of its own (9d7b631, untracks
# files that hold live data), so pulls are merges — hence --no-edit.
set -euo pipefail

cd "$(dirname "$0")/.."

PM2_APP="${PM2_APP:-threadstead}"
PORT="$(grep -E '^PORT=' .env 2>/dev/null | tail -1 | cut -d= -f2 | tr -d "\"'" || true)"
PORT="${PORT:-3000}"

step() { printf '\n==> %s\n' "$*"; }

PREV="$(git rev-parse --short HEAD)"
step "Deploying from $(pwd) (currently $PREV)"

step "Pulling origin/main"
git pull --no-edit origin main
NEW="$(git rev-parse --short HEAD)"
ROLLBACK="git reset --hard $PREV && npm ci --no-audit --no-fund && npx prisma generate && npm run build && NODE_ENV=production pm2 restart $PM2_APP --update-env && pm2 save"
if [ "$NEW" = "$PREV" ]; then
  echo "Already up to date — continuing anyway (rebuild + restart)."
fi

step "Installing dependencies (npm ci: exact lockfile, never rewrites it)"
npm ci --no-audit --no-fund

step "Generating Prisma client"
npx prisma generate >/dev/null

step "Checking environment (the new build refuses to start on a bad value)"
npm run --silent env:check

step "Applying database migrations"
npx prisma migrate deploy

step "Building (into .next-build; the running site keeps using .next)"
# Building straight into .next replaced the files the running site was
# reading, so every page failed with "Cannot find module ./chunks/…" until
# the restart. The new build is swapped in just before it instead.
rm -rf .next-build
NEXT_DIST_DIR=.next-build npm run build

step "Swapping in the new build and restarting $PM2_APP"
rm -rf .next-previous
if [ -d .next ]; then mv .next .next-previous; fi
mv .next-build .next
# --update-env replaces the process's environment with this shell's, so set
# NODE_ENV here: without it server.ts starts Next in dev mode, which serves
# 500s and rewrites .next under the next build (2026-10-18 outage). The
# shell's NEXT_DIST_DIR is unset here, so the site reads .next.
NODE_ENV=production pm2 restart "$PM2_APP" --update-env >/dev/null
pm2 save >/dev/null

if [ "$(pm2 env "$(pm2 id "$PM2_APP" | tr -dc '0-9' | head -c 4)" 2>/dev/null | grep -i '^node_env' | awk '{print $2}')" != "production" ]; then
  echo "WARNING: pm2 doesn't show NODE_ENV=production for $PM2_APP; check with: pm2 env <id>"
fi

step "Waiting for the site on port $PORT"
ok=""
for _ in $(seq 1 30); do
  if curl -sf -o /dev/null "http://127.0.0.1:$PORT/"; then ok=1; break; fi
  sleep 2
done
if [ -z "$ok" ]; then
  echo "Site did not answer on port $PORT within 60s. Recent errors:"
  pm2 logs "$PM2_APP" --err --lines 30 --nostream || true
  echo
  echo "Roll back with:"
  echo "  $ROLLBACK"
  echo "(The build that was running before is kept in .next-previous.)"
  exit 1
fi
echo "Site is up."

# nginx keeps signed-out visitors' resident pages for a few seconds
# (design/template-audit/perf/CACHE_STEPS.md), and would hand out a stale one
# while it fetches the new build's: its <script> tags name the old build's
# chunks, which are gone now.
RESIDENT_CACHE=/var/cache/nginx/resident
if [ -d "$RESIDENT_CACHE" ]; then
  step "Emptying nginx's page cache"
  if sudo -n find "$RESIDENT_CACHE" -mindepth 1 -delete 2>/dev/null; then
    echo "Emptied."
  else
    echo "WARNING: couldn't empty $RESIDENT_CACHE (sudoers line in CACHE_STEPS.md). An old page refreshes on its next visit."
  fi
fi

step "RingHub connection"
if curl -sf "http://127.0.0.1:$PORT/api/ringhub/health-check" | grep -q '"authenticated":true'; then
  echo "RingHub: authenticated."
else
  echo "WARNING: RingHub is not authenticating. Check:"
  echo "  curl -s http://127.0.0.1:$PORT/api/ringhub/health-check"
fi

rm -rf .next-previous

step "Done: $PREV -> $NEW"
echo "Roll back with:"
echo "  $ROLLBACK"
echo "(Database migrations are not undone by a rollback.)"
