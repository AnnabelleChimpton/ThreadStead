/**
 * The first tutorial (Make It Yours) is where new people copy code from, so
 * every step has to compile with nothing warned about or taken out.
 */
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { getTutorialBySlug, tutorials } from '@/lib/templates-docs/tutorialContent'

const first = getTutorialBySlug('make-it-yours')!

test('it is the first tutorial, and leads into the next one', () => {
  expect(tutorials[0].slug).toBe('make-it-yours')
  expect(getTutorialBySlug(first.nextTutorial!)).toBeDefined()
})

test.each(first.steps.map((step) => [step.title, step.code]))('%s compiles clean', (_title, code) => {
  const artifacts = compileTemplateToArtifacts(code)
  expect(artifacts.warnings).toEqual([])
  expect(artifacts.strippedComponents).toEqual([])
})
