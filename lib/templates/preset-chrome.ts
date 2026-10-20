/**
 * The parts of a profile ThreadStead draws itself (guestbook, buttons,
 * labels, dividers, the new-post button) carry the site's own colours at
 * class specificity (styles/retro.css .thread-headline, .thread-label,
 * .thread-button…), so a theme's element rules never reached them: on a dark
 * theme the guestbook heading went dark-on-dark and its message box stayed
 * white. Every preset ends with this block, written against the theme's
 * variables (--ts-ground, --ts-card, --ts-ink, --ts-accent, --ts-on-accent,
 * --ts-font-head, --ts-font-body), so the parts follow the theme and its
 * Appearance knobs.
 */
export const PRESET_CHROME_CSS = `
/* ---------- ThreadStead's own parts of your page ---------- */
/* The site theme rings every card with a peach outline; the theme above
   draws its own cards */
.thread-module {
  outline: none !important;
}
.thread-headline {
  color: var(--ts-ink) !important;
  font-family: var(--ts-font-head) !important;
  text-shadow: none !important;
}
/* The status line is a label too, but each theme styles it on its own */
.thread-label:not(.ts-profile-status) {
  color: color-mix(in srgb, var(--ts-ink) 80%, transparent) !important;
}
.thread-divider {
  border-top-color: color-mix(in srgb, var(--ts-ink) 30%, transparent) !important;
}
.thread-divider::before {
  background: none !important;
}
.thread-button,
.create-new-post-button {
  background: var(--ts-accent) !important;
  color: var(--ts-on-accent) !important;
  border-color: var(--ts-ink) !important;
  box-shadow: none !important;
}
.thread-button:hover,
.create-new-post-button:hover {
  filter: brightness(1.08);
}
.guestbook-section textarea,
.guestbook-section input {
  background: var(--ts-card) !important;
  color: var(--ts-ink) !important;
  border-color: color-mix(in srgb, var(--ts-ink) 35%, transparent) !important;
}
.guestbook-section textarea::placeholder,
.guestbook-section input::placeholder {
  color: color-mix(in srgb, var(--ts-ink) 55%, transparent) !important;
}
.guestbook-section .text-thread-sage {
  color: color-mix(in srgb, var(--ts-ink) 80%, transparent) !important;
}
.guestbook-entry {
  background: var(--ts-card) !important;
  color: var(--ts-ink) !important;
  border-color: color-mix(in srgb, var(--ts-ink) 25%, transparent) !important;
  box-shadow: none !important;
}
.guestbook-entry .text-thread-charcoal {
  color: inherit !important;
}
`
