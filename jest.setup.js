// Jest setup file - minimal setup for template testing
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

// Mock marked markdown parser
const markedMock = jest.fn().mockImplementation((input) => `<p>${input}</p>`)
markedMock.setOptions = jest.fn()
markedMock.parse = jest.fn().mockImplementation((input) => `<p>${input}</p>`)

jest.mock('marked', () => ({
  __esModule: true,
  marked: markedMock,
  default: markedMock
}))

// Suppress console warnings in tests unless we're debugging
const originalConsoleWarn = console.warn
console.warn = (...args) => {
  if (args[0]?.includes && args[0].includes('Template prop validation warnings:')) {
    return // Suppress validation warnings in tests
  }
  originalConsoleWarn.apply(console, args)
}