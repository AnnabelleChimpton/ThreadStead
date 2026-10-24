import React from 'react'
import { render } from '@testing-library/react'
import IslandPage from '@/lib/templates/rendering/IslandPage'
import { importantStyleRef, parseStyleString } from '../parse-style-string'

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

test('a comment before a declaration is dropped, not glued to its name', () => {
  expect(parseStyleString('/* old colour */ color: red; /* x */ margin: 0')).toEqual({ color: 'red', margin: '0' })
})

describe('!important in a style attribute (template audit 11 #2)', () => {
  // React's style objects can't carry importance; a page rendered in the
  // browser (preview, in-site navigation) lost those declarations entirely
  test('an element rendered in the browser keeps them, important', () => {
    const tree = [{ t: 'p', a: [['style', 'color: red !important; margin: 0']], c: ['hi'] }]
    const { container } = render(React.createElement(IslandPage, { tree, islands: [], residentData: {} } as never))
    const p = container.querySelector('p')!
    expect(p.style.getPropertyValue('color')).toBe('red')
    expect(p.style.getPropertyPriority('color')).toBe('important')
    expect(p.style.getPropertyPriority('margin')).toBe('')
  })

  test('no ref when there is nothing important', () => {
    expect(importantStyleRef({ color: 'red' })).toBeUndefined()
  })
})
