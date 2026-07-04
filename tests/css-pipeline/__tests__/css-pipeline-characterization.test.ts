/**
 * CHARACTERIZATION TESTS for the CSS customization pipeline (lib/utils/css/layers.ts).
 *
 * These tests pin CURRENT behavior — including known bugs, which are marked
 * `BUG PIN`. They are the safety net for any CSS-pipeline refactor: a change
 * that alters any of these outcomes must flip the assertion DELIBERATELY, in
 * the same commit, with the reasoning written down.
 *
 * Verified against production (homepageagain.com, 2026-07-04): the mangled
 * output asserted in the BUG PIN tests is byte-for-byte what the live site
 * serves for an enhanced-mode profile using the Pixel Petals preset.
 *
 * The full pipeline map (injection points, phantom anchor, duplicate raw
 * injection in _app.tsx) lives in the audit notes; these tests cover the
 * pure-function core.
 */
import {
  generateLayeredCSS,
  generateOptimizedCSS,
  forceUserCSSDominance,
  LAYER_ORDER_DECLARATION,
  CSS_LAYERS,
} from '@/lib/utils/css/layers'

const PROFILE_ID = 'profile-abc123'

describe('layer order declaration', () => {
  test('every layered output starts with the full layer order', () => {
    const out = generateLayeredCSS({
      cssMode: 'inherit',
      templateMode: 'enhanced',
      userCustomCSS: '.foo { color: red; }',
      profileId: PROFILE_ID,
    })
    expect(out.startsWith(LAYER_ORDER_DECLARATION)).toBe(true)
    expect(LAYER_ORDER_DECLARATION).toBe(
      '@layer threadstead-browser, threadstead-reset, threadstead-global, threadstead-site, ' +
        'threadstead-components, threadstead-template, threadstead-user-base, ' +
        'threadstead-user-custom, threadstead-user-override, threadstead-user-nuclear;'
    )
  })
})

describe('cssMode gating of site/global/component CSS', () => {
  const base = {
    templateMode: 'enhanced' as const,
    globalCSS: '.g { color: black; }',
    siteWideCSS: '.s { color: gray; }',
    componentCSS: '.c { color: blue; }',
    userCustomCSS: '.u { color: red; }',
    profileId: PROFILE_ID,
  }

  test('inherit: global, site, and component layers all present', () => {
    const out = generateLayeredCSS({ ...base, cssMode: 'inherit' })
    expect(out).toContain(`@layer ${CSS_LAYERS.GLOBAL_BASE}`)
    expect(out).toContain(`@layer ${CSS_LAYERS.SITE_WIDE}`)
    expect(out).toContain(`@layer ${CSS_LAYERS.COMPONENT_BASE}`)
  })

  test('override: same layer inclusion as inherit (modes differ only in intent)', () => {
    const inherit = generateLayeredCSS({ ...base, cssMode: 'inherit' })
    const override = generateLayeredCSS({ ...base, cssMode: 'override' })
    // CURRENT BEHAVIOR: inherit and override produce IDENTICAL output — the
    // three-way mode switch in generateLayeredCSS has three identical branches.
    expect(override).toBe(inherit)
  })

  test('disable: no global/site/component layers, user CSS still emitted', () => {
    const out = generateLayeredCSS({ ...base, cssMode: 'disable' })
    expect(out).not.toContain(`@layer ${CSS_LAYERS.GLOBAL_BASE}`)
    expect(out).not.toContain(`@layer ${CSS_LAYERS.SITE_WIDE}`)
    expect(out).not.toContain(`@layer ${CSS_LAYERS.COMPONENT_BASE}`)
    expect(out).toContain(`@layer ${CSS_LAYERS.USER_NUCLEAR}`)
  })
})

