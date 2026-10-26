/**
 * Components retired on 2026-10-25 (no live page used them). The old
 * starters here were written with some of them; compiling one now strips
 * those tags and keeps what's inside, which is what a page that still had
 * one would get.
 */
export const RETIRED_COMPONENTS: ReadonlySet<string> = new Set([
  'CRTMonitor', 'RetroTV', 'RetroTerminal', 'NeonSign', 'NeonBorder', 'RetroGrid', 'PixelArtFrame', 'VHSTape',
  'CassetteTape', 'Boombox', 'MatrixRain', 'GlitchText', 'WaveText', 'Skill', 'SkillChart', 'ProgressItem',
  'ProgressTracker', 'ContactMethod', 'ContactCard', 'Get', 'ArrayAt', 'Extract', 'Property', 'Clone', 'Switch',
  'Case', 'Default', 'Choose', 'When', 'Otherwise', 'Continue', 'OnHover', 'Timeout', 'OnTimeout', 'Grid',
  'GridItem', 'SplitLayout', 'GradientBox', 'TextElement', 'Paragraph', 'CustomHTMLElement', 'DebugValue',
  'EventDiv', 'FloatingBadge', 'NotificationCenter', 'NotificationBell', 'UserAccount', 'SiteBranding',
  'Breadcrumb', 'ThreadsteadNavigation',
])

const retired = new Set([...RETIRED_COMPONENTS].map((name) => name.toLowerCase()))

/** What a compile stripped that isn't a retired component: should be nothing */
export const notRetired = <T extends { name: string }>(stripped: readonly T[]) =>
  stripped.filter((s) => !retired.has(s.name.toLowerCase()))
