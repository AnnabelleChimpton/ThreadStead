/**
 * Parts and tokens: how a page restyles our components (design/component-
 * styling-audit/PLAN.md). One table, two uses:
 *
 * - Site styles off: styles/component-parts.css (written from this table,
 *   kept equal by a test) makes every part follow the page. A part's box
 *   is see-through with an edge in the page's colour, its text is the
 *   page's colour and font. That's what an unset token means.
 * - Site styles on: parts keep the site's look, unless the page sets a
 *   token. Then transformAdvancedCss puts the declarations reading that
 *   token in the page's CSS, ahead of the page's own rules, so the token
 *   wins over the site's look and the page's own rules still win over it.
 *
 * A page sets a token once, `:root { --ts-card: #2a2545 }`, and every
 * component's boxes follow. A part's class (`ts-guestbook-entry`) is its
 * stable handle for anything more.
 */

/** The tokens, what each is, and what an unset one means with site styles off */
export const TOKENS = {
  '--ts-ink': 'Text in components. Unset: the page\'s own text colour.',
  '--ts-font': 'Text font in components. Unset: the page\'s own font.',
  '--ts-font-head': 'Headings in components. Unset: the page\'s own font.',
  '--ts-accent': 'Ticks, sliders, the chosen tab, and other marks of what\'s chosen or playing. Unset: the page\'s text colour.',
  '--ts-card': 'Boxes: cards, tabs, posts, guestbook entries, fields and buttons. Unset: see-through.',
  '--ts-edge': 'Their borders. Unset: the page\'s text colour, faded.',
  '--ts-shadow': 'Their shadows, like 3px 3px 0 teal. Unset: none.',
  '--ts-radius': 'Their corners, like 8px. Unset: as they are.',
  '--ts-note-ink': 'Writing on StickyNote and PolaroidFrame, which keep their own paper. Unset: dark ink.',
} as const;

export type Token = keyof typeof TOKENS;

const EDGE = 'var(--ts-edge, color-mix(in srgb, currentColor 35%, transparent))';
const SOLID_EDGE = 'var(--ts-edge, currentColor)';
const CARD = 'var(--ts-card, transparent)';
const SHADOW = 'var(--ts-shadow, none)';
const INK = 'var(--ts-ink)';
const FONT = 'var(--ts-font)';
const HEAD = 'var(--ts-font-head)';

/**
 * A box: background, edge, shadow and corners from the tokens. `background`,
 * not its colour: the site's theme paints some with a gradient, which a
 * colour sits under
 */
const box = (radius: string) => ({
  background: CARD,
  'border-color': EDGE,
  'box-shadow': SHADOW,
  'border-radius': `var(--ts-radius, ${radius})`,
  color: INK,
});

/** A box the site's theme also outlines inside (cards, tabs): the outline takes the edge colour */
const frame = (radius: string) => ({ ...box(radius), 'outline-color': EDGE });

/** A heading inside a component */
const heading = { color: INK, 'font-family': HEAD, 'text-shadow': 'none' };

/** Text that's quieter than the rest (dates, counts, hints) */
const muted = { color: INK, opacity: '0.8' };

/** A button, or something drawn as one */
const button = (radius: string) => ({ background: CARD, color: INK, 'border-color': SOLID_EDGE, 'box-shadow': SHADOW, 'border-radius': `var(--ts-radius, ${radius})`, 'font-family': FONT });

/** The chosen one of several (a tab, a thumbnail, a dot), tinted with the accent */
const chosenTint = 'color-mix(in srgb, var(--ts-accent, currentColor) 15%, transparent)';

export interface Part {
  /** The part's class, `ts-<component>-<part>`: its stable name for a page's CSS */
  part: string;
  /** The component it's part of */
  component: string;
  /** What it is, in a few words, for the component reference */
  what: string;
  /** Narrows it to a state or a pseudo-element: `[aria-selected="true"]`, `::before`, `:hover` */
  state?: string;
  /**
   * Each declaration's value as written for site styles off. One that reads
   * a token also goes in a page's CSS when the page sets that token; one
   * that reads none is only for site styles off (following the page).
   * Without any, it's only a handle: a stable class for a page's CSS.
   */
  declarations?: Record<string, string>;
}

