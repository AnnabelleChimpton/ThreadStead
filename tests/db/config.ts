/**
 * Where the db test project's throwaway database lives. Never the app's
 * DATABASE_URL: the suite drops and recreates this database on every run.
 * Override with DBTEST_DATABASE_URL (not TEST_DATABASE_URL, which the
 * federation harness uses for the hub's database). The name must contain
 * "dbtest" so a mistyped URL can't drop a real database.
 */
import os from 'os'

export const TEST_DB_NAME = 'threadstead_dbtest'

export function testDatabaseUrl(): string {
  return process.env.DBTEST_DATABASE_URL || `postgresql://${os.userInfo().username}@localhost:5432/${TEST_DB_NAME}`
}

/** Same server, the `postgres` maintenance database (for DROP/CREATE DATABASE). */
export function adminDatabaseUrl(): string {
  const url = new URL(testDatabaseUrl())
  url.pathname = '/postgres'
  return url.toString()
}
