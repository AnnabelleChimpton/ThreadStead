/**
 * "Step back outside" (design/pixel-homes-audit/PLAN.md, Phase 1): the
 * profile is the inside of the house. Every profile with a pixel home the
 * viewer may see gets the link to /home/<u> in the site chrome right under
 * the nav, in every template mode, outside the resident's own template:
 *
 * - default / enhanced: Layout's afterNav slot, after the sticky NavBar
 * - advanced: under the fixed NavigationPreview, before the template
 * - advanced with the nav hidden: first thing on the page
 *
 * hasPixelHome comes from /api/profile, which only answers past the access
 * check (tests/api/__tests__/inside-outside-links.test.ts).
 */
import React from 'react'
import { act, render, screen } from '@testing-library/react'

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))
// The only other dynamic import on these pages is the advanced template renderer
jest.mock('next/dynamic', () => () => function DynamicStub() {
  return <div data-testid="advanced-template">template</div>
})
jest.mock('next/router', () => ({
  useRouter: () => ({ query: {}, pathname: '/resident/[username]', asPath: '/resident/pigeon', push: jest.fn(), events: { on: jest.fn(), off: jest.fn() } }),
  __esModule: true,
  default: { events: { on: jest.fn(), off: jest.fn() } },
}))
jest.mock('@/hooks/useCurrentUser', () => ({ useCurrentUser: () => ({ user: null, loading: false }) }))
jest.mock('@/hooks/useSiteConfig', () => ({ useSiteConfig: () => ({ config: { site_description: '', user_status_text: 'resident' } }) }))
jest.mock('@/hooks/useIdentitySync', () => ({ useIdentitySync: () => ({ hasMismatch: false, fixMismatch: jest.fn() }) }))
jest.mock('@/hooks/useSiteCSS', () => ({ useSiteCSS: () => ({ css: '', loading: false }) }))
jest.mock('@/contexts/ChatContext', () => ({ useChat: () => ({ openDM: jest.fn() }) }))
jest.mock('@/components/ui/navigation/NavBar', () => function NavBar() { return <header data-testid="site-nav">nav</header> })
jest.mock('@/components/ui/navigation/SiteFooter', () => () => null)
jest.mock('@/components/ui/feedback/ScrollToTop', () => () => null)
jest.mock('@/components/features/templates/NavigationPreview', () => function NavigationPreview() { return <div data-testid="site-nav">nav</div> })
jest.mock('@/components/core/social/FollowButton', () => () => null)
jest.mock('@/components/core/social/BlockButton', () => () => null)
jest.mock('@/components/core/social/MutualFriends', () => () => null)
jest.mock('@/components/core/profile/tabs/BlogTab', () => function BlogTab() { return <p>posts</p> })
jest.mock('@/components/core/profile/tabs/MediaGrid', () => () => null)
jest.mock('@/components/core/profile/tabs/FriendsWebsitesGrid', () => () => null)
jest.mock('@/components/core/profile/ProfileBadgeDisplay', () => () => null)
jest.mock('@/components/shared/Guestbook', () => () => null)
jest.mock('@/components/core/profile/ViewSourceBadge', () => () => null)
jest.mock('@/components/core/profile/PrivateProfile', () => function PrivateProfile() { return <p>This page is private</p> })
jest.mock('@/components/features/onboarding/WelcomeMusicControl', () => () => null)

import ProfilePage from '@/pages/resident/[username]/index'

const residentData: any = {
  owner: { id: 'u_pigeon', handle: 'pigeon', displayName: 'Pigeon', avatarUrl: '' },
  viewer: { id: null },
  posts: [],
  guestbook: [],
  images: [],
  capabilities: { bio: '' },
  featuredFriends: [],
  websites: [],
}

const base = { username: 'pigeon', ownerUserId: 'u_pigeon', displayName: 'Pigeon' }

function stepOutside() {
  return screen.queryByRole('link', { name: 'Step back outside' })
}

/** a comes before b in the document */
function before(a: Element, b: Element) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

describe('which profiles get the link', () => {
  test('a profile with a pixel home links out to it, as site chrome', () => {
    render(<ProfilePage {...base} hasPixelHome />)
    const link = stepOutside()!
    expect(link).toHaveAttribute('href', '/home/pigeon')
    expect(link.closest('[data-site-chrome]')).toHaveClass('ts-step-outside')
    // and the header's own link out reads plainly
    expect(screen.getByRole('link', { name: 'Pixel home' })).toHaveAttribute('href', '/home/pigeon')
  })

  test('no pixel home: no link, and no header button either', () => {
    render(<ProfilePage {...base} hasPixelHome={false} />)
    expect(stepOutside()).toBeNull()
    expect(screen.queryByRole('link', { name: 'Pixel home' })).toBeNull()
  })

  test('a private profile page never shows it', () => {
    render(<ProfilePage {...base} hasPixelHome isPrivateProfile privateProfileVisibility="private" />)
    expect(screen.getByText('This page is private')).toBeInTheDocument()
    expect(stepOutside()).toBeNull()
  })
})

describe('it sits under the nav, outside the resident’s template, in every mode', () => {
  test.each(['default', 'enhanced'] as const)('%s: right after the nav, before the profile', (templateMode) => {
    render(<ProfilePage {...base} hasPixelHome templateMode={templateMode} customCSS=".x{color:red}" />)
    const strip = stepOutside()!.closest('[data-site-chrome]')!
    expect(before(screen.getByTestId('site-nav'), strip)).toBe(true)
    expect(before(strip, document.querySelector('.ts-profile-container')!)).toBe(true)
    expect(strip.closest('.ts-profile-container')).toBeNull()
  })

  const advanced = {
    ...base,
    hasPixelHome: true,
    templateMode: 'advanced' as const,
    residentData,
    compiledTemplate: { mode: 'islands' },
  }

  test('advanced: under the fixed nav, before the template', () => {
    render(<ProfilePage {...advanced} />)
    const strip = stepOutside()!.closest('[data-site-chrome]')!
    const template = screen.getByTestId('advanced-template')
    expect(before(screen.getByTestId('site-nav'), strip)).toBe(true)
    expect(before(strip, template)).toBe(true)
    expect(template.contains(strip)).toBe(false)
  })

  test.each([true, false])('advanced with the nav hidden (site CSS %s): first on the page', (includeSiteCSS) => {
    render(<ProfilePage {...advanced} hideNavigation includeSiteCSS={includeSiteCSS} />)
    expect(screen.queryByTestId('site-nav')).toBeNull()
    const strip = stepOutside()!.closest('[data-site-chrome]')!
    expect(before(strip, screen.getByTestId('advanced-template'))).toBe(true)
  })

  test('advanced: room is left for the nav’s real height, not a flat 70px', () => {
    const rect = jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ height: 88.9 } as DOMRect)
    act(() => {
      render(<ProfilePage {...advanced} />)
    })
    const strip = stepOutside()!.closest('[data-site-chrome]')!
    expect((strip.parentElement as HTMLElement).style.marginTop).toBe('89px')
    rect.mockRestore()
  })
})
