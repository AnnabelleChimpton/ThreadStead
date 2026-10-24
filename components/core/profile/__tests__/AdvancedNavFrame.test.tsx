/**
 * The room under the fixed nav on a page of your own HTML comes from CSS, so
 * the server's HTML has it before any script runs; the measurement at
 * hydration only refines it.
 */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { render } from '@testing-library/react'
import AdvancedNavFrame from '../AdvancedNavFrame'

jest.mock('@/components/features/templates/NavigationPreview', () => function NavigationPreview() {
  return <div data-component-type="navigation" style={{ position: 'fixed' }} />
})

function serverRender(showNavigation: boolean) {
  return renderToString(
    <AdvancedNavFrame showNavigation={showNavigation}>
      <p>my page</p>
    </AdvancedNavFrame>
  )
}

/** The component's CSS, as styled-jsx puts it in the page */
function pageCss() {
  render(
    <AdvancedNavFrame showNavigation>
      <p>my page</p>
    </AdvancedNavFrame>
  )
  return Array.from(document.querySelectorAll('style'), (style) => style.textContent).join('\n').replace(/\s+/g, ' ')
}

describe('AdvancedNavFrame', () => {
  test("the server's HTML leaves the bar's height from CSS, with no inline guess", () => {
    const html = serverRender(true)
    expect(html).toMatch(/<div class="[^"]*ts-under-nav[^"]*">/)
    expect(html).not.toMatch(/margin-top|--ts-nav-height|70px/)
    const css = pageCss()
    expect(css).toMatch(/\.ts-under-nav[^{]*\{ ?margin-top: ?var\(--ts-nav-height, ?90px\) ?!important/)
    expect(css).toMatch(/@media ?\(max-width: ?1132px\) ?\{ ?\.ts-under-nav[^{]*\{ ?margin-top: ?var\(--ts-nav-height, ?101px\) ?!important/)
    // Below 1024px the links fold into the phone menu and the bar is shorter
    expect(css).toMatch(/@media ?\(max-width: ?1023px\) ?\{ ?\.ts-under-nav[^{]*\{ ?margin-top: ?var\(--ts-nav-height, ?89px\) ?!important/)
  })

  test('on a phone a page wider than the screen pans inside its own box', () => {
    // Not by widening the document, which pushed the fixed nav and its menu off an Android screen
    expect(serverRender(true)).toMatch(/<div[^>]*class="[^"]*ts-page-frame[^"]*"[^>]*>/)
    expect(pageCss()).toMatch(/@media ?\(max-width: ?1023px\) ?\{ ?\.ts-page-frame[^{]*\{ ?overflow-x: ?auto/)
  })

  test('without the nav there is no room to leave', () => {
    const html = serverRender(false)
    expect(html).not.toContain('ts-under-nav')
    expect(html).not.toContain('data-component-type="navigation"')
  })

  test('the measured bar refines it through the custom property', () => {
    const rect = jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ height: 95.2 } as DOMRect)
    try {
      const { container } = render(
        <AdvancedNavFrame showNavigation>
          <p>my page</p>
        </AdvancedNavFrame>
      )
      const under = container.querySelector('.ts-under-nav') as HTMLElement
      expect(under.style.getPropertyValue('--ts-nav-height')).toBe('96px')
      expect(under.style.marginTop).toBe('')
    } finally {
      rect.mockRestore()
    }
  })
})

describe('landmarks and focus (template audit 14 #1 #2)', () => {
  function frame(props: { showNavigation: boolean; pageHasMain?: boolean }) {
    document.body.innerHTML = renderToString(
      <AdvancedNavFrame {...props}>
        <p>my page</p>
      </AdvancedNavFrame>
    )
    return document.getElementById('main-content')!
  }

  test('the page is the main landmark, and a skip link leads to it past the nav', () => {
    const main = frame({ showNavigation: true })
    expect(main.getAttribute('role')).toBe('main')
    expect(main.getAttribute('tabindex')).toBe('-1')
    const skip = document.querySelector('a.skip-link')!
    expect(skip.getAttribute('href')).toBe('#main-content')
    // First in the page, before the nav; the site's own, out of the page's CSS
    expect(document.body.querySelector('a, [data-component-type="navigation"]')).toBe(skip)
    expect(skip.closest('[data-site-chrome]')).not.toBeNull()
  })

  test("a page with its own <main> isn't given a second", () => {
    expect(frame({ showNavigation: true, pageHasMain: true }).hasAttribute('role')).toBe(false)
  })

  test('with the nav hidden there is nothing to skip', () => {
    frame({ showNavigation: false })
    expect(document.querySelector('a.skip-link')).toBeNull()
  })

  test('focus and anchor jumps stop below the fixed nav', () => {
    expect(pageCss()).toMatch(/html:has\(\.ts-under-nav\)[^{]*\{ ?scroll-padding-top: ?98px/)
  })
})
