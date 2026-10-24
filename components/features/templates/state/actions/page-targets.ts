/**
 * What a page's action components (AddClass, ConditionalAttr, SetCSSVar…)
 * may change: elements inside the resident's own page, marked
 * data-template-root (AdvancedProfileRenderer, WidgetSlot). Never the site
 * around it: its nav, menus, footer and report buttons stay out of reach,
 * whatever selector the page uses.
 */
export const TEMPLATE_ROOT = '[data-template-root]';

/** The page's own elements matching a selector. An #id also finds the sanitizer's #user-content-id. */
export function pageElements(selector: string): HTMLElement[] {
  const roots = Array.from(document.querySelectorAll<HTMLElement>(TEMPLATE_ROOT));
  const find = (query: string) => {
    try {
      return roots.flatMap((root) => Array.from(root.querySelectorAll<HTMLElement>(query)));
    } catch {
      return []; // not a valid selector
    }
  };
  const found = find(selector);
  if (found.length === 0 && selector.startsWith('#') && !selector.startsWith('#user-content-')) {
    return find(`#user-content-${selector.slice(1)}`);
  }
  return found;
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
  return /^(aria-[a-z-]+|data-[a-z0-9-]+|hidden|disabled|open|checked|selected|readonly|required|title)$/i.test(name);
}
