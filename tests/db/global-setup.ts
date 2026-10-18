/**
 * db test project — global setup.
 *
 * Builds a fresh Postgres database from schema.prisma, then applies the
 * hand-written migrations on top (search: extensions, functions, triggers,
 * backfill; Indie Index: its triggers) — which also proves they are safe to
 * re-run over a schema that already has their tables, columns and indexes.
 *
 * Needs a local Postgres (Homebrew default works; CI uses a service
 * container). Override the target with DBTEST_DATABASE_URL.
 */
import { execSync } from 'child_process'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { adminDatabaseUrl, testDatabaseUrl } from './config'

const SEARCH_MIGRATION = 'prisma/migrations/20261017000000_add_search_fts/migration.sql'
// Needs the search migration's functions, so it runs second.
const INDIE_INDEX_MIGRATION = 'prisma/migrations/20261019000000_add_indie_index/migration.sql'

export default async function globalSetup(): Promise<void> {
  const root = path.resolve(__dirname, '..', '..')
  const url = testDatabaseUrl()
  const dbName = new URL(url).pathname.slice(1)
  if (!dbName.includes('dbtest') || !/^[a-z0-9_]+$/.test(dbName)) {
    throw new Error(`Refusing to drop and recreate "${dbName}": the db test database name must contain "dbtest"`)
  }

  const admin = new PrismaClient({ datasources: { db: { url: adminDatabaseUrl() } } })
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`)
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`)
  } finally {
    await admin.$disconnect()
  }

  // schema.prisma declares gin_trgm_ops indexes, so pg_trgm must exist first.
  const test = new PrismaClient({ datasources: { db: { url } } })
  try {
    await test.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm')
  } finally {
    await test.$disconnect()
  }

  const env = { ...process.env, DATABASE_URL: url }
  const run = (cmd: string) => execSync(cmd, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] })
  run('npx prisma db push --skip-generate --accept-data-loss')
  run(`npx prisma db execute --schema prisma/schema.prisma --file ${SEARCH_MIGRATION}`)
  run(`npx prisma db execute --schema prisma/schema.prisma --file ${INDIE_INDEX_MIGRATION}`)
}
