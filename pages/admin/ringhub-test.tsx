/**
 * Ring Hub Test Dashboard
 * 
 * A web interface to test Ring Hub connectivity and authentication
 * without enabling ThreadRing features. Accessible at /admin/ringhub-test
 */

import { useState, useEffect } from 'react'
import { useMe } from '@/hooks/useMe'
import { useRouter } from 'next/router'

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP' | 'RUNNING'
  message: string
  details?: any
  duration?: number
}

interface TestSummary {
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number
}

export default function RingHubTestPage() {
  const { me, isLoading } = useMe()
  const router = useRouter()
  const [results, setResults] = useState<TestResult[]>([])
  const [summary, setSummary] = useState<TestSummary | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isReady, setIsReady] = useState<boolean | null>(null)

  // Check if user is admin
  useEffect(() => {
    if (isLoading) return // Still loading
    if (!me.loggedIn || me.user?.role !== 'admin') {
      router.push('/')
      return
    }
  }, [me, isLoading, router])

  const runTests = async () => {
    setIsRunning(true)
    setResults([])
    setSummary(null)
    setIsReady(null)

    try {
      const response = await fetch('/api/test/ringhub-readiness')
      const data = await response.json()

      setResults(data.results || [])
      setSummary(data.summary)
      setIsReady(data.readyForProduction)
    } catch (error) {
      console.error('Test failed:', error)
      setResults([{
        name: 'Test Runner',
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Unknown error'
      }])
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS': return '✅'
      case 'FAIL': return '❌'
      case 'SKIP': return '⏸️'
      case 'RUNNING': return '🔄'
      default: return '❓'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'text-green-600'
      case 'FAIL': return 'text-red-600'
      case 'SKIP': return 'text-yellow-600'
      case 'RUNNING': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  if (isLoading) {
    return <div className="p-8">Loading...</div>
  }

  if (!me.loggedIn || me.user?.role !== 'admin') {
    return <div className="p-8">Access denied.</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-black p-6 shadow-[2px_2px_0_#000] mb-6">
          <h1 className="text-2xl font-bold mb-4">Ring Hub Test Dashboard</h1>
          <p className="text-gray-600 mb-6">
            Test Ring Hub connectivity and authentication without enabling ThreadRing features.
            These tests verify that your production deployment is ready for Ring Hub integration.
          </p>
          
          <button
            onClick={runTests}
            disabled={isRunning}
            className="bg-blue-500 text-white px-6 py-3 border border-black shadow-[2px_2px_0_#000] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? '🔄 Running Tests...' : '🧪 Run Tests'}
          </button>
        </div>

        {summary && (
          <div className="bg-white border border-black p-6 shadow-[2px_2px_0_#000] mb-6">
            <h2 className="text-xl font-bold mb-4">Test Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{summary.skipped}</div>
                <div className="text-sm text-gray-600">Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.duration}ms</div>
                <div className="text-sm text-gray-600">Duration</div>
              </div>
            </div>
            
            <div className={`p-4 border rounded ${isReady ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <div className="font-bold">
                {isReady ? '🎉 Ready for Production!' : '⚠️ Not Ready for Production'}
              </div>
              <div className="text-sm mt-1">
                {isReady 
                  ? 'All tests passed. You can safely enable NEXT_PUBLIC_USE_RING_HUB=true'
                  : 'Some tests failed. Fix the issues before enabling Ring Hub integration.'
                }
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-white border border-black p-6 shadow-[2px_2px_0_#000]">
            <h2 className="text-xl font-bold mb-4">Test Results</h2>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getStatusIcon(result.status)}</span>
                      <span className="font-medium">{result.name}</span>
                      {result.duration && (
                        <span className="text-sm text-gray-500">({result.duration}ms)</span>
                      )}
                    </div>
                    <span className={`font-medium ${getStatusColor(result.status)}`}>
                      {result.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {result.message}
                  </div>
                  
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 && !isRunning && (
          <div className="bg-white border border-black p-6 shadow-[2px_2px_0_#000] text-center">
            <div className="text-4xl mb-4">🧪</div>
            <h2 className="text-xl font-bold mb-2">Ready to Test</h2>
            <p className="text-gray-600">
              Click &quot;Run Tests&quot; to verify your Ring Hub integration setup.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}