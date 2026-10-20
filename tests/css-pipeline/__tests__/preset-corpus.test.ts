/**
 * Preset corpus: every shipped preset theme must survive the CSS transforms
 * the live page runs (pages/_app.tsx) without corruption. The old
 * @import-mangling bug broke ALL of these in production (each preset starts
 * with a font import).
 */
import {
  getDefaultProfileTemplate,
  getAvailableTemplateTypes,
  type ProfileTemplateType,
} from '@/lib/templates/default-profile-templates'
import {
  extractImports,
  scopeAwayFromSiteChrome,
  splitTopLevelStatements,
  transformAdvancedCss,
} from '@/lib/utils/css/css-transform'

/** What _app.tsx injects for each layout */
const TRANSFORMS = {
  // #profile-page-styles: the standard layout (default/enhanced)
  standard: (css: string) => {
    const { imports, rest } = extractImports(scopeAwayFromSiteChrome(css))
    return `${imports.join('\n')}\n${rest}`
  },
  // #advanced-template-css: your own HTML page
  advanced: (css: string) => transformAdvancedCss(css),
} as const

describe('every shipped preset survives the live CSS transforms', () => {
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

    for (const transform of Object.values(TRANSFORMS)) {
      const out = transform(presetCSS)

      // 1. Every @import from the source survives byte-intact, at the top
      for (const imp of sourceImports) {
        expect(out).toContain(imp)
      }
      const kinds = splitTopLevelStatements(out).map((s) => s.kind === 'at' && s.atName === 'import')
      const lastImport = kinds.lastIndexOf(true)
      const firstOther = kinds.indexOf(false)
      if (lastImport >= 0 && firstOther >= 0) expect(lastImport).toBeLessThan(firstOther)

      // 2. No truncated-import shrapnel: every @import line in the output is
      //    one of the source imports (nothing new or torn was fabricated)
      const outImports = out.match(/@import[^\n]*/g) || []
      for (const line of outImports) {
        expect(sourceImports.some((imp) => line.trim().startsWith(imp))).toBe(true)
      }

      // 3. Output parses cleanly: braces balance and nothing degrades to
      //    stray top-level text (the shrapnel signature)
      const stray = splitTopLevelStatements(out).filter((s) => s.kind === 'other')
      expect(stray).toEqual([])

      // 4. Keyframes in the preset survive with un-mangled stops
      if (presetCSS.includes('@keyframes')) {
        expect(out).toContain('@keyframes')
        expect(out).not.toMatch(/:scope[^{]*\s(from|to|\d+%)\s*\{/)
      }
    }
  })
})

describe('presets leave the site chrome alone', () => {
  // Profile CSS is scoped away from the site header and footer
  // (scopeAwayFromSiteChrome), so rules aimed at them can never apply.
  const CHROME = /(\.site-header|\.site-title|\.site-tagline|\.site-navigation|\.nav-link|#mobile-menu|\.site-footer|\.footer-[\w-]+)(?![\w-])/

  test.each(
    getAvailableTemplateTypes().filter((t): t is ProfileTemplateType => t !== 'clear')
  )('%s has no header, nav or footer rules', (type) => {
    const css = getDefaultProfileTemplate(type).replace(/\/\*[\s\S]*?\*\//g, '')
    expect(css).not.toMatch(CHROME)
  })
})
