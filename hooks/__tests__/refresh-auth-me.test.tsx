/**
 * Signing up happens without a page load, and the header kept the
 * signed-out answer from page load through the whole of signup (signup
 * audit #9). refreshAuthMe asks again and tells every mounted hook.
 */
import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { useMe } from '../useMe'
import { useCurrentUser, refreshAuthMe, invalidateAuthMe } from '../useCurrentUser'

function Header() {
  const { me } = useMe()
  const { user } = useCurrentUser()
  return <p>{me.loggedIn ? `useMe: @${me.user?.primaryHandle}` : 'useMe: Sign In'} · {user ? `useCurrentUser: @${user.primaryHandle}` : 'useCurrentUser: Sign In'}</p>
}

let signedIn = false
beforeEach(() => {
  signedIn = false
  invalidateAuthMe()
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => (signedIn ? { loggedIn: true, user: { id: 'u1', did: 'd', role: 'member', primaryHandle: 'newbie' } } : { loggedIn: false }),
  })) as unknown as typeof fetch
})

test('a mounted header changes once the account exists', async () => {
  render(<Header />)
  await screen.findByText('useMe: Sign In · useCurrentUser: Sign In')

  signedIn = true
  await act(async () => {
    await refreshAuthMe()
  })
  await waitFor(() => expect(screen.getByText('useMe: @newbie · useCurrentUser: @newbie')).toBeInTheDocument())
})
