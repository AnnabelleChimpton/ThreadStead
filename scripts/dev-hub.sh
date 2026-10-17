#!/usr/bin/env bash
# Run a local RingHub for development (npm run dev:hub).
#
# Local ThreadStead (.env: RING_HUB_URL=http://localhost:3100,
# THREADSTEAD_DID=did:web:localhost%3A3000) talks to this hub instead of
# production. The hub runs natively (not in Docker) so it can fetch
# ThreadStead's DID documents from http://localhost:3000 — inside a container,
# localhost would be the container itself.
#
# Uses the Homebrew Postgres already serving ThreadStead (database ringhub_dev)
# and no Redis (the hub runs without it, as in the federation test suite).
set -euo pipefail

HUB_DIR="${RINGHUB_REPO_PATH:-$(cd "$(dirname "$0")/../../ThreadRingHub" && pwd)}/apps/hub-api"
DB_NAME="${RINGHUB_DEV_DB:-ringhub_dev}"
PORT="${RINGHUB_DEV_PORT:-3100}"

export DATABASE_URL="${RINGHUB_DEV_DATABASE_URL:-postgresql://$(whoami)@localhost:5432/$DB_NAME}"
export NODE_ENV=development
export PORT HOST=127.0.0.1
export RING_HUB_URL="http://localhost:$PORT"
export CORS_ORIGINS="http://localhost:3000"
export REDIS_URL="redis://127.0.0.1:6399" # nothing listens here: no Redis
export JWT_SECRET="local-dev-only-jwt-secret-not-for-production"
export RATE_LIMIT_ENABLED=false
export LOG_LEVEL="${LOG_LEVEL:-info}"

cd "$HUB_DIR"

if ! psql -lqt | cut -d'|' -f1 | grep -qw "$DB_NAME"; then
  echo "Creating database $DB_NAME"
  createdb "$DB_NAME"
fi

# Regenerate the client every start: a stale generated client (schema newer
# than client) is what broke production key caching on 2026-10-17.
npx prisma generate >/dev/null
npx prisma migrate deploy

# Root "spool" ring + a "local-test" ring with default roles. Idempotent.
TEST_ACTOR_DID="did:web:seed.invalid" \
TEST_ACTOR_PUBKEY_B64="$(head -c 32 /dev/zero | base64)" \
TEST_RING_SLUG="local-test" \
  npx tsx scripts/seed-integration.ts >/dev/null

echo "RingHub dev server on http://localhost:$PORT (db: $DB_NAME)"
exec npx tsx watch src/index.ts
