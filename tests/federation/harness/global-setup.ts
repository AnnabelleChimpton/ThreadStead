/**
 * Federation integration suite — global setup.
 *
 * Boots a REAL RingHub (from the sibling ThreadRingHub checkout) against an
 * ephemeral local Postgres database, seeds a test actor whose signing key is
 * pre-cached hub-side (no did:web resolution), and hands the connection
 * details to the test workers via a temp JSON file.
 *
 * Requirements on the dev machine:
 *   - Postgres running locally (psql on PATH; Homebrew default works)
 *   - The ThreadRingHub repo checked out next to ThreadStead
 *     (override with RINGHUB_REPO_PATH)
 *
 * The whole point of this suite is that NOTHING here mocks the hub: these
 * tests exercise the exact code that talks to production, against the exact
 * code that runs in production. The `{}`-response incident of 2026-07 was
 * invisible to every unit test and would have failed here on day one.
 */
import { execSync, spawn } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import http from 'http'
import net from 'net'
import os from 'os'
import path from 'path'
import { writeRuntime } from './runtime'

const DB_NAME = 'ringhub_itest'

function sh(cmd: string, opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): string {
  return execSync(cmd, {
    cwd: opts.cwd,
    env: opts.env ?? process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  })
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port
      srv.close(() => resolve(port))
    })
    srv.on('error', reject)
  })
}

/** Ed25519 keypair in every encoding the two sides need. */
function generateTestKeys() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  // Raw 32-byte seed = last 32 bytes of the PKCS#8 DER.
  const pkcs8 = privateKey.export({ format: 'der', type: 'pkcs8' }) as Buffer
  const seed = pkcs8.subarray(pkcs8.length - 32)
  // Raw 32-byte public key = last 32 bytes of the SPKI DER.
  const spki = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
  const rawPub = spki.subarray(spki.length - 32)
  return {
    privateKeyBase64Url: seed.toString('base64url'),
    publicKeyBase64: rawPub.toString('base64'),
  }
}

/** Hub badge-signing key: base64 of a PKCS#8 PEM Ed25519 private key. */
function generateHubBadgeKey(): string {
  const { privateKey } = crypto.generateKeyPairSync('ed25519')
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string
  return Buffer.from(pem, 'utf8').toString('base64')
}

async function waitForHealth(url: string, logPath: string, timeoutMs = 60_000): Promise<void> {
  const start = Date.now()
  let lastErr: unknown
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) })
      if (res.ok) return
      lastErr = new Error(`health returned ${res.status}`)
    } catch (err) {
      lastErr = err
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').slice(-4000) : '(no log)'
  throw new Error(
    `RingHub did not become healthy within ${timeoutMs}ms: ${lastErr}\n--- hub log tail ---\n${log}`
  )
}

export default async function globalSetup(): Promise<void> {
  const threadsteadRoot = process.cwd()
  const hubRepo = process.env.RINGHUB_REPO_PATH || path.resolve(threadsteadRoot, '..', 'ThreadRingHub')
  const hubApiDir = path.join(hubRepo, 'apps', 'hub-api')

  if (!fs.existsSync(path.join(hubApiDir, 'package.json'))) {
    throw new Error(
      `ThreadRingHub checkout not found at ${hubApiDir} — set RINGHUB_REPO_PATH to the repo root`
    )
  }

  const user = os.userInfo().username
  const databaseUrl =
    process.env.TEST_DATABASE_URL || `postgresql://${user}@localhost:5432/${DB_NAME}`

  // 1. Fresh database (local Postgres, no Docker needed).
  sh(`psql -d postgres -v ON_ERROR_STOP=1 -c 'DROP DATABASE IF EXISTS ${DB_NAME}' -c 'CREATE DATABASE ${DB_NAME}'`)

  // 2. Push the hub's schema (avoids migration history entirely for tests).
  sh('npx prisma db push --skip-generate', {
    cwd: hubApiDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  })

  // 3. Serve a REAL DID document for the test actor, exactly as ThreadStead
  //    serves user DIDs in production. The hub resolves it during /trp/join
  //    (loopback did:web resolves over plain http).
  const keys = generateTestKeys()
  const didPort = await freePort()
  const testActorDid = `did:web:localhost%3A${didPort}:users:itest1`
  const didDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
    ],
    id: testActorDid,
    verificationMethod: [
      {
        id: `${testActorDid}#key-1`,
        type: 'Ed25519VerificationKey2020',
        controller: testActorDid,
        publicKeyBase64: keys.publicKeyBase64,
      },
    ],
    authentication: [`${testActorDid}#key-1`],
    assertionMethod: [`${testActorDid}#key-1`],
    service: [
      {
        id: `${testActorDid}#profile`,
        type: 'Profile',
        serviceEndpoint: `http://localhost:${didPort}/users/itest1/profile`,
      },
    ],
  }
  const didServer = http.createServer((req, res) => {
    if (req.url === '/users/itest1/did.json') {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(didDocument))
    } else if (req.url === '/users/itest1/profile') {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ actorName: 'Integration Test Actor' }))
    } else {
      res.statusCode = 404
      res.end('not found')
    }
  })
  await new Promise<void>((resolve) => didServer.listen(didPort, '127.0.0.1', resolve))

  // 4. Seed: test ring + pre-verified actor + cached signing key.
  const ringSlug = 'itest-ring'
  sh('npx tsx scripts/seed-integration.ts', {
    cwd: hubApiDir,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      TEST_ACTOR_DID: testActorDid,
      TEST_ACTOR_PUBKEY_B64: keys.publicKeyBase64,
      TEST_RING_SLUG: ringSlug,
    },
  })

  // 5. Boot the hub.
  const port = await freePort()
  const hubUrl = `http://127.0.0.1:${port}`
  const hubLogPath = path.join(os.tmpdir(), 'threadstead-federation-hub.log')
  const logFd = fs.openSync(hubLogPath, 'w')

  const hub = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: hubApiDir,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrl,
      PORT: String(port),
      HOST: '127.0.0.1',
      LOG_LEVEL: 'warn',
      // Point at a closed port: the hub degrades gracefully without Redis and
      // the suite must not depend on (or pollute) a developer's local Redis.
      REDIS_URL: 'redis://127.0.0.1:6399',
      RING_HUB_URL: hubUrl,
      RING_HUB_PRIVATE_KEY: generateHubBadgeKey(),
      // Hub config validation requires >=32 chars for secrets.
      JWT_SECRET: crypto.randomBytes(32).toString('hex'),
      SIGNING_KEY: crypto.randomBytes(32).toString('hex'),
    },
    stdio: ['ignore', logFd, logFd],
    detached: false,
  })
  fs.closeSync(logFd)

  await waitForHealth(hubUrl, hubLogPath)

  writeRuntime({
    hubUrl,
    hubPid: hub.pid!,
    databaseUrl,
    testActorDid,
    privateKeyBase64Url: keys.privateKeyBase64Url,
    publicKeyBase64: keys.publicKeyBase64,
    // The client requires SOME multibase value but never uses it for signing.
    publicKeyMultibase: 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
    ringSlug,
    hubLogPath,
  })

  // Keep the children referenced so jest doesn't reap them before teardown.
  ;(globalThis as any).__FEDERATION_HUB__ = hub
  ;(globalThis as any).__FEDERATION_DID_SERVER__ = didServer
}
