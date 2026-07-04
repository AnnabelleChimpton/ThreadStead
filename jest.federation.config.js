/**
 * Federation integration suite (E2) — real RingHubClient against a real,
 * harness-booted RingHub. Separate from the unit config on purpose:
 *  - node environment (no jsdom), real network to 127.0.0.1
 *  - *.itest.ts naming keeps these OUT of the default `npm test` run
 *  - requires local Postgres + the ThreadRingHub checkout (see
 *    tests/federation/harness/global-setup.ts)
 *
 * Run with: npm run test:federation
 */

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/federation/**/*.itest.ts'],
  globalSetup: '<rootDir>/tests/federation/harness/global-setup.ts',
  globalTeardown: '<rootDir>/tests/federation/harness/global-teardown.ts',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Hub calls are real HTTP against a freshly-booted process.
  testTimeout: 30000,
  // The lifecycle tests share state (join → post → remove → leave) and must
  // run in order in a single worker.
  maxWorkers: 1,
}
