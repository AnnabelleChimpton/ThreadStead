/**
 * What a page's action components (AddClass, ConditionalAttr, SetCSSVar…)
 * may change: elements inside the resident's own page, marked
 * data-template-root (AdvancedProfileRenderer, WidgetSlot). Never the site
 * around it: its nav, menus, footer and report buttons stay out of reach,
 * whatever selector the page uses.
 */
import { USER_CONTENT_PREFIX } from '@/lib/utils/css/css-transform';
import { isReservedDataAttribute } from '@/lib/templates/compilation/html-allowlist';

export const TEMPLATE_ROOT = '[data-template-root]';

/**
 * A page's selector, with every #id also finding the sanitizer's
 * #user-content-id: `#a, #b` and `.g #cat` too, not only a leading one
 * (bug bash 2026-10-26). An # inside [attr="…"] or quotes is left alone.
 */
export function pageSelector(selector: string): string {
  let out = '';
  for (let i = 0; i < selector.length; ) {
    const ch = selector[i];
    if (ch === '"' || ch === "'" || ch === '[') {
      const close = ch === '[' ? ']' : ch;
      let end = i + 1;
      while (end < selector.length && selector[end] !== close) end += selector[end] === '\\' ? 2 : 1;
      out += selector.slice(i, end + 1);
      i = end + 1;
    } else if (ch === '#') {
      const id = /^#((?:[\w-]|\\.|[^\x00-\x7f])+)/.exec(selector.slice(i))?.[1] ?? '';
      out += id && !id.startsWith(USER_CONTENT_PREFIX) ? `:is(#${id}, #${USER_CONTENT_PREFIX}${id})` : `#${id}`;
      i += 1 + id.length;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/** The page's own elements matching a selector (an #id also finds the sanitizer's #user-content-id) */
export function pageElements(selector: string): HTMLElement[] {
  const roots = Array.from(document.querySelectorAll<HTMLElement>(TEMPLATE_ROOT));
  try {
    const query = pageSelector(selector);
    return roots.flatMap((root) => Array.from(root.querySelectorAll<HTMLElement>(query)));
  } catch {
    return []; // not a valid selector
  }
}

/** The page's roots themselves: where ":root" means the page, not the whole site. */
export function pageRoots(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(TEMPLATE_ROOT));
}

/**
 * Attributes ConditionalAttr may set: state and accessibility, never anything
 * that runs code or loads something (on…, href, src, style, srcdoc, action).
 */
export function isSafePageAttribute(name: string): boolean {
  return /^(aria-[a-z-]+|data-[a-z0-9-]+|hidden|disabled|open|checked|selected|readonly|required|title)$/i.test(name) &&
    !isReservedDataAttribute(name);
}

/**
 * The hash to use for `#about` on this page: `#user-content-about` when only
 * the sanitizer's renamed id is here. A link from elsewhere to
 * /resident/x#about (or SetURLHash) otherwise found nothing and opened the
 * top of the page (template audit 01 #14, 15 #1, 16 #4).
 */
export function pageHash(hash: string): string {
  let id: string;
  try {
    id = decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    return hash;
  }
  if (!id || id.startsWith(USER_CONTENT_PREFIX) || document.getElementById(id)) return hash;
  return document.getElementById(USER_CONTENT_PREFIX + id) ? `#${USER_CONTENT_PREFIX}${id}` : hash;
}
