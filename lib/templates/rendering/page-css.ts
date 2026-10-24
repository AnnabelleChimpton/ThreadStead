/**
 * A profile's own CSS as the browser gets it, built one way for the live page
 * (pages/_app.tsx) and the editor's preview (pages/template-preview.tsx).
 */
import { extractImports, scopeAwayFromSiteChrome, transformAdvancedCss } from '@/lib/utils/css/css-transform';
import { documentCssFromCompiledTemplate } from '@/lib/templates/compilation/document-head';

/**
 * A page of your own HTML: its CSS with what its head carried, re-checked
 * (Google Fonts <link>s, <body bgcolor…>, theme options <meta name="color:…">).
 * `page` is anything with the head: the stored page, an artifact rendered for a viewer.
 */
export function advancedPageCss(css: string, page: unknown): string {
  return transformAdvancedCss(css, documentCssFromCompiledTemplate(page));
}

/**
 * The standard layout: kept off the site header and footer (profile CSS
 * styles the profile, never the chrome around it), with its @imports
 * hoisted above the preamble rule: browsers ignore @import after any other
 * rule, so with the preamble first, Google Fonts imports never loaded.
 */
export function standardPageCss(css: string): string {
  const { imports, rest } = extractImports(scopeAwayFromSiteChrome(css));
  return `${imports.join('\n')}
/* Profile page - Clean canvas for user customization */
.profile-container {
margin-top: 0;
padding-top: 0;
}


/* Custom CSS - User or Admin Default (imports hoisted above) */
${rest}`;
}