/** Every component that draws something of its own */
export const PARTS: Part[] = [
  // Button
  { component: 'Button', part: 'ts-button', what: 'the button', declarations: { background: CARD, color: INK, 'border-color': SOLID_EDGE, 'box-shadow': SHADOW, 'border-radius': 'var(--ts-radius, 4px)', 'font-family': FONT } },

  // RetroCard
  { component: 'RetroCard', part: 'ts-card', what: 'the card', declarations: frame('8px') },
  { component: 'RetroCard', part: 'ts-card-title', what: 'its title', declarations: heading },

  // Tabs
  { component: 'Tabs', part: 'ts-tabs', what: 'the box around the tabs and the panel', declarations: frame('8px') },
  { component: 'Tabs', part: 'ts-tabs-list', what: 'the row of tabs', declarations: { 'border-bottom-color': EDGE } },
  { component: 'Tabs', part: 'ts-tabs-tab', what: 'a tab', declarations: { background: CARD, color: INK, 'border-right-color': EDGE, 'font-family': FONT } },
  { component: 'Tabs', part: 'ts-tabs-tab', what: 'the chosen tab', state: '[aria-selected="true"]', declarations: { background: 'color-mix(in srgb, var(--ts-accent, currentColor) 15%, transparent)' } },
  { component: 'Tabs', part: 'ts-tabs-panel', what: 'the chosen tab\'s content', declarations: { color: INK } },

  // Guestbook
  { component: 'Guestbook', part: 'ts-guestbook', what: 'the guestbook' },
  { component: 'Guestbook', part: 'ts-guestbook-heading', what: 'its heading', declarations: heading },
  { component: 'Guestbook', part: 'ts-guestbook-label', what: 'small labels ("Your message", dates)', declarations: { color: INK, 'font-family': FONT, opacity: '0.8' } },
  { component: 'Guestbook', part: 'ts-guestbook-muted', what: 'notes and hints', declarations: muted },
  { component: 'Guestbook', part: 'ts-guestbook-divider', what: 'the line under the heading', declarations: { 'border-top-color': EDGE } },
  { component: 'Guestbook', part: 'ts-guestbook-divider', what: 'the line\'s stitching', state: '::before', declarations: { display: 'none' } },
  { component: 'Guestbook', part: 'ts-guestbook-field', what: 'the message box', declarations: { ...box('8px'), 'box-shadow': 'none' } },
  { component: 'Guestbook', part: 'ts-guestbook-button', what: 'its buttons', declarations: { background: CARD, color: INK, 'border-color': SOLID_EDGE, 'box-shadow': SHADOW, 'border-radius': 'var(--ts-radius, 6px)', 'font-family': FONT } },
  { component: 'Guestbook', part: 'ts-guestbook-entry', what: 'one message', declarations: box('8px') },
  { component: 'Guestbook', part: 'ts-guestbook-author', what: 'a message\'s author', declarations: { color: INK } },
  { component: 'Guestbook', part: 'ts-guestbook-message', what: 'a message\'s words', declarations: { color: INK } },

  // BlogPosts
  { component: 'BlogPosts', part: 'ts-posts', what: 'the list of posts' },
  { component: 'BlogPosts', part: 'ts-posts-heading', what: 'its heading', declarations: heading },
  { component: 'BlogPosts', part: 'ts-post', what: 'one post', declarations: box('16px') },
  { component: 'BlogPosts', part: 'ts-post', what: 'a post under the pointer', state: ':hover', declarations: { 'box-shadow': SHADOW } },
  { component: 'BlogPosts', part: 'ts-post-title', what: 'a post\'s title', declarations: { color: INK, 'font-family': HEAD } },
  { component: 'BlogPosts', part: 'ts-post', what: 'its links (the title is one)', state: ' a', declarations: { color: INK } },
  { component: 'BlogPosts', part: 'ts-post-author', what: 'who wrote it', declarations: { color: INK } },
  { component: 'BlogPosts', part: 'ts-post-date', what: 'when', declarations: muted },
  { component: 'BlogPosts', part: 'ts-post-content', what: 'what it says', declarations: { color: INK } },
  { component: 'BlogPosts', part: 'ts-post', what: 'its words', state: ' .thread-content', declarations: { color: INK } },
  { component: 'BlogPosts', part: 'ts-post-actions', what: 'its small buttons', state: ' button', declarations: { background: CARD, color: INK, 'border-color': SOLID_EDGE, 'box-shadow': SHADOW } },

  { component: 'BlogPosts', part: 'ts-post-footer', what: 'the line under a post', declarations: { 'border-top-color': EDGE } },
  { component: 'BlogPosts', part: 'ts-post-footer', what: 'the comments button under a post', state: ' button', declarations: { background: CARD, color: INK, 'border-color': SOLID_EDGE, 'box-shadow': SHADOW } },

  // ProfilePhoto
  { component: 'ProfilePhoto', part: 'ts-photo', what: 'the photo, with its frame' },
  { component: 'ProfilePhoto', part: 'ts-photo-frame', what: 'the frame around the photo', declarations: { background: CARD, 'border-color': SOLID_EDGE, 'box-shadow': SHADOW } },

  // ProfileHeader, DisplayName, Bio
  { component: 'ProfileHeader', part: 'ts-profile-header', what: 'the header' },
  { component: 'ProfileHeader', part: 'ts-profile-header-layout', what: 'the photo beside the words' },
  { component: 'ProfileHeader', part: 'ts-profile-photo-section', what: 'the photo\'s side' },
  { component: 'ProfileHeader', part: 'ts-profile-info-section', what: 'the words\' side' },
  { component: 'ProfileHeader', part: 'ts-profile-identity', what: 'the name and the label under it' },
  { component: 'ProfileHeader', part: 'ts-profile-actions', what: 'the row of buttons' },
  { component: 'ProfileHeader', part: 'ts-edit-profile-button', what: 'Edit, for you only' },
  { component: 'DisplayName', part: 'ts-profile-display-name', what: 'the name', declarations: heading },
  { component: 'ProfileHeader', part: 'ts-profile-status', what: 'the small label under the name', declarations: { color: INK, 'font-family': FONT, opacity: '0.8' } },
  { component: 'ProfileHeader', part: 'ts-profile-bio-section', what: 'around the bio (in Bio too)' },
  { component: 'ProfileHeader', part: 'ts-profile-bio', what: 'the bio (in Bio too)', declarations: { color: INK } },
  { component: 'ProfileHeader', part: 'ts-profile-button', what: 'its buttons', declarations: { background: CARD, color: INK, 'border-color': SOLID_EDGE, 'box-shadow': SHADOW, 'font-family': FONT } },
  { component: 'Bio', part: 'ts-profile-bio-section', what: 'the bio and its heading' },
  { component: 'Bio', part: 'ts-bio-heading', what: 'its heading', declarations: heading },
  { component: 'Bio', part: 'ts-profile-bio', what: 'the words (also ts-bio-text)' },
  { component: 'Bio', part: 'ts-bio-text', what: 'the bio', declarations: { color: INK } },

  // Form fields
  { component: 'TInput', part: 'ts-input', what: 'the text box', declarations: { ...box('4px'), 'box-shadow': 'none' } },
  { component: 'Select', part: 'ts-select', what: 'the menu', declarations: { ...box('6px'), 'box-shadow': 'none' } },
  { component: 'Checkbox', part: 'ts-checkbox', what: 'the box and its words' },
  { component: 'Checkbox', part: 'ts-checkbox-box', what: 'the box', declarations: { 'accent-color': 'var(--ts-accent, currentColor)' } },
  { component: 'Checkbox', part: 'ts-checkbox-label', what: 'its words', declarations: { color: INK, 'font-family': FONT } },
  { component: 'RadioGroup', part: 'ts-radio-group', what: 'the choices' },
  { component: 'RadioGroup', part: 'ts-radio-dot', what: 'a choice\'s circle', declarations: { 'accent-color': 'var(--ts-accent, currentColor)' } },
  { component: 'RadioGroup', part: 'ts-radio-label', what: 'a choice\'s words', declarations: { color: INK, 'font-family': FONT } },
  { component: 'Slider', part: 'ts-slider', what: 'the slider and its words' },
  { component: 'Slider', part: 'ts-slider-label', what: 'its label', declarations: { color: INK, 'font-family': FONT } },
  { component: 'Slider', part: 'ts-slider-value', what: 'the number it\'s at', declarations: { ...muted, 'font-family': FONT } },
  { component: 'Slider', part: 'ts-slider-track', what: 'the slider', declarations: { 'accent-color': 'var(--ts-accent, currentColor)', 'background-color': 'color-mix(in srgb, var(--ts-edge, currentColor) 25%, transparent)' } },
  { component: 'Slider', part: 'ts-slider-scale', what: 'the lowest and highest numbers', declarations: muted },
  { component: 'ColorPicker', part: 'ts-color-picker', what: 'the picker and its words' },
  { component: 'ColorPicker', part: 'ts-color-picker-label', what: 'its label', declarations: { color: INK, 'font-family': FONT } },
  { component: 'ColorPicker', part: 'ts-color-picker-swatch', what: 'the colour box', declarations: { 'border-color': EDGE } },
  { component: 'ColorPicker', part: 'ts-color-picker-value', what: 'the colour\'s code', declarations: { ...muted, 'font-family': FONT } },

  // FollowButton (also in ProfileHeader)
  { component: 'FollowButton', part: 'ts-follow', what: 'the button and what it says' },
  { component: 'FollowButton', part: 'ts-follow-button', what: 'Follow and Unfollow', declarations: button('4px') },
  { component: 'FollowButton', part: 'ts-follow-note', what: '"log in to follow"', declarations: { color: INK, 'font-family': FONT, opacity: '0.8' } },
  { component: 'FollowButton', part: 'ts-follow-status', what: '"Friends" or "Follows you"', declarations: muted },

  // FriendBadge, MutualFriends (also in ProfileHeader)
  { component: 'FriendBadge', part: 'ts-friend-badge', what: 'the badge', declarations: button('4px') },
  { component: 'MutualFriends', part: 'ts-mutual-friends', what: 'the button and the friends it opens' },
  { component: 'MutualFriends', part: 'ts-mutual-friends-button', what: 'the button with the count', declarations: button('4px') },
  { component: 'MutualFriends', part: 'ts-mutual-friends-list', what: 'the friends it opens', declarations: box('0px') },
  { component: 'MutualFriends', part: 'ts-mutual-friends-avatar', what: 'a friend\'s picture', declarations: { 'border-color': SOLID_EDGE } },

  // FriendDisplay
  { component: 'FriendDisplay', part: 'ts-friends', what: 'the box', declarations: { ...box('0px'), 'border-color': SOLID_EDGE } },
  { component: 'FriendDisplay', part: 'ts-friends-heading', what: 'its heading', declarations: heading },
  { component: 'FriendDisplay', part: 'ts-friend', what: 'one friend', declarations: box('0px') },
  { component: 'FriendDisplay', part: 'ts-friend', what: 'a friend under the pointer', state: ':hover', declarations: { background: chosenTint } },
  { component: 'FriendDisplay', part: 'ts-friend-avatar', what: 'their picture', declarations: { 'border-color': SOLID_EDGE } },
  { component: 'FriendDisplay', part: 'ts-friend-name', what: 'their name', declarations: { color: INK } },
  { component: 'FriendDisplay', part: 'ts-friend-handle', what: 'their @name', declarations: muted },

  // WebsiteDisplay
  { component: 'WebsiteDisplay', part: 'ts-websites', what: 'the box', declarations: { ...box('0px'), 'border-color': SOLID_EDGE } },
  { component: 'WebsiteDisplay', part: 'ts-websites-heading', what: 'its heading', declarations: heading },
  { component: 'WebsiteDisplay', part: 'ts-website', what: 'one website, with a line at its left', declarations: { 'border-left-color': 'var(--ts-accent, currentColor)' } },
  { component: 'WebsiteDisplay', part: 'ts-website-link', what: 'its name, a link', declarations: { color: INK, 'text-decoration': 'underline' } },
  { component: 'WebsiteDisplay', part: 'ts-website-blurb', what: 'what you said about it', declarations: { color: INK } },
  { component: 'WebsiteDisplay', part: 'ts-website-url', what: 'its address', declarations: muted },

  // MediaGrid
  { component: 'MediaGrid', part: 'ts-media-grid', what: 'the photos and their heading' },
  { component: 'MediaGrid', part: 'ts-media-heading', what: 'its heading', declarations: heading },
  { component: 'MediaGrid', part: 'ts-media-subtitle', what: 'the line under it', declarations: muted },
  { component: 'MediaGrid', part: 'ts-media-view-all', what: '"View All"', declarations: button('6px') },
  { component: 'MediaGrid', part: 'ts-media-item', what: 'one photo\'s frame', declarations: box('0px') },
  { component: 'MediaGrid', part: 'ts-media-more', what: 'the line under the photos', declarations: { color: INK } },

  // ProfileBadges
  { component: 'ProfileBadges', part: 'ts-badges', what: 'the badges and their heading' },
  { component: 'ProfileBadges', part: 'ts-badges-heading', what: 'its heading', declarations: heading },
  { component: 'ProfileBadges', part: 'ts-badges-subtitle', what: 'the line under it', declarations: muted },
  { component: 'ProfileBadges', part: 'ts-badges-view-all', what: '"View Collection"', declarations: button('6px') },
  { component: 'ProfileBadges', part: 'ts-badges-more', what: 'the lines under the badges', declarations: { color: INK } },

  // RevealBox
  { component: 'RevealBox', part: 'ts-reveal', what: 'the button and what it shows' },
  { component: 'RevealBox', part: 'ts-reveal-button', what: 'the button', declarations: { ...button('4px'), border: `1px solid ${SOLID_EDGE}` } },
  { component: 'RevealBox', part: 'ts-reveal-link', what: 'the button, as a link (buttonStyle="link" or "minimal")', declarations: { color: INK, 'border-color': EDGE, 'font-family': FONT } },
  { component: 'RevealBox', part: 'ts-reveal-content', what: 'what it shows', declarations: { color: INK } },

  // ImageCarousel
  { component: 'ImageCarousel', part: 'ts-image-carousel', what: 'the box', declarations: { background: CARD, 'border-radius': 'var(--ts-radius, 8px)', color: INK } },
  { component: 'ImageCarousel', part: 'ts-carousel-main', what: 'the big picture\'s box' },
  { component: 'ImageCarousel', part: 'ts-carousel-slide', what: 'one picture' },
  { component: 'ImageCarousel', part: 'ts-carousel-caption', what: 'a picture\'s caption' },
  { component: 'ImageCarousel', part: 'ts-carousel-arrow', what: 'both arrows' },
  { component: 'ImageCarousel', part: 'ts-carousel-arrow-prev', what: 'the left arrow' },
  { component: 'ImageCarousel', part: 'ts-carousel-arrow-next', what: 'the right arrow' },
  { component: 'ImageCarousel', part: 'ts-carousel-play-pause', what: 'pause and play' },
  { component: 'ImageCarousel', part: 'ts-carousel-dots', what: 'the row of dots' },
  { component: 'ImageCarousel', part: 'ts-carousel-thumbnails', what: 'the row of small pictures', declarations: { background: CARD } },
  { component: 'ImageCarousel', part: 'ts-carousel-thumbnail', what: 'a small picture', declarations: { 'border-color': EDGE } },
  { component: 'ImageCarousel', part: 'ts-carousel-thumbnail', what: 'the one showing', state: '[aria-current="true"]', declarations: { 'border-color': 'var(--ts-accent, currentColor)' } },
  { component: 'ImageCarousel', part: 'ts-carousel-dot', what: 'a dot', declarations: { 'background-color': EDGE } },
  { component: 'ImageCarousel', part: 'ts-carousel-dot-target', what: 'the dot showing', state: '[aria-current="true"] .ts-carousel-dot', declarations: { 'background-color': 'var(--ts-accent, currentColor)' } },
  { component: 'ImageCarousel', part: 'ts-image-carousel-empty', what: 'the box when there are no pictures', declarations: { ...box('8px'), border: `1px dashed ${EDGE}` } },

  // Embed
  { component: 'Embed', part: 'ts-embed', what: 'the player, or the box before Play' },
  { component: 'Embed', part: 'ts-embed-player', what: 'the player, once playing' },
  { component: 'Embed', part: 'ts-embed-placeholder', what: 'the box before Play', declarations: { ...box('4px'), 'box-shadow': 'none' } },
  { component: 'Embed', part: 'ts-embed-title', what: 'what\'s playing', declarations: { color: INK } },
  // .btn: two classes, to outweigh retro.css's .btn.btn--secondary like theme-parts.css's rule for it does
  { component: 'Embed', part: 'ts-embed-button', what: 'Play', state: '.btn', declarations: button('6px') },

  // PolaroidFrame and StickyNote keep their own paper; only the writing is a token
  { component: 'PolaroidFrame', part: 'ts-polaroid', what: 'the print' },
  { component: 'PolaroidFrame', part: 'ts-polaroid-photo', what: 'the picture on it' },
  { component: 'StickyNote', part: 'ts-sticky-note', what: 'the note (its writing is --ts-note-ink)' },
  { component: 'StickyNote', part: 'ts-sticky-note-tape', what: 'the tape' },
  { component: 'PolaroidFrame', part: 'ts-polaroid-caption', what: 'the caption', declarations: { color: 'var(--ts-note-ink, var(--color-gray-700))' } },

  // ProfileMusic: the profile's song player, inside the page
  { component: 'ProfileMusic', part: 'ts-profile-music', what: 'the player' },
  { component: 'ProfileMusic', part: 'ts-profile-music', what: 'its box', state: ' .ts-music', declarations: { ...box('12px'), 'border-color': SOLID_EDGE } },
  { component: 'ProfileMusic', part: 'ts-profile-music', what: 'its buttons', state: ' .ts-music .ts-music-btn', declarations: { ...button('6px'), 'border-style': 'solid' } },
  { component: 'ProfileMusic', part: 'ts-profile-music', what: 'a button under the pointer', state: ' .ts-music .ts-music-btn:hover', declarations: { background: chosenTint } },
  { component: 'ProfileMusic', part: 'ts-profile-music', what: 'a button that\'s on', state: ' .ts-music .ts-music-btn[aria-pressed="true"]', declarations: { background: chosenTint } },
  { component: 'ProfileMusic', part: 'ts-profile-music', what: 'its small print', state: ' .ts-music-note', declarations: muted },
  { component: 'ProfileMusic', part: 'ts-profile-music', what: 'the progress line', state: ' .ts-music-track', declarations: { 'background-color': EDGE } },
  { component: 'ProfileMusic', part: 'ts-profile-music', what: 'how far it\'s played', state: ' .ts-music-progress', declarations: { 'background-color': 'var(--ts-accent, currentColor)' } },

  // MyRings, RingNav, MyHouse, HouseBadge: links that already follow the page
  { component: 'MyRings', part: 'ts-my-rings', what: 'the list' },
  { component: 'MyRings', part: 'ts-my-rings-item', what: 'one ring' },
  { component: 'RingNav', part: 'ts-ring-nav', what: 'the row of links' },
  { component: 'RingNav', part: 'ts-ring-nav-prev', what: 'Previous' },
  { component: 'RingNav', part: 'ts-ring-nav-home', what: 'the ring\'s name' },
  { component: 'RingNav', part: 'ts-ring-nav-random', what: 'Random' },
  { component: 'RingNav', part: 'ts-ring-nav-next', what: 'Next' },
  { component: 'MyHouse', part: 'ts-my-house', what: 'the house, a link to it' },
  { component: 'HouseBadge', part: 'ts-house-badge-link', what: 'the badge, a link to your house' },

  // DynamicImage
  { component: 'DynamicImage', part: 'ts-dynamic-image', what: 'the picture' },
  { component: 'DynamicImage', part: 'ts-dynamic-image-empty', what: 'the box when there\'s no picture', declarations: { ...box('4px'), 'box-shadow': 'none' } },

  // What the owner sees where a component has nothing to show yet
  { component: 'Notes only you see', part: 'ts-owner-note', what: 'the note', declarations: { color: INK, 'border-color': EDGE, 'font-family': FONT } },
];

