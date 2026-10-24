/**
 * The lessons (/build/html) are copied from, so every step's code compiles
 * with nothing warned about or taken out, and every check names something
 * real. The "bring your old page" step that pastes an old page is the one
 * exception for stripped tags: showing what gets taken out is its point.
 */
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { artifactFor } from '@/lib/templates/rendering/page-artifact'
import { componentRegistry } from '@/lib/templates/core/template-registry'
import { lessons, OLD_TUTORIALS, getLesson } from '@/lib/templates-docs/lessons'

const steps = lessons.flatMap((lesson) => lesson.steps.map((step) => [`${lesson.slug}: ${step.title}`, step] as const))

test.each(steps)('%s compiles clean', (_name, step) => {
  const artifacts = compileTemplateToArtifacts(step.code)
  expect(artifacts.warnings).toEqual([])
  expect(artifacts.strippedComponents.filter((s) => s.category !== 'document')).toEqual([])
})

test.each(steps)('%s checks name real components', (_name, step) => {
  for (const check of step.checks ?? []) {
    for (const name of ['uses' in check ? check.uses : null, 'inside' in check ? check.inside : null, 'inside' in check ? check.parent : null]) {
      if (name) expect(componentRegistry.get(name)?.name).toBe(name)
    }
  }
})

test('every old tutorial address goes somewhere that exists', () => {
  for (const target of Object.values(OLD_TUTORIALS)) {
    if (target === '/build/html') continue
    expect(getLesson(target.replace('/build/html/', ''))).toBeDefined()
  }
})

test('the first lesson is Make it yours, and the start shelf comes first', () => {
  expect(lessons[0].slug).toBe('make-it-yours')
  const shelves = lessons.map((l) => l.shelf)
  expect(shelves.lastIndexOf('start')).toBeLessThan(shelves.indexOf('further'))
})

describe('Check my work', () => {
  const { checkStep } = require('@/lib/templates-docs/lesson-checks') as typeof import('@/lib/templates-docs/lesson-checks')
  const page = (code: string) => {
    const a = compileTemplateToArtifacts(code)
    return { ...artifactFor(a), warnings: a.warnings, stripped: a.strippedComponents }
  }

  // Each step's own code meets its checks (all but "change the words": the
  // example still says Pat)
  test.each(steps)('%s: its own code passes', (_name, step) => {
    const checks = (step.checks ?? []).filter((c) => !('textChanged' in c))
    expect(checkStep(checks, page(step.code)).status).not.toBe('hint')
  })

  test('a missing piece gives that check\'s hint', () => {
    const step = getLesson('things-people-can-click')!.steps[0]
    const withoutVar = step.code.replace('<Var name="waves" type="number" initial="0" />', '')
    expect(checkStep(step.checks, page(withoutVar))).toEqual({ status: 'hint', hint: (step.checks![0] as { hint: string }).hint })
  })

  test('changing the words passes, keeping the example does not', () => {
    const step = getLesson('make-it-yours')!.steps[0]
    expect(checkStep(step.checks, page(step.code)).status).toBe('hint')
    expect(checkStep(step.checks, page(step.code.replace("I collect old radios and I'm trying to learn the banjo.", 'I keep bees.'))).status).toBe('ask')
  })

  test('when the page can be read it asks the self-check last', () => {
    const step = getLesson('things-people-can-click')!.steps[0]
    expect(checkStep(step.checks, page(step.code))).toEqual({ status: 'ask', question: 'Click Wave hello in the preview. Did the number go up?' })
  })
})
