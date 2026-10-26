/**
 * Finding a component by what you type, for the editor's Components tab and
 * the component reference: best match first. A plain substring filter kept
 * the registry's order, so "OnClick" listed Button, If and twenty actions
 * that mention a click before OnClick itself, and "game" found nothing a
 * game is made of.
 *
 * Every word typed has to match something; the name counts most (the whole
 * name, then its start, then anywhere in it), then the words people use for
 * what they want (ALSO, and the editor's nicknames), then the description,
 * then setting names.
 */
import type { ComponentDoc } from './component-docs';
import { COMPONENT_NICKNAMES } from '@/lib/templates/editor/component-nicknames';

type Searchable = Pick<ComponentDoc, 'name' | 'description' | 'props'> & Partial<Pick<ComponentDoc, 'parent'>>;

/** Words people search for, and the components they mean (with COMPONENT_NICKNAMES, one word for one component) */
const ALSO: Record<string, string[]> = {
  game: ['ForEach', 'OnClick', 'OnKeyPress', 'OnKeyUp', 'OnSwipe', 'OnInterval', 'Var', 'If'],
  play: ['OnClick', 'OnKeyPress', 'OnSwipe', 'ProfileMusic', 'Embed'],
  click: ['OnClick', 'Button'],
  tap: ['OnClick', 'Button', 'OnSwipe'],
  press: ['OnClick', 'OnKeyPress', 'Button'],
  button: ['Button', 'OnClick'],
  key: ['OnKeyPress', 'OnKeyUp'],
  keyboard: ['OnKeyPress', 'OnKeyUp'],
  arrow: ['OnKeyPress', 'OnKeyUp', 'OnSwipe'],
  swipe: ['OnSwipe'],
  touch: ['OnSwipe', 'OnClick'],
  phone: ['OnSwipe'],
  drag: ['OnSwipe'],
  hover: ['OnMouseEnter', 'OnMouseLeave'],
  mouse: ['OnMouseEnter', 'OnMouseLeave', 'OnClick'],
  timer: ['OnInterval', 'Delay', 'Sequence'],
  time: ['OnInterval', 'Delay', 'Var'],
  wait: ['Delay', 'Sequence'],
  repeat: ['ForEach', 'OnInterval'],
  loop: ['ForEach'],
  list: ['ForEach', 'Var', 'Push', 'Pop', 'RemoveAt', 'Filter', 'Sort', 'Count'],
  count: ['Increment', 'Count', 'Var'],
  counter: ['Increment', 'Decrement', 'Var', 'ShowVar'],
  remember: ['Var'],
  save: ['Var'],
  variable: ['Var', 'Set', 'ShowVar'],
  random: ['Var', 'Set'],
  dice: ['Set', 'Var'],
  show: ['If', 'ShowVar', 'RevealBox', 'IfOwner', 'IfVisitor'],
  hide: ['If', 'RevealBox', 'IfOwner', 'IfVisitor'],
  only: ['If', 'IfOwner', 'IfVisitor'],
  music: ['ProfileMusic', 'Embed'],
  song: ['ProfileMusic', 'Embed'],
  midi: ['ProfileMusic'],
  picture: ['ProfilePhoto', 'MediaGrid', 'PolaroidFrame', 'ImageCarousel', 'DynamicImage'],
  photo: ['ProfilePhoto', 'MediaGrid', 'PolaroidFrame', 'ImageCarousel'],
  image: ['ProfilePhoto', 'MediaGrid', 'PolaroidFrame', 'ImageCarousel', 'DynamicImage'],
  img: ['ProfilePhoto', 'MediaGrid', 'PolaroidFrame', 'ImageCarousel', 'DynamicImage'],
  pics: ['MediaGrid', 'ImageCarousel', 'PolaroidFrame', 'ProfilePhoto'],
  gallery: ['MediaGrid', 'ImageCarousel', 'PolaroidFrame'],
  slideshow: ['ImageCarousel'],
  friends: ['FriendDisplay', 'MutualFriends', 'FollowButton'],
  follow: ['FollowButton'],
  rings: ['MyRings', 'RingNav'],
  webring: ['RingNav', 'MyRings'],
  house: ['MyHouse', 'HouseBadge'],
  home: ['MyHouse', 'HouseBadge'],
  comments: ['Guestbook'],
  tabs: ['Tabs', 'Tab'],
  form: ['TInput', 'Select', 'Checkbox', 'RadioGroup', 'Slider', 'ColorPicker'],
  input: ['TInput', 'Select', 'Checkbox', 'RadioGroup', 'Slider', 'ColorPicker'],
  text: ['TInput', 'ShowVar'],
  colour: ['ColorPicker', 'SetCSSVar'],
  color: ['ColorPicker', 'SetCSSVar'],
  style: ['AddClass', 'ToggleClass', 'SetCSSVar'],
  class: ['AddClass', 'RemoveClass', 'ToggleClass'],
  message: ['ShowToast', 'Guestbook'],
  popup: ['ShowToast', 'RevealBox'],
  copy: ['CopyToClipboard'],
};

