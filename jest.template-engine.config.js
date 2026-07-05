/**
 * Template-engine golden suite (G2) — separate from the unit config because
 * the compile pipeline depends on the unified/rehype ESM ecosystem, and the
 * main (next/jest-wrapped) config force-ignores all of node_modules from
 * transformation — under it, rehype-sanitize's defaultSchema resolves to a
 * mangled 6-tag stub and the sanitizer strips ALL plain HTML, behavior
 * production never has. This PLAIN jest config (no next/jest wrapper)
 * transforms the whole unified dependency tree so tests see PRODUCTION
 * parsing behavior — verified by the schema canary test.
 *
 * Run with: npm run test:engine
 */

/** @type {import('jest').Config} */
module.exports = {
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
