/**
 * The heading a profile component prints above itself (Bio's "About Me",
 * Guestbook's "Guestbook"…), changed or left out with heading="…". Pages
 * that put their own <h2> above a component got two headings in a row;
 * heading="none" leaves the component's out.
 */
export function componentHeading(heading: unknown, fallback: string): string | null {
  if (heading === undefined || heading === null) return fallback;
  const text = String(heading).trim();
  return text === '' || text.toLowerCase() === 'none' ? null : text;
}

/** The registry entry for the heading prop, shared by every component that has one */
export function headingProp(fallback: string) {
  return {
    type: 'string' as const,
    description: `The heading above it, "${fallback}" by default. heading="none" leaves it out, for when your page has its own.`,
  };
}
