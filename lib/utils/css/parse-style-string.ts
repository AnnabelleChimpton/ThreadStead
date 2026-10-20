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
  for (const declaration of splitDeclarations(styleString)) {
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