/** Components that draw other components' parts along with their own */
export const DRAWS_ALSO: Readonly<Record<string, readonly string[]>> = {
  ProfileHeader: ['ProfilePhoto', 'DisplayName', 'FollowButton', 'FriendBadge', 'MutualFriends'],
};

export interface PartDoc {
  /** Its class, without the dot */
  name: string;
  what: string;
}

/** A component's parts, once each, for the reference */
export function partsOf(component: string): PartDoc[] {
  // A part's own line says what it is; a state's line ("the chosen tab") only when it has none
  const own = PARTS.filter((part) => part.component === component);
  const docs = new Map<string, PartDoc>();
  for (const part of [...own.filter((p) => !p.state), ...own.filter((p) => p.state)]) {
    if (!docs.has(part.part)) docs.set(part.part, { name: part.part, what: part.what });
  }
  return [...docs.values()];
}

/** The tokens a component's look reads, in the order TOKENS lists them */
export function tokensReadBy(component: string): Token[] {
  const read = new Set(PARTS.filter((part) => part.component === component).flatMap((part) => Object.values(part.declarations ?? {}).flatMap(tokensIn)));
  return (Object.keys(TOKENS) as Token[]).filter((token) => read.has(token));
}

const tokensIn = (value: string) => [...value.matchAll(/--ts-[\w-]+/g)].map((m) => m[0]);

