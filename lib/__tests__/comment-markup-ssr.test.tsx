/**
 * Post bodies are in the server's HTML, not "Loading...": readers that never
 * run our JavaScript (feed readers, microformats parsers, sites checking a
 * webmention we sent, search engines) need the words and the links. Emojis
 * swap in after hydration.
 */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { HtmlWithEmojis, MarkdownWithEmojis, TextWithEmojis } from '../comment-markup'

describe('post bodies render on the server', () => {
  it('markdown, links included', () => {
    const html = renderToString(<MarkdownWithEmojis markdown={'A walk to [the river](https://jane.example/river) :smile:'} />)
    expect(html).not.toContain('Loading')
    expect(html).toContain('href="https://jane.example/river"')
    expect(html).toContain('the river')
  })

  it('stored HTML, sanitized again', () => {
    const html = renderToString(<HtmlWithEmojis html={'<p>See <a href="https://jane.example/">Jane</a></p><img src=x onerror=alert(1)>'} />)
    expect(html).not.toContain('Loading')
    expect(html).toContain('href="https://jane.example/"')
    expect(html).not.toContain('onerror')
  })

  it('plain text', () => {
    const html = renderToString(<TextWithEmojis text="Just words" />)
    expect(html).not.toContain('Loading')
    expect(html).toContain('Just words')
  })
})
