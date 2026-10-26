import { externalPostBody } from '../external-post'

test('a web address becomes the link, in both bodies', () => {
  expect(externalPostBody('https://example.com/post/1?a=1&b=2')).toEqual({
    externalUrl: 'https://example.com/post/1?a=1&b=2',
    bodyHtml: '<p>This post is from an external source. <a href="https://example.com/post/1?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">View original post</a></p>',
    bodyMarkdown: 'This post is from an external source. [View original post](https://example.com/post/1?a=1&b=2)',
  })
})

test("quotes, brackets and parentheses can't end the link early", () => {
  const { bodyHtml, bodyMarkdown } = externalPostBody('https://example.com/a"><b>(x)')
  expect(bodyHtml).not.toContain('"><b>')
  expect(bodyMarkdown).toContain('%28x%29')
  expect(bodyMarkdown.match(/\)/g)).toHaveLength(1)
})

test.each(['javascript:alert(1)', 'data:text/html,hi', 'not a url', 42, undefined])('%p gets no link', (uri) => {
  expect(externalPostBody(uri)).toEqual({
    externalUrl: null,
    bodyHtml: '<p>This post is from an external source.</p>',
    bodyMarkdown: 'This post is from an external source.',
  })
})
