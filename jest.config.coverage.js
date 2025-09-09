const nextJest = require('next/jest')

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Enhanced configuration for coverage reporting
const config = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  testEnvironment: 'jsdom',

  // Handle module path mapping (same as tsconfig.json paths)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Transform ESM modules that need to be processed
  transformIgnorePatterns: [
    'node_modules/(?!(unified|rehype-parse|rehype-sanitize|@noble|@tonejs))'
  ],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],

  // Enhanced coverage settings
  collectCoverage: true,
  collectCoverageFrom: [
    // Template system files
    'lib/templates/**/*.{ts,tsx}',
    'components/features/templates/**/*.{ts,tsx}',
    
    // Existing coverage targets
    'lib/template-compiler/**/*.{ts,tsx}',
    'components/profile/ProfileModeRenderer.{ts,tsx}',
    
    // Exclude patterns
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**',
    
    // Exclude specific files that are hard to test or not critical
    '!lib/templates/html/**', // HTML template strings
    '!lib/templates/profile-templates/**', // Profile template strings
    '!**/*.config.{js,ts}',
    '!**/jest.setup.js'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Specific thresholds for critical components
    'lib/templates/core/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'lib/templates/compilation/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'json',
    'lcov',
    'clover'
  ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Transform settings for TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json'
    }]
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
  ],

  // Additional settings for better reporting
  verbose: true,
  
  // Test timeout for slower tests
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,

  // Mock platform-specific modules
  setupFiles: ['<rootDir>/jest.setup.js'],

  // Custom test environment options
  testEnvironmentOptions: {
    customExportConditions: [''],
  }
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config)