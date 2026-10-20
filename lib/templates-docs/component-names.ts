/**
 * Every registered component's name, for code that runs in the browser
 * (the tutorials link component names to the reference) and so can't load
 * the registry, which imports every component. The registry is the list;
 * this is a copy of its names, kept equal to it by
 * tests/template-engine/__tests__/component-docs.etest.ts, which prints the
 * new list when a component is added or renamed.
 */
export const COMPONENT_NAMES: readonly string[] = [
  'AddClass', 'Append', 'ArcadeButton', 'ArrayAt', 'Bio', 'BlogPosts', 'Boombox', 'Breadcrumb',
  'Break', 'Button', 'CRTMonitor', 'CarouselImage', 'Case', 'CassetteTape', 'CenteredBox',
  'Checkbox', 'Choose', 'Clone', 'ColorPicker', 'ConditionalAttr', 'ContactCard', 'ContactMethod',
  'Continue', 'CopyToClipboard', 'Count', 'CustomHTMLElement', 'Cycle', 'DebugValue', 'Decrement',
  'Default', 'Delay', 'DisplayName', 'DynamicImage', 'Else', 'ElseIf', 'EventDiv', 'Extract',
  'Filter', 'Find', 'FlexContainer', 'FloatingBadge', 'FollowButton', 'ForEach', 'FriendBadge',
  'FriendDisplay', 'Get', 'GlitchText', 'GradientBox', 'Grid', 'GridItem', 'GridLayout',
  'Guestbook', 'Heading', 'If', 'IfOwner', 'IfVisitor', 'ImageCarousel', 'Increment', 'MatrixRain',
  'MediaGrid', 'Merge', 'MutualFriends', 'NeonBorder', 'NeonSign', 'NotificationBell',
  'NotificationCenter', 'ObjectSet', 'OnChange', 'OnClick', 'OnHover', 'OnInterval', 'OnKeyPress',
  'OnMount', 'OnMouseEnter', 'OnMouseLeave', 'OnTimeout', 'OnVisible', 'Option', 'Otherwise',
  'Paragraph', 'PixelArtFrame', 'PolaroidFrame', 'Pop', 'Prepend', 'ProfileBadges',
  'ProfileHeader', 'ProfileHero', 'ProfileMusic', 'ProfilePhoto', 'ProgressItem',
  'ProgressTracker', 'Property', 'Push', 'Radio', 'RadioGroup', 'RemoveAt', 'RemoveClass', 'Reset',
  'RetroCard', 'RetroGrid', 'RetroTV', 'RetroTerminal', 'RevealBox', 'Select', 'Sequence', 'Set',
  'SetCSSVar', 'SetURLHash', 'SetURLParam', 'ShowToast', 'ShowVar', 'SiteBranding', 'Skill',
  'SkillChart', 'Slider', 'Sort', 'SplitLayout', 'Step', 'StickyNote', 'Sum', 'Switch', 'TInput',
  'Tab', 'Tabs', 'TextElement', 'ThreadsteadNavigation', 'Timeout', 'Toggle', 'ToggleClass',
  'Transform', 'UserAccount', 'UserImage', 'VHSTape', 'Validate', 'Var', 'WaveText',
  'WebsiteDisplay', 'When'
];
