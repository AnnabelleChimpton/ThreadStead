/**
 * Preset corpus: every shipped preset theme must survive the full CSS
 * pipeline without corruption. The @import-mangling bug broke ALL of these
 * in production (each preset starts with a multi-weight Google Fonts import).
 */
import { generateOptimizedCSS } from '@/lib/utils/css/layers'
import {
  getDefaultProfileTemplate,
  getAvailableTemplateTypes,
  type ProfileTemplateType,
} from '@/lib/templates/default-profile-templates'
import { splitTopLevelStatements } from '@/lib/utils/css/css-transform'

const MODES = [
  ['inherit', 'enhanced'],
  ['override', 'enhanced'],
  ['disable', 'enhanced'],
  ['inherit', 'advanced'],
  ['disable', 'advanced'],
] as const

describe('every shipped preset survives the pipeline in every mode', () => {
  const types = getAvailableTemplateTypes().filter(
    (t): t is ProfileTemplateType => t !== 'clear'
  )

  test.each(types)('%s', (type) => {
    const presetCSS = getDefaultProfileTemplate(type)
    expect(presetCSS.trim().length).toBeGreaterThan(0)

    // Collect the preset's own @import statements (intact, from the source)
    const sourceImports = splitTopLevelStatements(presetCSS)
      .filter((s) => s.kind === 'at' && s.atName === 'import')
      .map((s) => `${s.prelude};`)

    for (const [cssMode, templateMode] of MODES) {
      const out = generateOptimizedCSS({
        cssMode,
        templateMode,
        siteWideCSS: '.site { color: gray; }',
        userCustomCSS: presetCSS,
        profileId: 'profile-test',
      })

      // 1. Every @import from the source survives byte-intact
      for (const imp of sourceImports) {
        expect(out).toContain(imp)
      }

      // 2. No truncated-import shrapnel: every @import line in the output is
      //    one of the source imports (nothing new or torn was fabricated)
      const outImports = out.match(/@import[^\n]*/g) || []
      for (const line of outImports) {
        expect(sourceImports.some((imp) => line.trim().startsWith(imp))).toBe(true)
      }

      // 3. Output parses cleanly: braces balance and nothing degrades to
      //    stray top-level text (the shrapnel signature)
      const layerBodies = out // whole output is parseable CSS text
      const stmts = splitTopLevelStatements(layerBodies)
      const stray = stmts.filter((s) => s.kind === 'other')
      expect(stray).toEqual([])

      // 4. Keyframes in the preset survive with un-mangled stops
      if (presetCSS.includes('@keyframes')) {
        expect(out).toContain('@keyframes')
        expect(out).not.toMatch(/#profile-test\s+(from|to|\d+%)/)
      }
    }
  })
})
