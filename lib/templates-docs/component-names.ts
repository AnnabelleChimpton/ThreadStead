/**
 * Every registered component's name, for code that runs in the browser
 * (the tutorials link component names to the reference) and so can't load
 * the registry, which imports every component. The registry is the list;
 * this is a copy of its names, kept equal to it by
 * tests/template-engine/__tests__/component-docs.etest.ts, which prints the
 * new list when a component is added or renamed.
 */
export const COMPONENT_NAMES: readonly string[] = [
  'AddClass', 'Append', 'ArcadeButton', 'Bio', 'BlogPosts', 'Break', 'Button', 'CarouselImage',
  'CenteredBox', 'Checkbox', 'ColorPicker', 'ConditionalAttr', 'CopyToClipboard', 'Count', 'Cycle',
  'Decrement', 'Delay', 'DisplayName', 'DynamicImage', 'Else', 'ElseIf', 'Embed', 'Filter', 'Find',
  'FlexContainer', 'FollowButton', 'ForEach', 'FriendBadge', 'FriendDisplay', 'GridLayout',
  'Guestbook', 'Heading', 'HouseBadge', 'If', 'IfOwner', 'IfVisitor', 'ImageCarousel', 'Increment',
  'MediaGrid', 'Merge', 'MutualFriends', 'MyHouse', 'MyRings', 'ObjectSet', 'OnChange', 'OnClick',
  'OnInterval', 'OnKeyPress', 'OnKeyUp', 'OnMount', 'OnMouseEnter', 'OnMouseLeave', 'OnSwipe',
  'OnVisible', 'Option', 'PolaroidFrame', 'Pop', 'Prepend', 'ProfileBadges', 'ProfileHeader',
  'ProfileHero', 'ProfileMusic', 'ProfilePhoto', 'Push', 'Radio', 'RadioGroup', 'RemoveAt',
  'RemoveClass', 'Reset', 'RetroCard', 'RevealBox', 'RingNav', 'Select', 'Sequence', 'Set',
  'SetCSSVar', 'SetURLHash', 'SetURLParam', 'ShowToast', 'ShowVar', 'Slider', 'Sort', 'Step',
  'StickyNote', 'Sum', 'TInput', 'Tab', 'Tabs', 'Toggle', 'ToggleClass', 'Transform', 'UserImage',
  'Validate', 'Var', 'WebsiteDisplay'
];