describe('user CSS scoping (scopeCSSToProfile via public API)', () => {
  const gen = (css: string) =>
    generateLayeredCSS({
      cssMode: 'inherit',
      templateMode: 'enhanced',
      userCustomCSS: css,
      profileId: PROFILE_ID,
    })

  test('plain selectors get profile-id scoping plus nuclear prefix and !important', () => {
    const out = gen('.foo { color: red; }')
    expect(out).toContain(`html body html body #${PROFILE_ID} .foo { color: red !important;`)
  })

  test('body selector becomes nuclear-prefixed .profile-template-root#profileId', () => {
    const out = gen('body { background: pink; }')
    expect(out).toContain(`html body html body .profile-template-root#${PROFILE_ID} { background: pink !important;`)
  })

  test(':root selector becomes nuclear-prefixed .profile-template-root#profileId', () => {
    const out = gen(':root { --x: 1; }')
    expect(out).toContain(`html body html body .profile-template-root#${PROFILE_ID} { --x: 1 !important;`)
  })

  test('.vb-* selectors get dual targeting (container itself + descendants)', () => {
    const out = gen('.vb-theme-sunset { color: teal; }')
    expect(out).toContain(`#${PROFILE_ID}.vb-theme-sunset`)
    expect(out).toContain(`#${PROFILE_ID} .vb-theme-sunset`)
  })

  test('multiple comma-separated selectors are each scoped', () => {
    const out = gen('.a, .b { color: red; }')
    expect(out).toContain(`#${PROFILE_ID} .a`)
    expect(out).toContain(`#${PROFILE_ID} .b`)
  })

  test('rules inside @media are scoped but NOT nuclear-wrapped', () => {
    const out = gen('@media (max-width: 600px) { .foo { color: red; } }')
    // Inner selector gets profile scoping…
    expect(out).toContain(`#${PROFILE_ID} .foo`)
    // …but the whole @media block is extracted before nuclear processing,
    // so no html-body prefix and no forced !important inside it.
    const media = out.slice(out.indexOf('@media'))
    expect(media).not.toContain('html body html body')
    expect(media).not.toContain('!important')
  })

  test('BUG PIN: @keyframes stops get profile-scoped, producing invalid CSS', () => {
    // scopeCSSToProfile's selector regex treats keyframe stops (from/to/50%)
    // as selectors and prefixes them with the profile id:
    //   @keyframes spin {#profile-x from {...}#profile-x to {...}}
    // That is invalid CSS — browsers drop the block, so USER ANIMATIONS
    // SILENTLY NEVER RUN when defined in profile custom CSS.
    // WHEN THIS IS FIXED: invert these assertions in the same commit.
    const out = gen('@keyframes spin { from { transform: rotate(0); } to { transform: rotate(1turn); } }')
    expect(out).toContain('@keyframes spin')
    expect(out).toContain(`#${PROFILE_ID} from`)
  })
})

describe('nuclear dominance (forceUserCSSDominance)', () => {
  test('adds !important to every declaration, preserves existing !important', () => {
    const out = forceUserCSSDominance('.a { color: red; font-size: 12px !important; }', 'inherit')
    expect(out).toContain('color: red !important;')
    // CURRENT BEHAVIOR: already-!important declarations are left alone
    expect(out).not.toContain('!important !important')
  })

  test('selectors already starting with "html body" are not double-wrapped', () => {
    const out = forceUserCSSDominance('html body .a { color: red; }', 'inherit')
    expect(out).toContain('html body .a {')
    expect(out).not.toContain('html body html body html body')
  })

  test('disable mode + .vb- classes: double wrap + full-page override block', () => {
    // NOTE: the triple-wrap branch (`html body html body html body`) is DEAD
    // CODE for .vb- selectors — the earlier .vb- special-case returns first
    // with a double wrap. Only the appended override block uses triple wrap.
    const out = forceUserCSSDominance('.vb-theme-x { color: red; }', 'disable')
    expect(out).toContain('html body html body .vb-theme-x')
    expect(out).not.toContain('html body html body html body .vb-theme-x')
    expect(out).toContain('VISUAL BUILDER ABSOLUTE OVERRIDES')
    expect(out).toContain('html body html body html body html {')
  })

  test('empty input produces empty output', () => {
    expect(forceUserCSSDominance('', 'inherit')).toBe('')
    expect(forceUserCSSDominance('   ', 'inherit')).toBe('')
  })
})

