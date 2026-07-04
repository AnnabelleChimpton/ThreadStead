/**
 * Unit tests for the state-aware CSS statement parser that replaced the
 * regex transforms (lib/utils/css/css-transform.ts).
 */
import {
  splitTopLevelStatements,
  serializeStatements,
  extractImports,
  mapSelectors,
  mapRuleDeclarations,
  splitDeclarations,
  splitSelectorList,
  stripComments,
} from '@/lib/utils/css/css-transform'

const GOOGLE_FONTS_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;600;700&family=Quicksand:wght@400;500;600&display=swap');"

describe('splitTopLevelStatements', () => {
  test('separates statement at-rules, block at-rules, and qualified rules', () => {
    const css = `${GOOGLE_FONTS_IMPORT}\n.a { color: red; }\n@media (max-width: 600px) { .b { color: blue; } }`
    const stmts = splitTopLevelStatements(css)
    expect(stmts.map((s) => s.kind)).toEqual(['at', 'rule', 'at'])
    expect(stmts[0].atName).toBe('import')
    expect(stmts[0].body).toBeUndefined()
    expect(stmts[2].atName).toBe('media')
    expect(stmts[2].body).toContain('.b { color: blue; }')
  })

  test('semicolons inside url() strings do not terminate the statement', () => {
    const stmts = splitTopLevelStatements(GOOGLE_FONTS_IMPORT)
    expect(stmts).toHaveLength(1)
    expect(`${stmts[0].prelude};`).toBe(GOOGLE_FONTS_IMPORT)
  })

  test('braces inside strings do not open blocks', () => {
    const css = `.a { content: "}{"; color: red; }`
    const stmts = splitTopLevelStatements(css)
    expect(stmts).toHaveLength(1)
    expect(stmts[0].body).toContain('"}{"')
  })

  test('nested blocks (keyframes) are one statement', () => {
    const css = '@keyframes spin { from { transform: rotate(0); } to { transform: rotate(1turn); } }'
    const stmts = splitTopLevelStatements(css)
    expect(stmts).toHaveLength(1)
    expect(stmts[0].atName).toBe('keyframes')
  })

  test('round-trips through serializeStatements', () => {
    const css = `${GOOGLE_FONTS_IMPORT}\n.a { color: red; }`
    expect(serializeStatements(splitTopLevelStatements(css))).toBe(
      `${GOOGLE_FONTS_IMPORT}\n.a { color: red; }`
    )
  })

  test('unterminated trailing garbage is preserved as other, not dropped', () => {
    const stmts = splitTopLevelStatements('.a { color: red; } .b { color:')
    expect(stmts.some((s) => s.kind === 'other')).toBe(true)
  })

  test('REGRESSION: stray semicolons terminate (empty statements once looped forever)', () => {
    // The first implementation broke out of the scan with `end = i + 1` on a
    // top-level ';' without advancing `i`, so an empty statement re-scanned
    // the same ';' forever — a synchronous hang that took out jest workers.
    expect(splitTopLevelStatements(';')).toEqual([])
    expect(splitTopLevelStatements(';;; .a { color: red; } ;')).toHaveLength(1)
    expect(splitTopLevelStatements('@import url(a.css);;')).toHaveLength(1)
  })
})

describe('extractImports', () => {
  test('extracts semicolon-containing Google Fonts imports intact', () => {
    const { imports, rest } = extractImports(`${GOOGLE_FONTS_IMPORT}\n.a { color: red; }`)
    expect(imports).toEqual([GOOGLE_FONTS_IMPORT])
    expect(rest).toBe('.a { color: red; }')
  })

  test('multiple imports, interleaved with rules, all extracted', () => {
    const css = `@import url('a.css');\n.x { color: red; }\n@import url('b.css');`
    const { imports, rest } = extractImports(css)
    expect(imports).toHaveLength(2)
    expect(rest).not.toContain('@import')
  })

  test('no imports → rest is everything', () => {
    const { imports, rest } = extractImports('.a { color: red; }')
    expect(imports).toEqual([])
    expect(rest).toBe('.a { color: red; }')
  })
})

describe('mapSelectors', () => {
  const scope = (css: string) => mapSelectors(css, (s) => `#p ${s}`)

  test('maps plain and comma-separated selectors', () => {
    expect(scope('.a, .b { color: red; }')).toBe('#p .a, #p .b { color: red; }')
  })

  test('recurses into @media but leaves @keyframes untouched', () => {
    const out = scope(
      '@media (min-width: 100px) { .a { color: red; } }\n@keyframes k { from { opacity: 0; } }'
    )
    expect(out).toContain('#p .a')
    expect(out).not.toContain('#p from')
    expect(out).toContain('from { opacity: 0; }')
  })

  test('recurseGroups: false leaves @media contents alone', () => {
    const out = mapSelectors(
      '@media (min-width: 100px) { .a { color: red; } }',
      (s) => `#p ${s}`,
      { recurseGroups: false }
    )
    expect(out).not.toContain('#p .a')
  })

  test('commas inside :is()/:not() do not split the selector', () => {
    const out = scope(':is(.a, .b) { color: red; }')
    expect(out).toBe('#p :is(.a, .b) { color: red; }')
  })
})

describe('splitDeclarations / mapRuleDeclarations', () => {
  test('semicolons inside data: URIs do not split declarations', () => {
    const decls = splitDeclarations(
      "background: url('data:image/svg+xml;base64,abc'); color: red"
    )
    expect(decls).toHaveLength(2)
    expect(decls[0]).toContain('base64,abc')
  })

  test('adds !important per declaration without touching @media contents', () => {
    const out = mapRuleDeclarations(
      '.a { color: red; }\n@media (min-width: 1px) { .b { color: blue; } }',
      (d) => `${d} !important`
    )
    expect(out).toContain('color: red !important;')
    expect(out).toContain('.b { color: blue; }')
  })
})

describe('splitSelectorList', () => {
  test('normalizes whitespace and splits on top-level commas only', () => {
    expect(splitSelectorList('.a   .b,\n.c')).toEqual(['.a .b', '.c'])
    expect(splitSelectorList(':is(.a, .b) > .c')).toEqual([':is(.a, .b) > .c'])
  })
})

describe('stripComments', () => {
  test('removes comments but not comment-like content in strings', () => {
    expect(stripComments('/* x */ .a { content: "/* keep */"; }')).toBe(
      ' .a { content: "/* keep */"; }'
    )
  })
})
