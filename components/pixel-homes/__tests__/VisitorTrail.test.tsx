import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import VisitorTrail from '../VisitorTrail'

jest.mock('@/components/ui/feedback/UserQuickView', () => function UserQuickView() {
  return null
})

let trail: { visitors: any[]; otherVisits?: number } = { visitors: [] }
const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => ({
  ok: true,
  json: async () => trail,
}))

beforeEach(() => {
  fetchMock.mockClear()
  trail = { visitors: [] }
  ;(global as any).fetch = fetchMock
})

const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
const pal = { id: 'u_pal', username: 'pal', displayName: 'Pal', visitedAt: new Date().toISOString() }

describe('VisitorTrail', () => {
  it('only reads the trail on the owner’s own visit', async () => {
    render(<VisitorTrail username="owner" />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/home/owner/visitors'))
    expect(posts()).toHaveLength(0)
  })

  it('records the visit first, then reads the trail, so the count includes it', async () => {
    render(<VisitorTrail username="owner" recordVisit />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST')
    expect(fetchMock.mock.calls[1][1]).toBeUndefined()
  })

  it('shows nothing when nobody has stopped by', async () => {
    const { container } = render(<VisitorTrail username="owner" />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })

  it('shows only a quiet count when nobody chose to appear', async () => {
    trail = { visitors: [], otherVisits: 1 }
    render(<VisitorTrail username="owner" />)
    expect(await screen.findByText('1 visit this week.')).toBeTruthy()
  })

  it('shows faces, then the other visits', async () => {
    trail = { visitors: [pal], otherVisits: 14 }
    render(<VisitorTrail username="owner" />)
    expect(await screen.findByText('Stopped by recently:')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Pal, / })).toBeTruthy()
    expect(screen.getByText('and 14 other visits this week.')).toBeTruthy()
  })

  it('leaves the count off when every visit is in the trail', async () => {
    trail = { visitors: [pal], otherVisits: 0 }
    const { container } = render(<VisitorTrail username="owner" />)
    await screen.findByText('Stopped by recently:')
    expect(container.textContent).not.toMatch(/visit/)
  })
})
