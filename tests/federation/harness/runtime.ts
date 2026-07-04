/**
 * Shared runtime-config plumbing for the federation integration suite.
 *
 * jest's globalSetup runs in a different process than the test workers, so
 * the harness passes state (hub port, test keys, DB url) through a JSON file
 * in the OS temp dir.
 */
import fs from 'fs'
import os from 'os'
import path from 'path'

export interface FederationRuntime {
  hubUrl: string
  hubPid: number
  databaseUrl: string
  testActorDid: string
  privateKeyBase64Url: string
  publicKeyBase64: string
  publicKeyMultibase: string
  ringSlug: string
  hubLogPath: string
}

export const RUNTIME_PATH = path.join(os.tmpdir(), 'threadstead-federation-runtime.json')

export function writeRuntime(runtime: FederationRuntime): void {
  fs.writeFileSync(RUNTIME_PATH, JSON.stringify(runtime, null, 2))
}

export function readRuntime(): FederationRuntime {
  if (!fs.existsSync(RUNTIME_PATH)) {
    throw new Error(
      `Federation runtime config missing at ${RUNTIME_PATH} — did globalSetup run?`
    )
  }
  return JSON.parse(fs.readFileSync(RUNTIME_PATH, 'utf8'))
}