/** "<OnClick />" and "on click" find OnClick: brackets, slashes and spaces don't count */
const tokensOf = (query: string) =>
  query.toLowerCase().replace(/[<>/]/g, ' ').split(/\s+/).filter(Boolean);

const squash = (text: string) => text.toLowerCase().replace(/\s+/g, '');

function scoreToken(item: Searchable, token: string): number {
  const name = item.name.toLowerCase();
  if (name === token) return 100;
  if (name.startsWith(token)) return 60;
  if (name.includes(token)) return 40;
  if (COMPONENT_NICKNAMES[token] === item.name) return 35;
  // A slip of one letter in a longer word: "frends" is friends (bug bash 2026-10-26)
  if (token.length >= 5) {
    const near = (word: string) => word.length >= 5 && oneEditApart(word, token);
    if (near(name) || Object.entries(COMPONENT_NICKNAMES).some(([nick, component]) => component === item.name && near(nick))) return 30;
    const listed = Object.entries(ALSO).filter(([word]) => near(word)).map(([, names]) => names.indexOf(item.name)).filter((at) => at >= 0);
    if (listed.length > 0) return 30 - Math.min(...listed) * 0.1;
  }
  // A word's components in the order listed: game puts ForEach before If
  const listed = Object.entries(ALSO)
    .filter(([word]) => word === token || (token.length > 3 && word.startsWith(token)))
    .map(([, names]) => names.indexOf(item.name))
    .filter((at) => at >= 0);
  if (listed.length > 0) return 35 - Math.min(...listed) * 0.1;
  const description = (item.description ?? '').toLowerCase();
  if (new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(description)) return 15;
  if (description.includes(token)) return 8;
  if (item.props.some((prop) => prop.name.toLowerCase().includes(token))) return 5;
  return 0;
}

/** Whether two words are one letter added, dropped or changed apart */
function oneEditApart(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1 || a === b) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(i + (a.length >= b.length ? 1 : 0)) === b.slice(i + (b.length >= a.length ? 1 : 0));
}

/** The components matching every word typed, best first; all of them, in order, for an empty search */
export function searchComponents<T extends Searchable>(items: readonly T[], query: string): T[] {
  const tokens = tokensOf(query);
  if (tokens.length === 0) return [...items];
  // "on click" typed with a space is OnClick too
  const whole = squash(query.replace(/[<>/]/g, ''));
  const scored: { item: T; score: number; at: number }[] = [];
  items.forEach((item, at) => {
    // "top friends" is the nickname topfriends too
    if (tokens.length > 1 && (item.name.toLowerCase() === whole || COMPONENT_NICKNAMES[whole] === item.name)) {
      scored.push({ item, score: 1000, at });
      return;
    }
    let score = 0;
    for (const token of tokens) {
      const s = scoreToken(item, token);
      if (s === 0) return;
      score += s;
    }
    // One that only works inside another (CarouselImage in ImageCarousel)
    // comes after the one it goes in
    scored.push({ item, score: item.parent ? score * 0.6 : score, at });
  });
  return scored.sort((a, b) => b.score - a.score || a.at - b.at).map(({ item }) => item);
}

/** The first sentence of a description, for a one-line list */
export function firstSentence(text: string | undefined): string {
  if (!text) return '';
  // A full stop before a capital or the end: "e.g. this" isn't one
  const end = text.search(/[.!?](?=\s+[A-Z<("']|$)/);
  return end === -1 ? text : text.slice(0, end + 1);
}
