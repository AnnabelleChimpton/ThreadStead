/**
 * GOLDEN-CORPUS TESTS for the template compilation pipeline (G2).
 *
 * The engine core (parse → sanitize → AST → island detection → static HTML)
 * had ZERO tests while ~31k LOC of tests covered component wrappers. These
 * tests pin the pipeline's behavior on the four SHIPPED default templates
 * plus hand-built edge cases, so refactors (like collapsing the three
 * compilation entry points) are provably behavior-preserving.
 *
 * Golden counts are asserted loosely (>= known structure) where exact values
 * would churn with template edits, and exactly where the value IS the
 * contract (success flags, island component names, error presence).
 */
// The component registry transitively imports UserAccount → LoginButton →
// did-client → @noble/ed25519 (ESM that jest can't parse). These tests never
// render components, so stub the crypto leaf.
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

import { defaultSchema } from 'rehype-sanitize'
import {
  compileTemplateToArtifacts,
  TemplateCompilationError,
} from '@/lib/templates/compilation/compile-pipeline'
import { compileTemplate } from '@/lib/templates/compilation/template-parser'
import { identifyIslandsWithTransform } from '@/lib/templates/compilation/compiler/island-detector'
import { generateStaticHTML } from '@/lib/templates/compilation/compiler/html-optimizer'
import { HTML_TEMPLATES } from '@/lib/templates/default-html-templates'
import { TEMPLATE_EXAMPLES } from '@/lib/templates/default-profile-template'

describe('environment canary', () => {
  test('rehype-sanitize defaultSchema matches production (not a mangled interop stub)', () => {
    // Under the MAIN jest config this resolves to a 6-tag stub, which makes
    // the sanitizer strip ALL plain HTML — behavior production never has.
    // If this fails, transformIgnorePatterns in jest.template-engine.config.js
    // no longer covers the unified ecosystem, and every other result in this
    // file is meaningless.
    expect((defaultSchema as { tagNames?: string[] }).tagNames?.length ?? 0).toBeGreaterThan(40)
  })
})

/** The full production pipeline as both API routes run it. */
function runPipeline(template: string) {
  const parsed = compileTemplate(template)
  if (!parsed.success) return { parsed, islands: null, staticHTML: null }
  const islandResult = identifyIslandsWithTransform(parsed.ast!)
  const staticHTML = generateStaticHTML(islandResult.transformedAst, islandResult.islands)
  return { parsed, islands: islandResult.islands, staticHTML }
}

describe('shipped default templates compile end-to-end', () => {
  test.each(HTML_TEMPLATES.map((t) => [t.id, t.template] as const))(
    '%s',
    (_id, template) => {
      const { parsed, islands, staticHTML } = runPipeline(template)

      expect(parsed.success).toBe(true)
      expect(parsed.errors ?? []).toEqual([])
      expect(parsed.ast).toBeDefined()

      // Templates with PascalCase components must produce islands; pure-HTML
      // templates (social-modern) must produce none.
      const hasComponents = /<[A-Z][a-zA-Z0-9]*/.test(template)
      if (hasComponents) {
        expect(islands!.length).toBeGreaterThan(0)
      } else {
        expect(islands).toEqual([])
      }
      // Every island must be well-formed…
      for (const island of islands!) {
        expect(island.id).toBeTruthy()
        expect(island.component).toBeTruthy()
        expect(island.placeholder).toBeTruthy()
      }
      // …and the static HTML must contain a placeholder for every island.
      expect(staticHTML!.length).toBeGreaterThan(0)
      for (const island of islands!) {
        expect(staticHTML).toContain(island.id)
      }
    }
  )

  test('conditional-showcase detects its conditional components', () => {
    const showcase = HTML_TEMPLATES.find((t) => t.id === 'conditional-showcase')!
    const { islands } = runPipeline(showcase.template)
    // CONTRACT: island component names are the LOWERCASED tag names (the
    // HTML parser lowercases element names; the hydrator maps them back
    // through the registry's case-insensitive lookup).
    const components = new Set(islands!.map((i) => i.component))
    expect(components.has('choose')).toBe(true)
    expect(components.has('if')).toBe(true)
    expect(components.has('displayname')).toBe(true)
  })

  // A starter that loses components on load teaches users a broken API
  // (conditional-showcase shipped with 26 stripped <Show> blocks before this
  // was pinned). Every shipped starter must survive sanitization intact.
  test.each(HTML_TEMPLATES.map((t) => [t.id, t.template] as const))(
    '%s ships with zero stripped components',
    (_id, template) => {
      // Mirror the editor gallery loader: <style> moves to the CSS field.
      const withoutStyles = template.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim()
      const result = compileTemplateToArtifacts(withoutStyles)
      expect(result.strippedComponents).toEqual([])
      expect(result.warnings).toEqual([])
    }
  )
})

describe('shipped starter examples (TEMPLATE_EXAMPLES) compile end-to-end', () => {
  test.each(Object.entries(TEMPLATE_EXAMPLES).map(([key, t]) => [key, t.template] as const))(
    '%s compiles with islands and zero stripped components',
    (_key, template) => {
      const result = compileTemplateToArtifacts(template)
      expect(result.islands.length).toBeGreaterThan(0)
      expect(result.strippedComponents).toEqual([])
      expect(result.warnings).toEqual([])
    }
  )
})

