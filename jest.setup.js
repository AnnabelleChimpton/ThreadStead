// Jest setup file
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock Next.js dynamic imports
jest.mock('next/dynamic', () => (func) => {
  const Component = func()
  Component.preload = jest.fn()
  return Component
})

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.ENABLE_TEMPLATE_ISLANDS = 'false'
process.env.ENABLE_TEMPLATE_COMPILATION = 'true'
process.env.TEMPLATE_ISLAND_ROLLOUT_PERCENT = '0'

// Mock Prisma client
jest.mock('./lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    profile: {
      update: jest.fn(),
    },
  },
}))

// Mock data fetchers
jest.mock('./lib/data-fetchers', () => ({
  getResidentData: jest.fn().mockResolvedValue({
    owner: {
      id: 'user123',
      handle: 'testuser',
      displayName: 'Test User',
      avatarUrl: '/assets/default-avatar.gif'
    },
    viewer: { id: null },
    posts: [],
    guestbook: [],
    capabilities: { bio: 'Test bio' },
    images: [],
    profileImages: []
  }),
}))

// Mock auth server
jest.mock('./lib/auth-server', () => ({
  getSession: jest.fn().mockResolvedValue({
    user: { id: 'user123' }
  }),
}))

// Mock unified and rehype modules
jest.mock('unified', () => ({
  unified: jest.fn(() => ({
    use: jest.fn().mockReturnThis(),
    parse: jest.fn().mockReturnValue({
      type: 'root',
      children: []
    }),
    runSync: jest.fn().mockReturnValue({
      type: 'root', 
      children: []
    })
  }))
}))

jest.mock('rehype-parse', () => jest.fn())
jest.mock('rehype-sanitize', () => ({
  __esModule: true,
  default: jest.fn(),
  defaultSchema: {
    tagNames: ['div', 'p', 'span', 'h1', 'h2', 'h3'],
    attributes: {}
  }
}))

// Mock crypto dependencies
jest.mock('@noble/ed25519', () => ({}))
jest.mock('@noble/hashes', () => ({}))
jest.mock('bs58', () => ({
  encode: jest.fn(),
  decode: jest.fn()
}))

// Mock Tone.js
jest.mock('tone', () => ({}))
jest.mock('@tonejs/midi', () => ({}))

// Suppress console warnings in tests unless we're debugging
const originalConsoleWarn = console.warn
console.warn = (...args) => {
  if (args[0]?.includes && args[0].includes('Template prop validation warnings:')) {
    return // Suppress validation warnings in tests
  }
  originalConsoleWarn.apply(console, args)
}