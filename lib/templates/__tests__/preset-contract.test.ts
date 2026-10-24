/**
 * The profile presets (lib/templates/{classic-linen,…}.ts), as residents
 * get them at signup and from the theme picker:
 *  - their fonts come from this site, so a visitor's browser asks nobody else;
 *  - every font file they name exists under public/fonts/presets;
 *  - their colours and fonts sit in one :root block of --ts-* variables, which
 *    the Appearance knobs rewrite;
 *  - they end with the shared block that themes the guestbook, buttons and
 *    labels (preset-chrome.ts).
 */
import fs from 'fs'
import path from 'path'
import { getDefaultProfileTemplate, PROFILE_THEME_IDS } from '@/lib/templates/default-profile-templates'
import { PRESET_CHROME_CSS } from '@/lib/templates/preset-chrome'
import { cssProblems } from '@/lib/utils/css/css-problems'

const PRESETS = PROFILE_THEME_IDS
const VARIABLES = ['ground', 'card', 'ink', 'accent', 'on-accent', 'font-head', 'font-body']
const fontsDir = path.resolve(__dirname, '../../../public/fonts/presets')

describe.each(PRESETS)('%s', (preset) => {
  const css = getDefaultProfileTemplate(preset)

  test('loads nothing from another site', () => {
    expect(css).not.toMatch(/@import/)
    expect(css).not.toMatch(/googleapis|gstatic/)
    const urls = [...css.matchAll(/url\(\s*['"]?([^'")]+)/g)].map((m) => m[1])
    for (const url of urls) expect(url.startsWith('/') || url.startsWith('data:')).toBe(true)
  })

  test('every font file it names is on disk', () => {
    // Retro Social (Verdana) and Starfield (Times New Roman) use fonts every
    // computer has, so they name none
    const files = [...css.matchAll(/url\('\/fonts\/presets\/([^']+)'\)/g)].map((m) => m[1])
    for (const file of files) expect(fs.existsSync(path.join(fontsDir, file))).toBe(true)
  })

  test('declares the theme variables once, and uses them', () => {
    const root = css.match(/:root \{([^}]*)\}/)
    expect(root).not.toBeNull()
    for (const name of VARIABLES) expect(root![1]).toContain(`--ts-${name}:`)
    expect(css.match(/:root \{/g)).toHaveLength(1)
    for (const name of ['ground', 'ink', 'accent', 'font-head', 'font-body']) {
      expect(css).toContain(`var(--ts-${name})`)
    }
  })

  test("ends with the block that themes ThreadStead's own parts", () => {
    expect(css.trimEnd().endsWith(PRESET_CHROME_CSS.trimEnd())).toBe(true)
  })

  test('has nothing in the CSS pane\'s problems list (the sanitizer removes nothing)', () => {
    expect(cssProblems(css)).toEqual([])
  })
})
