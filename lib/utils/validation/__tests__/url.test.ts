import { isHttpUrl, URL_MAX_LENGTH } from '../url';

test.each(['https://example.com', 'http://example.com/a?b=c#d', 'HTTPS://EXAMPLE.COM'])('%s is a web address', (url) => {
  expect(isHttpUrl(url)).toBe(true);
});

test.each([
  'javascript:void(0)',
  ' javascript:void(0)',
  'data:text/html,hi',
  'mailto:me@example.com',
  'example.com',
  '',
  `https://example.com/${'a'.repeat(URL_MAX_LENGTH)}`,
  42,
  null,
])('%p is not', (url) => {
  expect(isHttpUrl(url)).toBe(false);
});
