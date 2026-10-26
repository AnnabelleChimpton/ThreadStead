import { componentRegistry } from '@/lib/templates/core/template-registry'
import { buildComponentDocs } from '../component-docs'
import { searchComponents, firstSentence } from '../component-search'

const docs = buildComponentDocs(componentRegistry.getAllRegistrations())
const names = (query: string, n = 5) => searchComponents(docs, query).slice(0, n).map((doc) => doc.name)

describe('component search: best match first', () => {
  it('puts the component named first, however it is typed', () => {
    expect(names('OnClick')[0]).toBe('OnClick')
    expect(names('onclick')[0]).toBe('OnClick')
    expect(names('<OnClick>')[0]).toBe('OnClick')
    expect(names('on click')[0]).toBe('OnClick')
    expect(names('guest')[0]).toBe('Guestbook')
    expect(names('var')[0]).toBe('Var')
  })

  it('finds components by what people want', () => {
    expect(names('click', 2)).toEqual(['OnClick', 'Button'])
    expect(names('game', 8)).toEqual(expect.arrayContaining(['ForEach', 'OnKeyPress', 'OnSwipe', 'OnInterval']))
    expect(names('swipe')[0]).toBe('OnSwipe')
    expect(names('keyboard', 2).sort()).toEqual(['OnKeyPress', 'OnKeyUp'])
    expect(names('music')[0]).toBe('ProfileMusic')
    expect(names('picture', 3)).toContain('ProfilePhoto')
  })

  it('needs every word to match, and keeps the full list for an empty search', () => {
    expect(names('swipe zebra')).toEqual([])
    expect(searchComponents(docs, '  ')).toHaveLength(docs.length)
  })
})

test('firstSentence', () => {
  expect(firstSentence('Runs it. Then more.')).toBe('Runs it.')
  expect(firstSentence('No full stop')).toBe('No full stop')
  expect(firstSentence('Use e.g. this')).toBe('Use e.g. this')
})