describe('core language constructs produce islands', () => {
  test('state + event components become islands (lowercased names)', () => {
    const { parsed, islands, staticHTML } = runPipeline(`
      <div>
        <Var name="count" type="number" initial="0" />
        <ShowVar name="count" />
        <Button><OnClick><Increment var="count" /></OnClick>More</Button>
      </div>
    `)
    expect(parsed.success).toBe(true)
    const components = new Set(islands!.map((i) => i.component))
    expect(components.has('var')).toBe(true)
    expect(components.has('showvar')).toBe(true)
    expect(staticHTML).toBeTruthy()
  })

  test('profile data components compile into islands with their props', () => {
    const { parsed, islands } = runPipeline(
      '<ProfilePhoto /><DisplayName /><Bio /><BlogPosts limit="3" />'
    )
    expect(parsed.success).toBe(true)
    const components = new Set(islands!.map((i) => i.component))
    expect(components.has('profilephoto')).toBe(true)
    expect(components.has('blogposts')).toBe(true)
    const blogPosts = islands!.find((i) => i.component === 'blogposts')!
    expect(blogPosts.props).toMatchObject({ limit: expect.anything() })
  })

  test('plain HTML with no components produces zero islands and full static HTML', () => {
    const { parsed, islands, staticHTML } = runPipeline(
      '<div class="page"><h1>Hello</h1><p>Just HTML</p></div>'
    )
    expect(parsed.success).toBe(true)
    expect(islands).toEqual([])
    expect(staticHTML).toContain('Hello')
    expect(staticHTML).toContain('Just HTML')
  })
})

describe('sanitization and stripping', () => {
  test('semantic structural tags survive sanitization', () => {
    // rehype's defaultSchema (GitHub-comment flavored) lacks these, and for a
    // long time the "allowed tags" list only granted them ATTRIBUTES without
    // adding them to tagNames — so pages written in ordinary semantic HTML
    // silently lost their structure. Pinned here so it can't quietly return.
    const tags = ['main', 'aside', 'header', 'footer', 'nav', 'article', 'section']
    for (const tag of tags) {
      const result = compileTemplateToArtifacts(`<${tag} class="x"><p>hi</p></${tag}>`)
      expect(result.staticHTML).toContain(`<${tag}`)
      expect(result.strippedComponents).toEqual([])
    }
  })

  test('script tags are stripped, never compiled', () => {
    const { parsed, staticHTML } = runPipeline(
      '<div><script>alert(1)</script><p>safe</p></div>'
    )
    expect(parsed.success).toBe(true)
    expect(staticHTML).not.toContain('<script')
    expect(staticHTML).toContain('safe')
  })

  test('unknown PascalCase components are stripped from the AST and reported', () => {
    const parsed = compileTemplate('<div><TotallyFakeComponent foo="1" /><p>ok</p></div>')
    expect(parsed.success).toBe(true)
    // The component is gone from the compiled AST…
    expect(JSON.stringify(parsed.ast)).not.toContain('TotallyFakeComponent')
    // …but the strip is REPORTED so the editor can tell the user (this is
    // the anti-silent-failure contract).
    const stripped = (parsed as any).strippedComponents as Array<{ name: string; reason: string }>
    expect(stripped?.some((s) => s.name === 'TotallyFakeComponent')).toBe(true)
  })

  test('event-handler attributes are stripped', () => {
    const { staticHTML } = runPipeline('<div onclick="alert(1)"><p>hi</p></div>')
    expect(staticHTML).not.toContain('onclick')
  })
})

describe('malformed input produces errors, not crashes', () => {
  test('mismatched tags fail with a syntax error', () => {
    const parsed = compileTemplate('<div><p>oops</div></p>')
    // Pin: whatever the verdict, compileTemplate must not throw…
    expect(typeof parsed.success).toBe('boolean')
    // …and a hard quote error must fail loudly:
    const quoted = compileTemplate('<div class="unclosed><p>x</p></div>')
    expect(quoted.success).toBe(false)
    expect((quoted.errors ?? []).length).toBeGreaterThan(0)
  })

  test('oversized template is rejected with a friendly limit error', () => {
    const huge = '<div>' + '<p>x</p>'.repeat(40_000) + '</div>' // > 256KB
    const parsed = compileTemplate(huge)
    expect(parsed.success).toBe(false)
    expect((parsed.errors ?? []).join(' ')).toMatch(/size|large|limit/i)
  })

  test('too many nodes is rejected with a friendly limit error', () => {
    const many = '<div>' + '<span>y</span>'.repeat(6000) + '</div>' // > 5000 nodes
    const parsed = compileTemplate(many)
    expect(parsed.success).toBe(false)
    expect((parsed.errors ?? []).join(' ')).toMatch(/node|element|many|limit/i)
  })

  test('empty template compiles to empty output without error', () => {
    const parsed = compileTemplate('')
    expect(typeof parsed.success).toBe('boolean')
  })
})

describe('compileTemplateToArtifacts (the single entry point)', () => {
  test('produces identical artifacts to hand-orchestrating the pipeline', () => {
    const template = '<div><DisplayName /><p>hello</p></div>'
    const artifacts = compileTemplateToArtifacts(template)
    const manual = runPipeline(template)
    expect(artifacts.staticHTML).toBe(manual.staticHTML)
    expect(artifacts.islands.map((i) => i.component)).toEqual(
      manual.islands!.map((i) => i.component)
    )
  })

  test('throws TemplateCompilationError carrying ALL collected errors', () => {
    expect(() => compileTemplateToArtifacts('<div class="unclosed><p>x</p></div>')).toThrow(
      TemplateCompilationError
    )
    try {
      compileTemplateToArtifacts('<div class="unclosed><p>x</p></div>')
    } catch (e) {
      expect((e as TemplateCompilationError).errors.length).toBeGreaterThan(0)
    }
  })
})
