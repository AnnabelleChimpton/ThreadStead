import { parseStyleString } from '../parse-style-string'

test('a link keeps its colons', () => {
  expect(parseStyleString('background-image: url(https://example.com/a.png); color: red')).toEqual({
    backgroundImage: 'url(https://example.com/a.png)',
    color: 'red',
  })
})

test('a data: URI keeps its semicolon', () => {
  expect(parseStyleString('background: url("data:image/png;base64,AAAA") no-repeat; margin:0')).toEqual({
    background: 'url("data:image/png;base64,AAAA") no-repeat',
    margin: '0',
  })
})

test('ordinary declarations, custom properties and junk', () => {
  expect(parseStyleString('font-size:2em;;  --accent: plum ; -webkit-transform: none; nonsense; : x')).toEqual({
    fontSize: '2em',
    '--accent': 'plum',
    WebkitTransform: 'none',
  })
  expect(parseStyleString('')).toEqual({})
})
