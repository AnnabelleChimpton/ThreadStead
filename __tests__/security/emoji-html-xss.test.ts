/**
 * The custom-emoji pass rewrites `:name:` inside already-sanitized HTML. The
 * regex also matches inside attribute values, so its output has to be
 * sanitized again or an attribute can be turned into live markup.
 */
import { cleanAndNormalizeHtml } from '@/lib/utils/sanitization/html'
import { loadEmojiMap, processHtmlWithEmojis } from '@/lib/comment-markup'

beforeAll(async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ emojis: [{ name: 'smile', imageUrl: 'https://cdn.example/smile.png' }] }),
  })) as unknown as typeof fetch
  await loadEmojiMap()
})

function render(html: string) {
  const el = document.createElement('div')
  el.innerHTML = html
  return el
}

describe('processHtmlWithEmojis', () => {
  it('cannot break out of a sanitized attribute', () => {
    const stored = cleanAndNormalizeHtml('<a title=":smile:<img src=x onerror=alert(1)>">t</a>')
    const el = render(processHtmlWithEmojis(stored))
    expect(el.querySelector('[onerror]')).toBeNull()
    expect(el.querySelector('img[src="x"]')).toBeNull()
  })

  it('still swaps emoji in text for an image with the ts-emoji class', () => {
    const el = render(processHtmlWithEmojis('<p>hi :smile:</p>'))
    const img = el.querySelector('img.ts-emoji')
    expect(img?.getAttribute('src')).toBe('https://cdn.example/smile.png')
    expect(img?.getAttribute('alt')).toBe(':smile:')
  })

  it('sanitizes HTML passed straight in, e.g. a post body', () => {
    const el = render(processHtmlWithEmojis('<p>x</p><img src=x onerror=alert(1)><script>alert(2)</script>'))
    expect(el.querySelector('[onerror], script')).toBeNull()
    expect(el.querySelector('p')?.textContent).toBe('x')
  })
})
