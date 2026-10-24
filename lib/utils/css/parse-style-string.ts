/**
 * `color: red; background-image: url(https://x/y.png)` →
 * `{ color: 'red', backgroundImage: 'url(https://x/y.png)' }`.
 *
 * Splits declarations on `;` outside parentheses and quotes (a data: URI in
 * url() has one) and each declaration at its first `:` only (a link has
 * more). Splitting on every `:` turned url(https://…) into url(https.
 */
export function parseStyleString(styleString: string): Record<string, string> {
  const styles: Record<string, string> = {};
  if (!styleString) return styles;
  // A comment before a declaration used to become part of its name
  for (const declaration of splitDeclarations(styleString.replace(/\/\*[\s\S]*?\*\//g, ''))) {
    const colon = declaration.indexOf(':');
    if (colon <= 0) continue;
    const property = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (!property || !value) continue;
    const name = property.startsWith('--')
      ? property
      : property.toLowerCase().replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    styles[name] = value;
  }
  return styles;
}

function splitDeclarations(style: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < style.length; i++) {
    const c = style[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === ';' && depth === 0) {
      parts.push(style.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(style.slice(start));
  return parts;
}

const IMPORTANT = /\s*!\s*important\s*$/i;

/**
 * A ref for an element whose inline style has !important declarations.
 * React's style objects can't carry importance: the server's HTML keeps it
 * as written, but an element rendered in the browser (the editor preview,
 * a page reached by a link on the site) lost those declarations entirely.
 * This sets them again, important. Undefined when there are none.
 */
export function importantStyleRef(style: Record<string, string>): ((el: HTMLElement | null) => void) | undefined {
  const important = Object.entries(style).filter(([, value]) => IMPORTANT.test(value));
  if (important.length === 0) return undefined;
  return (el) => {
    for (const [name, value] of important) {
      const property = name.startsWith('--') ? name : name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      el?.style.setProperty(property, value.replace(IMPORTANT, ''), 'important');
    }
  };
}