describe('generateOptimizedCSS mode selection', () => {
  const opts = {
    userCustomCSS: '.foo { color: red; }',
    profileId: PROFILE_ID,
  }

  test('advanced + disable forces NON-layered fallback (unlayered beats Tailwind)', () => {
    const out = generateOptimizedCSS({ ...opts, cssMode: 'disable', templateMode: 'advanced' })
    expect(out).not.toContain('@layer')
    expect(out).toContain('NUCLEAR FALLBACK')
  })

  test('all other mode combinations produce layered output', () => {
    const combos: Array<['inherit' | 'override' | 'disable', 'default' | 'enhanced' | 'advanced']> = [
      ['inherit', 'default'], ['inherit', 'enhanced'], ['inherit', 'advanced'],
      ['override', 'default'], ['override', 'enhanced'], ['override', 'advanced'],
      ['disable', 'default'], ['disable', 'enhanced'],
    ]
    for (const [cssMode, templateMode] of combos) {
      const out = generateOptimizedCSS({ ...opts, cssMode, templateMode })
      expect(out.startsWith(LAYER_ORDER_DECLARATION)).toBe(true)
    }
  })

  test('advanced + non-disable adds navigation helper layer', () => {
    const out = generateOptimizedCSS({ ...opts, cssMode: 'inherit', templateMode: 'advanced' })
    expect(out).toContain('.advanced-template-nav')
    expect(out).toContain(`@layer ${CSS_LAYERS.USER_OVERRIDE}`)
  })
})

describe('BUG PIN: @import extraction corrupts semicolon-containing URLs', () => {
  // Multi-weight Google Fonts URLs contain semicolons (wght@400;600;700).
  // Both scopeCSSToProfile and forceUserCSSDominance extract imports with
  // /@import\s+[^;]+;/ which truncates at the FIRST semicolon INSIDE the URL,
  // hoisting a broken import and leaving URL shrapnel in the CSS body.
  // Every shipped preset theme (e.g. Pixel Petals) uses such a URL, and the
  // corrupted output below is exactly what production serves today.
  // WHEN THIS IS FIXED: these assertions must be inverted in the same commit.
  const PIXEL_PETALS_HEAD =
    "@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;600;700&family=Quicksand:wght@400;500;600&display=swap');\n" +
    '.thread-surface { background: pink; }'

  const out = generateLayeredCSS({
    cssMode: 'inherit',
    templateMode: 'enhanced',
    userCustomCSS: PIXEL_PETALS_HEAD,
    profileId: PROFILE_ID,
  })

  test('the hoisted @import is truncated mid-URL (fonts cannot load)', () => {
    expect(out).toContain("@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;")
    expect(out).not.toContain("display=swap');\n@") // intact import never appears as a unit
  })

  test('URL shrapnel remains in the rule body', () => {
    expect(out).toContain('600;700&family=Quicksand')
  })

  test('rules FOLLOWING the mangled import escape profile scoping entirely', () => {
    // .thread-surface should have been scoped to `#profile-abc123 .thread-surface`,
    // but the shrapnel derails the selector regex, so it stays unscoped. In
    // production this accident is the ONLY reason enhanced-mode CSS visibly
    // applies at all (see phantom-anchor note below).
    expect(out).not.toContain(`#${PROFILE_ID} .thread-surface`)
    expect(out).toContain('.thread-surface {')
  })

  test('a semicolon-free @import survives intact (control case)', () => {
    const clean = generateLayeredCSS({
      cssMode: 'inherit',
      templateMode: 'enhanced',
      userCustomCSS: "@import url('https://example.com/simple.css');\n.foo { color: red; }",
      profileId: PROFILE_ID,
    })
    expect(clean).toContain("@import url('https://example.com/simple.css');")
    expect(clean).toContain(`html body html body #${PROFILE_ID} .foo`)
  })
})

describe('DOCUMENTED FACT: the default/enhanced scoping anchor is phantom', () => {
  // ProfileLayout and the profile page SSR both call generateOptimizedCSS with
  // profileId: 'profile-layout', but NO element in the default/enhanced DOM
  // carries id="profile-layout" (only data-component="profile-layout") and the
  // .profile-template-root class only exists in ADVANCED mode
  // (AdvancedProfileRenderer renders id=`profile-${user.id}`).
  // Consequence: correctly-scoped enhanced-mode rules match nothing; pages are
  // actually styled by the RAW duplicate injection in _app.tsx
  // (#profile-page-styles). This test pins the generated selector shape so the
  // mismatch stays visible.
  test('body rules for the SSR profileId target a selector that has no DOM match', () => {
    const out = generateLayeredCSS({
      cssMode: 'inherit',
      templateMode: 'enhanced',
      userCustomCSS: 'body { background: pink; }',
      profileId: 'profile-layout',
    })
    expect(out).toContain('.profile-template-root#profile-layout')
  })
})
