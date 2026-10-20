/**
 * The CSS guide and the editor's class list name classes people will write
 * CSS for, so every one has to be on the site somewhere (a class nothing
 * renders is a rule that silently does nothing).
 */
import fs from 'fs'
import path from 'path'
import { CSS_CLASSES } from '@/lib/templates-docs/css-classes'

const root = path.resolve(__dirname, '../../..')
const SKIP = new Set(['node_modules', '.next', '__tests__'])
function sources(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.startsWith('.next')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) sources(full, out)
    else if (/\.(tsx?|css)$/.test(entry.name) && !/css-classes\.ts$|CSSClassReference\.tsx$|pages\/build\/css\.tsx$/.test(full)) out.push(full)
  }
  return out
}
const code = ['components', 'pages', 'styles', 'lib'].flatMap((d) => sources(path.join(root, d))).map((f) => fs.readFileSync(f, 'utf8')).join('\n')

const names = Object.values(CSS_CLASSES).flat().map((c) => c.name)
test.each(names)('%s is rendered somewhere', (name) => {
  const cls = name.replace(/^\./, '').split(/[\s[:]/)[0]
  expect(code).toMatch(new RegExp(`(^|[\\s"'\`.])${cls.replace(/[-]/g, '\\-')}($|[\\s"'\`])`, 'm'))
})
