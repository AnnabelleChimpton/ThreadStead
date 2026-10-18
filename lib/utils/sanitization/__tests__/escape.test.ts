import { escapeHtml, plainTextToHtml } from '../escape'

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#x27;y&#x27;&gt;&amp;&lt;/a&gt;'
    )
  })
})

describe('plainTextToHtml', () => {
  it('keeps line breaks and nothing else', () => {
    expect(plainTextToHtml('one\ntwo\r\nthree')).toBe('one<br>two<br>three')
  })

  it('turns markup in a plain-text post into inert text', () => {
    const el = document.createElement('div')
    el.innerHTML = plainTextToHtml('hi\n<img src=x onerror=alert(1)><script>alert(2)</script>')
    expect(el.querySelector('img, script')).toBeNull()
    expect(el.textContent).toBe('hi<img src=x onerror=alert(1)><script>alert(2)</script>')
  })
})
