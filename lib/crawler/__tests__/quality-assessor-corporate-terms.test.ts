import { QualityAssessor } from '../quality-assessor'
import type { ExtractedContent } from '../content-extractor'

const content = (text: string): ExtractedContent =>
  ({ title: 'My site', description: '', snippet: text, contentLength: 1000, links: [] } as unknown as ExtractedContent)

const individual = (text: string) => (new QualityAssessor() as any).hasIndividualScale(content(text)) as boolean

describe('corporate-terms check uses word boundaries', () => {
  test.each([
    "I've been blogging since 2009",
    'Please confirm your email',
    'Notes on steam engines',
    'She explains her process',
    'A bunch of incense recipes',
  ])('personal text is not flagged: %s', (text) => {
    expect(individual(text)).toBe(true)
  })

  test.each(['Acme Inc. — enterprise solutions', 'See our pricing', 'Join our team', 'Careers at Foo LLC'])(
    'corporate text is still flagged: %s',
    (text) => {
      expect(individual(text)).toBe(false)
    }
  )
})
