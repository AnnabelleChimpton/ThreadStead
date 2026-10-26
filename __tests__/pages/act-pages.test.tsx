/**
 * The action pages people sign a guestbook or follow someone on, coming from
 * that person's own address (lib/act/actions.ts): signed out, the guarded
 * button, the note kept as a draft, where they go when it's done, and what
 * they're told when it doesn't work.
 */
import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'

jest.mock('@/components/ui/layout/Layout', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
jest.mock('@/components/ui/layout/PageMeta', () => ({ __esModule: true, default: () => null }))
const mockCsrfFetch = jest.fn()
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args) }))
const mockRequestCapability = jest.fn(async () => 'cap')
jest.mock('@/lib/api/client/capability', () => ({
  ...jest.requireActual('@/lib/api/client/capability'),
  requestCapability: (...args: unknown[]) => mockRequestCapability(...(args as [])),
}))
jest.mock('@/lib/config/database/connection', () => ({ db: {} }))
jest.mock('@/lib/act/finish', () => ({
  ...jest.requireActual('@/lib/act/finish'),
  navigate: (url: string) => { assigned = url },
}))

import SignGuestbook from '@/pages/act/guestbook/[username]'
import FollowPage from '@/pages/act/follow/[username]'
import { CapabilityError } from '@/lib/api/client/capability'

const target = { id: 'alice-1', username: 'alice', name: 'Alice', avatarUrl: null }
const viewer = { id: 'pat-1', username: 'pat' }
const base = { target, viewer, backUrl: 'https://alice.homepageagain.com/', popup: false, canSee: true }

var assigned: string | null = null
beforeEach(() => {
  assigned = null
  localStorage.clear()
  mockCsrfFetch.mockReset()
  mockRequestCapability.mockReset().mockResolvedValue('cap')
  jest.useRealTimers()
})

async function ready() {
  await act(async () => { await new Promise((r) => setTimeout(r, 550)) })
}

describe('signing a guestbook', () => {
  it('signed out: log in and come back, or make an account', () => {
    render(<SignGuestbook {...base} viewer={null} />)
    expect(screen.getByRole('heading', { name: "Sign Alice's guestbook" })).toHaveFocus()
    expect(screen.getByText("Log in to sign Alice's guestbook. You'll come right back here.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login?next=%2Fact%2Fguestbook%2Falice')
    expect(screen.getByRole('link', { name: 'Make an account' })).toHaveAttribute('href', '/signup')
  })

  it('the button ignores clicks for its first moment; then signing goes back to the note', async () => {
    mockCsrfFetch.mockResolvedValue({ ok: true, status: 201, json: async () => ({ entries: [], entry: { id: 'e7' } }) })
    render(<SignGuestbook {...base} />)
    expect(screen.getByText(/Signing as/)).toHaveTextContent('Signing as pat. Not you? Log out')
    fireEvent.change(screen.getByLabelText('Your note'), { target: { value: 'hi alice!' } })
    const sign = screen.getByRole('button', { name: 'Sign' })
    expect(sign).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(sign)
    expect(mockCsrfFetch).not.toHaveBeenCalled()
    await ready()
    expect(sign).toHaveAttribute('aria-disabled', 'false')
    fireEvent.click(sign)
    await waitFor(() => expect(assigned).toBe('https://alice.homepageagain.com/#guestbook-entry-e7'))
    expect(JSON.parse(mockCsrfFetch.mock.calls[0][1].body)).toEqual({ message: 'hi alice!', cap: 'cap' })
    expect(localStorage.getItem('threadstead:act-draft:guestbook:alice')).toBeNull()
  })

  it('in a pop-up it finishes on act-done.html on their address', async () => {
    mockCsrfFetch.mockResolvedValue({ ok: true, status: 201, json: async () => ({ entries: [], entry: { id: 'e7' } }) })
    render(<SignGuestbook {...base} popup />)
    fireEvent.change(screen.getByLabelText('Your note'), { target: { value: 'hi' } })
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }))
    await waitFor(() => expect(assigned).toBe('https://alice.homepageagain.com/assets/act-done.html#guestbook=e7'))
  })

  it('an unsent note is kept, and comes back', () => {
    const { unmount } = render(<SignGuestbook {...base} />)
    fireEvent.change(screen.getByLabelText('Your note'), { target: { value: 'half a thought' } })
    unmount()
    render(<SignGuestbook {...base} />)
    expect(screen.getByLabelText('Your note')).toHaveValue('half a thought')
    expect(screen.getByText('Your unsent note is still here.')).toBeInTheDocument()
  })

  it('over the limit, or logged out meanwhile, it says so and keeps the note', async () => {
    mockCsrfFetch.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: "You've signed alice's guestbook a few times today. Try again tomorrow." }) })
    render(<SignGuestbook {...base} />)
    fireEvent.change(screen.getByLabelText('Your note'), { target: { value: 'again' } })
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("You've signed alice's guestbook a few times today. Try again tomorrow.")
    mockRequestCapability.mockRejectedValueOnce(new CapabilityError('Please log in.', 401))
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent("You've been logged out. Log in again and your note will still be here."))
    expect(screen.getByLabelText('Your note')).toHaveValue('again')
    expect(assigned).toBeNull()
  })

  it("someone who can't see the page can't sign it", () => {
    render(<SignGuestbook {...base} canSee={false} />)
    expect(screen.getByText("You can't sign this guestbook.")).toBeInTheDocument()
    expect(screen.queryByLabelText('Your note')).toBeNull()
  })
})

describe('following', () => {
  it('follows, and says so here', async () => {
    mockCsrfFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    render(<FollowPage {...base} following={false} />)
    expect(screen.getByText('Their posts will show up in your feed.')).toBeInTheDocument()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Follow' }))
    expect(await screen.findByText('You follow Alice now.')).toBeInTheDocument()
    expect(mockCsrfFetch).toHaveBeenCalledWith('/api/follow/alice', { method: 'POST' })
    expect(screen.getByRole('link', { name: "Back to Alice's page" })).toHaveAttribute('href', 'https://alice.homepageagain.com/')
  })

  it('already following, their own page, and a pop-up closing through act-done.html', () => {
    const { unmount } = render(<FollowPage {...base} following />)
    expect(screen.getByText(/You already follow Alice\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unfollow' })).toBeInTheDocument()
    unmount()
    const own = render(<FollowPage {...base} viewer={{ id: 'alice-1', username: 'alice' }} following={false} />)
    expect(screen.getByText('This is you.')).toBeInTheDocument()
    own.unmount()
    render(<FollowPage {...base} popup following={false} />)
    expect(screen.getByRole('link', { name: 'Close' })).toHaveAttribute('href', 'https://alice.homepageagain.com/assets/act-done.html#follow')
  })
})
