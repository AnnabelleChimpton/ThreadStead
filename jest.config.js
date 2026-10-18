/**
 * One Jest config, three projects:
 *
 *  - unit        jsdom + next/jest. All *.test / *.spec files. `npm test`.
 *  - engine      Template-engine golden suite (*.etest.ts). A PLAIN config (no
 *                next/jest wrapper) because next/jest force-ignores all of
 *                node_modules from transformation — under it,
 *                rehype-sanitize's defaultSchema resolves to a mangled 6-tag
 *                stub and the sanitizer strips ALL plain HTML, behavior
 *                production never has. This project transforms the whole
 *                unified dependency tree so tests see PRODUCTION parsing
 *                behavior — verified by the schema canary test.
 *  - federation  Real RingHubClient against a real, harness-booted RingHub
 *                (*.itest.ts). Needs local Postgres + the ThreadRingHub
 *                checkout (see tests/federation/harness/global-setup.ts).
 *                Its globalSetup only fires when one of its tests is selected,
 *                so `npm test` never boots the hub.
 *  - db          Route tests against a real, throwaway Postgres database
 *                (*.dbtest.ts) — for code that runs raw SQL (search). Needs
 *                local Postgres (see tests/db/global-setup.ts). `npm run test:db`.
 *
 * Pick projects with --selectProjects (see package.json scripts). Coverage is
 * just `--coverage` on top of any selection.
 */
const nextJest = require('next/jest')

// Loads next.config + .env and supplies the CSS/image mocks for the unit project.
const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const unit = {
  displayName: 'unit',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(unified|rehype-parse|rehype-sanitize|@noble|@tonejs|marked))',
  ],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js)',
    '**/__tests__/**/*.spec.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
}

/** @type {import('jest').Config} */
const engine = {
  displayName: 'engine',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/template-engine/**/*.etest.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|scss)$': '<rootDir>/tests/template-engine/style-stub.js',
  },
  transform: {
    // Inline compilerOptions merge over the root tsconfig: the registry pulls
    // in .tsx components, and without next/jest's babel we must compile JSX.
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx', module: 'commonjs' } }],
    // The unified/rehype ecosystem ships ESM-only .js — transform it so the
    // REAL rehype-sanitize defaultSchema loads (see canary test).
    '^.+\\.(js|jsx|mjs)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(unified|rehype.*|hast.*|mdast.*|micromark.*|vfile.*|unist.*|bail|is-plain-obj|trough|property-information|space-separated-tokens|comma-separated-tokens|web-namespaces|zwitch|html-void-elements|ccount|character-entities.*|character-reference.*|stringify-entities|devlop|estree.*|@noble|@tonejs|marked)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs'],
  testTimeout: 20000,
}

/** @type {import('jest').Config} */
const federation = {
  displayName: 'federation',
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
  // run in order in one worker. maxWorkers is global-only under `projects`,
  // so `npm run test:federation` passes --runInBand instead.
}

/** @type {import('jest').Config} */
const dbProject = {
  displayName: 'db',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/db/**/*.dbtest.ts'],
  globalSetup: '<rootDir>/tests/db/global-setup.ts',
  setupFiles: ['<rootDir>/tests/db/setup-env.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testTimeout: 30000,
}

module.exports = async () => {
  // next/jest loads ThreadStead's .env into this process, and the federation
  // harness spawns the hub with process.env — ThreadStead's vars then shadow
  // the hub's own .env and break it. Keep the environment as it was; tests
  // must not depend on a local .env anyway (CI has none).
  const envBefore = { ...process.env }
  const unitResolved = await createJestConfig(unit)()
  for (const key of Object.keys(process.env)) {
    if (!(key in envBefore)) delete process.env[key]
  }
  Object.assign(process.env, envBefore)

  return {
    projects: [unitResolved, engine, federation, dbProject],

    // Coverage is opt-in via --coverage; these only scope what gets reported.
    collectCoverageFrom: [
      'lib/**/*.{ts,tsx}',
      'components/**/*.{ts,tsx}',
      'hooks/**/*.{ts,tsx}',
      'contexts/**/*.{ts,tsx}',
      '!**/*.d.ts',
      '!**/__tests__/**',
      '!**/*.{test,spec,etest,itest}.{ts,tsx}',
    ],
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text-summary', 'lcov'],
  }
}
