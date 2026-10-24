/**
 * No query reads a whole profile along with a user: `profile: true` (in an
 * include or a select) brought each person's page, source, CSS, compiled
 * copy and widget slot, with every chat message and ring post.
 */
import fs from 'fs'
import path from 'path'
import { PROFILE_WITHOUT_PAGE, profileWith } from '../profile-fields'

const ROOT = path.join(__dirname, '..', '..', '..', '..')

function sources(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : sources(rel)
    return /\.tsx?$/.test(entry.name) ? [rel] : []
  })
}

test('`profile: true` is nowhere in the code: it is PROFILE_WITHOUT_PAGE or profileWith(...)', () => {
  const found = ['lib', 'pages', 'components'].flatMap(sources).concat('server.ts').filter((file) =>
    /\bprofile: true\b/.test(fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''))
  )
  expect(found).toEqual([])
})

test('profileWith keeps the parts asked for and leaves out the rest', () => {
  expect(profileWith('customCSS')).toEqual({ omit: { customTemplate: true, compiledTemplate: true, widgetSlot: true } })
  expect(profileWith()).toEqual(PROFILE_WITHOUT_PAGE)
})
