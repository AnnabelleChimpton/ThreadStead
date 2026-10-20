// A profile page is two choices:
//
//  - Layout: 'standard' (the site's profile page: header, tabs, guestbook)
//    or 'html' (the resident's own HTML page).
//  - Site styles: on (the site's CSS loads under theirs) or off (only theirs).
//
// The database still stores the older six-field shape. templateMode
// 'default' and 'enhanced' are both the standard layout; cssMode 'inherit'
// and 'override' are both site styles on. This file is the one place that
// reads those values as the two choices, and the one place that turns a
// choice back into what to write. Writers only write 'enhanced' or
// 'advanced', and 'inherit' or 'disable'.

export type Layout = 'standard' | 'html';

/** The stored values a choice is written as */
export interface LayoutFields {
  templateMode?: 'enhanced' | 'advanced';
  cssMode?: 'inherit' | 'disable';
}

/** Which layout a stored templateMode means. Anything but 'advanced' is standard. */
export function layoutOf(templateMode?: string | null): Layout {
  return templateMode === 'advanced' ? 'html' : 'standard';
}

/** Whether a stored cssMode leaves the site's styles on. Only 'disable' turns them off. */
export function siteStylesOn(cssMode?: string | null): boolean {
  return cssMode !== 'disable';
}

/** A stored cssMode as one of the two values writers use */
export function siteStylesCSSMode(cssMode?: string | null): 'inherit' | 'disable' {
  return siteStylesOn(cssMode) ? 'inherit' : 'disable';
}

/**
 * The CSS a profile page (and its post pages) sends: the resident's own CSS
 * when they have some, otherwise the admin's default profile CSS, otherwise
 * none. The same for both layouts. (templateMode 'default' used to always
 * send the admin default and ignore the resident's CSS.)
 */
export function pageCSS(
  profile: { templateMode?: string | null; customCSS?: string | null } | null | undefined,
  adminDefaultCSS?: string | null
): string | undefined {
  const own = profile?.customCSS;
  if (own != null && own.trim() !== '') return own;
  if (adminDefaultCSS != null && adminDefaultCSS.trim() !== '') return adminDefaultCSS;
  return undefined;
}

/**
 * What to write for a choice. Only the choices given come back, so it can be
 * spread straight into a Prisma update or a request body.
 */
export function layoutFields(choice: { layout?: Layout; siteStyles?: boolean }): LayoutFields {
  const fields: LayoutFields = {};
  if (choice.layout !== undefined) fields.templateMode = choice.layout === 'html' ? 'advanced' : 'enhanced';
  if (choice.siteStyles !== undefined) fields.cssMode = choice.siteStyles ? 'inherit' : 'disable';
  return fields;
}
