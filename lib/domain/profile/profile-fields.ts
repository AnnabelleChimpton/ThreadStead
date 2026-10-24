/**
 * A profile without its page: the source, CSS, compiled copy and widget
 * slot, up to a few MB each. Wherever a profile comes along with a user
 * (chat messages, ring posts, author cards, quick views), it's
 * `profile: PROFILE_WITHOUT_PAGE`; `profile: true` read every author's
 * page with them. A query that needs part of the page asks for it by name.
 * profile-fields.test.ts keeps `profile: true` out of the code.
 */
export const PROFILE_WITHOUT_PAGE = {
  omit: { customTemplate: true, customCSS: true, compiledTemplate: true, widgetSlot: true },
} as const;

type PagePart = keyof typeof PROFILE_WITHOUT_PAGE.omit;

/** PROFILE_WITHOUT_PAGE, with the parts of the page a query reads: `profile: profileWith('customCSS')` */
export function profileWith<K extends PagePart>(...parts: K[]): { omit: Omit<typeof PROFILE_WITHOUT_PAGE.omit, K> } {
  const omit = Object.fromEntries(Object.keys(PROFILE_WITHOUT_PAGE.omit).filter((part) => !parts.includes(part as K)).map((part) => [part, true]));
  return { omit } as { omit: Omit<typeof PROFILE_WITHOUT_PAGE.omit, K> };
}
