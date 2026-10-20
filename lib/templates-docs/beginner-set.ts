/**
 * The components to start with: the palette, the component reference and
 * the lessons show these first, with the rest a click away. Everything else
 * is either plain HTML or CSS by another name, a second way to do one of
 * these, data plumbing, or site chrome.
 */
export const BEGINNER_SECTIONS: Array<{ id: string; title: string; blurb: string; components: string[] }> = [
  {
    id: 'your-stuff',
    title: 'Your stuff',
    blurb: 'The things the site keeps for you, wherever you want them on your page.',
    components: [
      'DisplayName', 'ProfilePhoto', 'Bio', 'Guestbook', 'BlogPosts', 'FriendDisplay', 'ProfileMusic',
      'MediaGrid', 'MyRings', 'RingNav', 'MyHouse', 'HouseBadge', 'FollowButton',
    ],
  },
  {
    id: 'bits-of-fun',
    title: 'Bits of fun',
    blurb: 'Videos and songs, sticky notes, things that open and close.',
    components: ['Embed', 'StickyNote', 'PolaroidFrame', 'RevealBox', 'Tabs', 'Tab', 'IfOwner', 'IfVisitor'],
  },
  {
    id: 'clicky',
    title: 'Things people can click',
    blurb: 'Buttons that count, switch and remember. The lessons start here.',
    components: ['Var', 'ShowVar', 'Button', 'OnClick', 'Set', 'Increment', 'Toggle', 'Cycle', 'Reset', 'If'],
  },
];

export const BEGINNER_COMPONENTS = new Set(BEGINNER_SECTIONS.flatMap((s) => s.components));
