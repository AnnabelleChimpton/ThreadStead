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

// Old browsers' fallbacks in one style attribute (bug bash 2026-10-26)
test("an old browser's spelling after a working value doesn't replace it", () => {
  expect(parseStyleString('background: #c0392b; background: -moz-linear-gradient(top, red, blue)').background).toBe('#c0392b')
  expect(parseStyleString('width: 260px; width: -moz-fit-content').width).toBe('260px')
  expect(parseStyleString('background: -webkit-gradient(linear, 0 0, 0 1, from(red)); background: linear-gradient(red, blue)').background).toBe('linear-gradient(red, blue)')
})

test('a later working value still wins, as in a browser', () => {
  expect(parseStyleString('color: red; color: blue').color).toBe('blue')
  expect(parseStyleString('background: -moz-linear-gradient(red, blue)').background).toBe('-moz-linear-gradient(red, blue)')
})

test("old Internet Explorer's *property and _property hacks are skipped", () => {
  expect(parseStyleString('*display: inline; _height: 1px; display: block')).toEqual({ display: 'block' })
})