/** A part's selector inside the page, weighing one class */
const selectorFor = (scope: string, part: Part) => `${scope} .${part.part}${part.state ?? ''}`;

/**
 * styles/component-parts.css: with site styles off, every part follows
 * the page, reading the tokens if the page set them. Unlayered and one
 * class heavy, so it beats the site's own classes (.thread-module) and
 * Tailwind's utilities, and any rule of the page's beats it.
 */
export function siteStylesOffCss(): string {
  const scope = ':where([data-template-root][data-site-styles="off"])';
  return PARTS.filter((part) => part.declarations).map((part) => {
    const body = Object.entries(part.declarations ?? {}).map(([property, value]) => `  ${property}: ${value};`).join('\n');
    return `/* ${part.component}: ${part.what} */\n${selectorFor(scope, part)} {\n${body}\n}`;
  }).join('\n');
}

/** The whole of styles/component-parts.css */
export function componentPartsCssFile(): string {
  return `/*
 * Written by scripts/write-component-parts-css.ts from
 * lib/templates/styling/component-parts.ts: change that, then run the script.
 *
 * Your own HTML page with site styles off: our components follow the page.
 * Their boxes are see-through with an edge in the page's colour, their text
 * is the page's colour and font, unless the page sets a token (--ts-card,
 * --ts-ink…). Unlayered and one class heavy: it beats the site's own classes
 * and Tailwind's utilities, and any rule of the page's beats it.
 */
${siteStylesOffCss()}
`;
}

/** The tokens a page's CSS sets */
export function tokensSetIn(css: string): Set<string> {
  return new Set([...css.matchAll(/(--ts-[\w-]+)\s*:/g)].map((m) => m[1]).filter((name) => name in TOKENS));
}

/**
 * The declarations reading the tokens a page sets, for its CSS (site styles
 * on or off): `scope` is where the page's rules start, so these weigh what
 * the page's own rules on a part's class weigh, and come first so those win.
 */
export function tokenRulesFor(tokens: Set<string>, scope: string): string {
  if (tokens.size === 0) return '';
  return PARTS.flatMap((part) => {
    const declarations = Object.entries(part.declarations ?? {}).filter(([, value]) => tokensIn(value).some((token) => tokens.has(token)));
    if (declarations.length === 0) return [];
    return [`${selectorFor(scope, part)} { ${declarations.map(([property, value]) => `${property}: ${value};`).join(' ')} }`];
  }).join('\n');
}
