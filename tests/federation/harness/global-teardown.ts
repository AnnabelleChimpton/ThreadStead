/**
 * Federation integration suite — global teardown.
 * Kills the hub and drops the ephemeral database.
 * Set KEEP_FEDERATION_DB=1 to keep both for debugging.
 */
import { execSync } from 'child_process'
import fs from 'fs'
import { readRuntime, RUNTIME_PATH } from './runtime'

export default async function globalTeardown(): Promise<void> {
  let runtime
  try {
    runtime = readRuntime()
  } catch {
    return // setup never completed; nothing to clean
  }

  const didServer = (globalThis as any).__FEDERATION_DID_SERVER__
  if (didServer) {
    didServer.close()
  }

  const hub = (globalThis as any).__FEDERATION_HUB__
  if (hub && !hub.killed) {
    hub.kill('SIGTERM')
  } else if (runtime.hubPid) {
    try {
      process.kill(runtime.hubPid, 'SIGTERM')
    } catch {
      // already gone
    }
  }

  if (process.env.KEEP_FEDERATION_DB === '1') {
    console.log(
      `KEEP_FEDERATION_DB=1 — kept database ${runtime.databaseUrl} and hub log ${runtime.hubLogPath}`
    )
    return
  }

  // Give the hub a moment to release its DB connections before dropping.
  await new Promise((r) => setTimeout(r, 1000))
  const dbName = new URL(runtime.databaseUrl).pathname.replace(/^\//, '')
  try {
    execSync(`psql -d postgres -c 'DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)'`, {
      stdio: 'ignore',
    })
  } catch {
    // non-fatal: next run's DROP IF EXISTS will catch it
  }
  fs.rmSync(RUNTIME_PATH, { force: true })
}
