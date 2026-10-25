/**
 * A profile's own CSS as the browser gets it, built one way for the live page
 * (pages/_app.tsx) and the editor's preview (pages/template-preview.tsx).
 */
import { extractImports, scopeAwayFromSiteChrome, transformAdvancedCss } from '@/lib/utils/css/css-transform';
import { documentCssFromCompiledTemplate } from '@/lib/templates/compilation/document-head';

/** A page's CSS, and the Google Fonts it loads, which go in the head as links (PageFonts) */
export interface PageStyles {
  css: string;
  fonts: string[];
}

/**
 * A page of your own HTML: its CSS with what its head carried, re-checked
 * (Google Fonts <link>s, <body bgcolor…>, theme options <meta name="color:…">).
 * `page` is anything with the head: the stored page, an artifact rendered for a viewer.
 */
export function advancedPageStyles(css: string, page: unknown): PageStyles {
  const { fontImports, ...documentCss } = documentCssFromCompiledTemplate(page);
  const { fonts, rest } = takeFonts(css);
  return { css: transformAdvancedCss(rest, documentCss), fonts: unique([...fontImports.flatMap(fontsIn), ...fonts]) };
}

/**
 * The standard layout: kept off the site header and footer (profile CSS
 * styles the profile, never the chrome around it), with its @imports
 * hoisted above the preamble rule: browsers ignore @import after any other
 * rule, so with the preamble first, Google Fonts imports never loaded.
 */
export function standardPageStyles(css: string): PageStyles {
  const { fonts, rest } = takeFonts(css);
  const { imports, rest: rules } = extractImports(scopeAwayFromSiteChrome(rest));
  return {
    css: `${imports.join('\n')}
/* Profile page - Clean canvas for user customization */
.profile-container {
margin-top: 0;
padding-top: 0;
}


/* Custom CSS - User or Admin Default (imports hoisted above) */
${rules}`,
    fonts,
  };
}

// A Google Fonts @import as the sanitizer keeps it, with nothing after the
// URL (an import with a media query or layer stays an @import)
const FONT_IMPORT = /^@import\s+(?:url\(\s*(["']?)(https:\/\/fonts\.googleapis\.com\/css2?\?[^"'()\s]+)\1\s*\)|(["'])(https:\/\/fonts\.googleapis\.com\/css2?\?[^"']+)\3)\s*;$/i;

/** The stylesheet a Google Fonts @import loads, as a link's href, or none */
function fontsIn(line: string): string[] {
  const m = FONT_IMPORT.exec(line.trim());
  const url = m?.[2] ?? m?.[4];
  if (!url) return [];
  // Text shows in a fallback font while the font loads, not blank for up to 3 s
  return [/[?&]display=/i.test(url) ? url : `${url}&display=swap`];
}

/**
 * Google Fonts out of the CSS, to load as links in the head: an @import in
 * a <style> in the body chained the page's text behind two other origins,
 * found only once that <style> was parsed
 */
function takeFonts(css: string): { fonts: string[]; rest: string } {
  const { imports, rest } = extractImports(css);
  const kept = imports.filter((line) => fontsIn(line).length === 0);
  if (kept.length === imports.length) return { fonts: [], rest: css };
  return { fonts: unique(imports.flatMap(fontsIn)), rest: [...kept, rest].filter(Boolean).join('\n') };
}

const unique = (list: string[]) => Array.from(new Set(list));
