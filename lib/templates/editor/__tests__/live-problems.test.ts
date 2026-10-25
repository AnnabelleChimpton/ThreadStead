/**
 * Problems with a line are marked on it in the gutter (problemMarks): what
 * stops a save as an error, the rest as warnings, from the line's first
 * character to its end.
 */
import { Text } from '@codemirror/state'
import { NO_PROBLEMS, problemMarks } from '../live-problems'

const doc = Text.of(['<main>', '  <Guestbok />', '  <img src="a.png">', '</main>'])

test('each problem with a line, on that line', () => {
  const marks = problemMarks(doc, {
    ...NO_PROBLEMS,
    status: 'failed',
    errors: ['Line 2: <Guestbok> is not a component. Did you mean <Guestbook>?', 'The page is too big.'],
    warnings: ['Line 3: this picture has no alt text.'],
    stripped: [
      { name: 'script', line: 4, reason: 'Scripts don’t run here.', category: 'safety' },
      { name: 'html', line: 1, category: 'document' },
    ],
  })
  const line = (n: number) => doc.line(n)
  expect(marks).toEqual([
    { from: line(2).from + 2, to: line(2).to, severity: 'error', message: '<Guestbok> is not a component. Did you mean <Guestbook>?' },
    { from: line(3).from + 2, to: line(3).to, severity: 'warning', message: 'this picture has no alt text.' },
    { from: line(4).from, to: line(4).to, severity: 'warning', message: '<script>: Scripts don’t run here.' },
  ])
})

test('a line past the end lands on the last one', () => {
  const [mark] = problemMarks(doc, { ...NO_PROBLEMS, status: 'ok', warnings: ['Line 99: something'] })
  expect(mark.from).toBe(doc.line(4).from)
})
