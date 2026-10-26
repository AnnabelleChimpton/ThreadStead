// Jest setup file - minimal setup for template testing
import '@testing-library/jest-dom'
// From the DOM library, not @testing-library/react: importing that here would
// switch React's act environment on for the node-environment page tests too
import { configure } from '@testing-library/dom'

// findBy*/waitFor give up after 4 s, not 1: on a busy full run (the whole
// suite in parallel, a dev server compiling) a mocked save took longer than
// 1 s to show its message. A wait ends as soon as its check passes, so
// passing tests are no slower.
configure({ asyncUtilTimeout: 4000 })

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

// NOTE: unified / rehype-* / marked / DOMPurify are deliberately NOT mocked.
// Sanitizer and XSS tests must exercise the real pipeline. If one test needs
// a stub, jest.mock it in that test file.

// Suppress console warnings in tests unless we're debugging
const originalConsoleWarn = console.warn
console.warn = (...args) => {
  if (args[0]?.includes && args[0].includes('Template prop validation warnings:')) {
    return // Suppress validation warnings in tests
  }
  originalConsoleWarn.apply(console, args)
}