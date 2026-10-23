import { countOf } from '@/lib/utils/count-of'

describe('countOf', () => {
  it('uses the singular for exactly one', () => {
    expect(countOf(1, 'member')).toBe('1 member')
  })

  it('uses the plural otherwise, zero included', () => {
    expect(countOf(0, 'post')).toBe('0 posts')
    expect(countOf(12, 'member')).toBe('12 members')
  })

  it('takes an irregular plural', () => {
    expect(countOf(2, 'person', 'people')).toBe('2 people')
  })
})
