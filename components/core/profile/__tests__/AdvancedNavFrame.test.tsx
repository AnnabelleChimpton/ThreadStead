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
