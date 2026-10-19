import React from 'react'
import { render, waitFor } from '@testing-library/react'
import VisitorTrail from '../VisitorTrail'

jest.mock('@/components/ui/feedback/UserQuickView', () => function UserQuickView() {
  return null
})

const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => ({
  ok: true,
  json: async () => ({ visitors: [] }),
}))

beforeEach(() => {
  fetchMock.mockClear()
  ;(global as any).fetch = fetchMock
})

const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')

describe('VisitorTrail', () => {
  it('only reads the trail when the visit is not to be recorded (signed out)', async () => {
    render(<VisitorTrail username="owner" />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/home/owner/visitors'))
    expect(posts()).toHaveLength(0)
  })

  it('records the visit when told to (signed-in visitor)', async () => {
    render(<VisitorTrail username="owner" recordVisit />)
    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(posts()[0][0]).toBe('/api/home/owner/visitors')
  })
})
