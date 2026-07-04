/**
 * Standalone repro: how the @import-extraction regex mangles multi-weight
 * Google Fonts URLs (which contain semicolons). This is the head of the
 * shipped Pixel Petals preset — the corrupted output below is byte-for-byte
 * what production served on 2026-07-04 for an enhanced-mode profile.
 *
 * The jest characterization suite (__tests__/css-pipeline-characterization.test.ts)
 * pins this behavior; this script is for eyeballing the full output.
 *
 * Run: npx tsx tests/css-pipeline/repro-import-mangling.ts
 */
import { generateOptimizedCSS } from '../../lib/utils/css/layers'

const input = [
  "@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;600;700&family=Quicksand:wght@400;500;600&display=swap');",
  '/* Override thread-surface for kawaii background */',
  '.thread-surface {',
  '  background: linear-gradient(135deg, #ffe0f0 0%, #ffd4e8 100%) !important;',
  '}',
].join('\n')

const out = generateOptimizedCSS({
  cssMode: 'inherit',
  templateMode: 'enhanced',
  siteWideCSS: '/* site css elided */',
  userCustomCSS: input,
  profileId: 'profile-layout',
})

console.log('===== INPUT =====')
console.log(input)
console.log('\n===== OUTPUT =====')
console.log(out)
console.log('\n===== ANALYSIS =====')
console.log('@import statements in output:', out.match(/@import[^\n]*/g))
console.log("orphaned URL fragment present ('600;700&family'):", out.includes('600;700&family'))
console.log('thread-surface scoped to profile:', /#profile-layout[^{]*\.thread-surface/.test(out))
console.log('thread-surface UNSCOPED (escapes scoping by accident):', /(^|\n|;|\})\s*\.thread-surface\s*\{/.test(out))
