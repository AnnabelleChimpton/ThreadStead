// Display and Layout Component Registrations
import { ComponentRegistry } from './template-registry-class';
import { mergeWithUniversalProps } from '@/lib/templates/core/universal-styling';

// Import display/layout components
import ProfilePhoto from '@/components/features/templates/ProfilePhoto';
import DisplayName from '@/components/features/templates/DisplayName';
import Bio from '@/components/features/templates/Bio';
import BlogPosts from '@/components/features/templates/BlogPosts';
import Guestbook from '@/components/features/templates/Guestbook';
import FollowButton from '@/components/features/templates/FollowButton';
import MutualFriends from '@/components/features/templates/MutualFriends';
import FriendBadge from '@/components/features/templates/FriendBadge';
import ProfileMusic from '@/components/features/templates/ProfileMusic';
import FriendDisplay from '@/components/features/templates/FriendDisplay';
import WebsiteDisplay from '@/components/features/templates/WebsiteDisplay';
import NotificationCenter from '@/components/features/templates/NotificationCenter';
import NotificationBell from '@/components/features/templates/NotificationBell';
import UserAccount from '@/components/features/templates/UserAccount';
import SiteBranding from '@/components/features/templates/SiteBranding';
import Breadcrumb from '@/components/features/templates/Breadcrumb';
import FlexContainer from '@/components/features/templates/FlexContainer';
import GridLayout from '@/components/features/templates/GridLayout';
import { Grid, GridItem } from '@/components/features/templates/layout/Grid';
import SplitLayout from '@/components/features/templates/SplitLayout';
import CenteredBox from '@/components/features/templates/CenteredBox';
import GradientBox from '@/components/features/templates/GradientBox';
import NeonBorder from '@/components/features/templates/NeonBorder';
import RetroTerminal from '@/components/features/templates/RetroTerminal';
import PolaroidFrame from '@/components/features/templates/PolaroidFrame';
import StickyNote from '@/components/features/templates/StickyNote';
import RevealBox from '@/components/features/templates/RevealBox';
import FloatingBadge from '@/components/features/templates/FloatingBadge';
import WaveText from '@/components/features/templates/WaveText';
import GlitchText from '@/components/features/templates/GlitchText';
import Tabs, { Tab } from '@/components/features/templates/Tabs';
import ProfileHero from '@/components/features/templates/ProfileHero';
import ProfileHeader from '@/components/features/templates/ProfileHeader';
import MediaGrid from '@/components/features/templates/MediaGrid';
import ProfileBadges from '@/components/features/templates/ProfileBadges';
import MyRings from '@/components/features/templates/MyRings';
import RingNav from '@/components/features/templates/RingNav';
import MyHouse from '@/components/features/templates/MyHouse';
import HouseBadge from '@/components/features/templates/HouseBadge';
import RetroCard from '@/components/ui/layout/RetroCard';
import UserImage from '@/components/features/templates/UserImage';
import ProgressTracker, { ProgressItem } from '@/components/features/templates/ProgressTracker';
import ImageCarousel, { CarouselImage } from '@/components/features/templates/ImageCarousel';
import Embed from '@/components/features/templates/Embed';
import ContactCard, { ContactMethod } from '@/components/features/templates/ContactCard';
import SkillChart, { Skill } from '@/components/features/templates/SkillChart';
import CRTMonitor from '@/components/features/templates/CRTMonitor';
import NeonSign from '@/components/features/templates/NeonSign';
import ArcadeButton from '@/components/features/templates/ArcadeButton';
import PixelArtFrame from '@/components/features/templates/PixelArtFrame';
import RetroGrid from '@/components/features/templates/RetroGrid';
import VHSTape from '@/components/features/templates/VHSTape';
import CassetteTape from '@/components/features/templates/CassetteTape';
import RetroTV from '@/components/features/templates/RetroTV';
import Boombox from '@/components/features/templates/Boombox';
import MatrixRain from '@/components/features/templates/MatrixRain';
import TextElement from '@/components/features/templates/TextElement';
import Heading from '@/components/features/templates/Heading';
import Paragraph from '@/components/features/templates/Paragraph';
import NavigationPreview from '@/components/features/templates/NavigationPreview';

/**
 * Register all display and layout components
 */
export function registerDisplayComponents(registry: ComponentRegistry) {
  // HTML Element Components
  registry.register({
    name: 'TextElement',
    component: TextElement,
    group: 'layout',
    description: 'A plain piece of text in a div, span or p, with attributes for colour, font and spacing. Write the text between the tags.',
    example: '<TextElement tag="p" fontFamily="Georgia, serif" textColor="#2e4b3f">Currently reading: The Hobbit, chapter 6</TextElement>',
    props: mergeWithUniversalProps({
      content: { type: 'string', default: 'Edit this text', description: 'Text to show when nothing is written between the tags. Leave both out and it shows the placeholder Edit this text.' },
      tag: { type: 'enum', values: ['div', 'span', 'p'], default: 'div', description: 'Which HTML tag it becomes: div (default), span or p.' }
    }, 'text'),
    relationship: {
      type: 'text',
      acceptsChildren: true,
      childrenLabel: 'Text Content'
    }
  });

  registry.register({
    name: 'Heading',
    component: Heading,
    group: 'layout',
    description: 'A heading, h1 to h6. Unless you set fontSize or fontWeight, it uses the built-in size and weight for its level.',
    example: '<Heading level="2">Garden log</Heading>',
    props: mergeWithUniversalProps({
      content: { type: 'string', default: 'Heading Text', description: 'Text to show when nothing is written between the tags. Leave both out and it shows the placeholder Heading Text.' },
      level: { type: 'enum', values: ['1', '2', '3', '4', '5', '6'], default: '2', description: 'Which heading it is, 1 to 6 (h1 to h6). Defaults to 2.' }
    }, 'text'),
    relationship: {
      type: 'text',
      acceptsChildren: true,
      childrenLabel: 'Heading Content'
    }
  });

  registry.register({
    name: 'Paragraph',
    component: Paragraph,
    group: 'layout',
    description: 'A p paragraph with relaxed line spacing. Write the text between the tags.',
    example: '<Paragraph lineHeight="1.8" textColor="#2f2f2f">The beans are up and the snails found them first. Netting goes on this weekend.</Paragraph>',
    props: mergeWithUniversalProps({
      content: { type: 'string', default: 'This is a paragraph. Click to edit this text and add your own content.', description: 'Text to show when nothing is written between the tags. Leave both out and it shows a placeholder sentence.' },
      style: { type: 'string', css: true, description: 'Inline CSS, like the HTML style attribute. Only common properties come through (colours, fonts, spacing, sizes, borders, position); others such as letter-spacing are dropped.' }
    }, 'text'),
    relationship: {
      type: 'text',
      acceptsChildren: true,
      childrenLabel: 'Paragraph Content'
    }
  });

  // Profile Components
  registry.register({
    name: 'ProfilePhoto',
    component: ProfilePhoto,
    group: 'profile',
    description: 'Your profile picture, or a placeholder until you upload one.',
    example: '<ProfilePhoto size="lg" shape="circle" />',
    props: {
      size: { type: 'enum', values: ['xs', 'sm', 'md', 'lg'], default: 'md', description: 'How big: xs, sm, md or lg.' },
      shape: { type: 'enum', values: ['circle', 'square'], default: 'circle', description: 'circle or square.' }
    }
  });

  registry.register({
    name: 'DisplayName',
    component: DisplayName,
    group: 'profile',
    description: 'Your display name, as a heading by default.',
    example: '<DisplayName as="h1" />',
    props: mergeWithUniversalProps({
      as: { type: 'enum', values: ['h1', 'h2', 'h3', 'span', 'div'], default: 'h2', description: 'Which tag it\'s written as: a heading (h1 to h3), span or div.' },
      showLabel: { type: 'boolean', default: false, description: 'Puts "Name:" in front of it.' }
    }, 'text')
  });

  registry.register({
    name: 'Bio',
    component: Bio,
    group: 'profile',
    description: 'Your bio from Settings, under Profile.',
    example: '<Bio />',
    props: mergeWithUniversalProps({}, 'text')
  });

  registry.register({
    name: 'BlogPosts',
    component: BlogPosts,
    group: 'connected',
    featured: 3,
    description: 'Your latest posts, newest first, with their comments. Or just how many you\'ve written, with mode="count".',
    example: '<h2>Lately</h2>\n<BlogPosts limit="3" />',
    props: {
      limit: { type: 'number', min: 1, max: 20, default: 5, description: 'How many posts to show, 1 to 20.' },
      mode: { type: 'enum', values: ['full', 'count'], default: 'full', description: 'full shows the posts; count shows only how many there are.' }
    }
  });

  registry.register({
    name: 'Guestbook',
    component: Guestbook,
    group: 'connected',
    featured: 1,
    description: 'Your guestbook, the same one as on the standard profile. Visitors sign it, and you can delete any entry.',
    example: '<h2>Sign my guestbook</h2>\n<Guestbook />',
    props: {}
  });

  registry.register({
    name: 'FollowButton',
    component: FollowButton,
    group: 'connected',
    featured: 2,
    description: 'The follow button for your page. Visitors who are signed in can follow or unfollow you with it; you don\'t see it on your own page.',
    example: '<FollowButton />',
    props: {}
  });

  registry.register({
    name: 'MutualFriends',
    component: MutualFriends,
    group: 'connected',
    description: 'Tells a signed-in visitor how many friends the two of you share, and opens to show them. Shows nothing to you, to visitors who aren\'t signed in, or when there are none.',
    example: '<MutualFriends />',
    props: {}
  });

  registry.register({
    name: 'FriendBadge',
    component: FriendBadge,
    group: 'connected',
    description: 'A small "Friend" badge that only shows when the visitor and you follow each other.',
    example: '<FriendBadge />',
    props: {}
  });

  registry.register({
    name: 'ProfileMusic',
    component: ProfileMusic,
    group: 'connected',
    featured: 5,
    description: 'Your profile song (Settings, Music), with its player right where you put it. Without a song, visitors see nothing and you see a link to pick one.',
    example: '<ProfileMusic />',
    props: {}
  });

  registry.register({
    name: 'FriendDisplay',
    component: FriendDisplay,
    group: 'connected',
    featured: 4,
    description: 'Your featured friends, up to 8, with their pictures and links to their pages. You pick them in Settings, under Profile.',
    example: '<FriendDisplay />',
    props: {}
  });

  registry.register({
    name: 'WebsiteDisplay',
    component: WebsiteDisplay,
    group: 'connected',
    description: 'Your website recommendations, with their descriptions. You add them in Settings, under Profile.',
    example: '<WebsiteDisplay />',
    props: {}
  });

  registry.register({
    name: 'NotificationCenter',
    component: NotificationCenter,
    group: 'site',
    description: 'A bell button with the unread count of whoever is signed in and viewing the page (their own notifications, not the page owner). Clicking it opens their five latest notifications and a View all link; logged-out visitors see nothing.',
    example: '<NotificationCenter />',
    props: {}
  });

  registry.register({
    name: 'NotificationBell',
    component: NotificationBell,
    group: 'site',
    description: 'A bell that links to the notifications page, showing the unread count of whoever is signed in and viewing (their own, not the page owner), refreshed every 30 seconds. Logged-out visitors see nothing.',
    example: '<NotificationBell />',
    props: {}
  });

  registry.register({
    name: 'UserAccount',
    component: UserAccount,
    group: 'site',
    description: 'The account control for whoever is viewing the page. Signed-in visitors get their own account menu; logged-out visitors see visitor mode with Log In and Email Login buttons.',
    example: '<UserAccount />',
    props: {}
  });

  registry.register({
    name: 'SiteBranding',
    component: SiteBranding,
    group: 'site',
    description: 'The site name and tagline set by the site admins, as a link to the home page. It shows Loading... for a moment while it fetches them.',
    example: '<SiteBranding />',
    props: {}
  });

  registry.register({
    name: 'Breadcrumb',
    component: Breadcrumb,
    group: 'site',
    description: 'A trail of links built from the page address, like Home › Profiles › Yourname, with the last part as plain text. On a profile the Profiles link goes to /resident, which has no page yet.',
    example: '<Breadcrumb />',
    props: {}
  });

  // Layout Components
  registry.register({
    name: 'FlexContainer',
    component: FlexContainer,
    group: 'layout',
    description: 'Lines its children up in a row, or a column with direction="column". By default a row stacks into a column on screens under 768px wide.',
    example: '<FlexContainer direction="row" justify="between" align="center" gap="sm">\n  <span>Garden log</span>\n  <a href="/feed">What the neighbours are up to</a>\n</FlexContainer>',
    props: {
      direction: { type: 'enum', values: ['row', 'column', 'row-reverse', 'column-reverse'], default: 'row', description: 'row (default), column, row-reverse or column-reverse.' },
      align: { type: 'enum', values: ['start', 'center', 'end', 'stretch'], default: 'start', description: 'How items line up across the flow (top to bottom in a row): start (default), center, end or stretch.' },
      justify: { type: 'enum', values: ['start', 'center', 'end', 'between', 'around', 'evenly'], default: 'start', description: 'How items spread along the flow: start (default), center, end, between, around or evenly.' },
      wrap: { type: 'boolean', default: false, description: 'true lets items wrap onto another line when they run out of room.' },
      gap: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md', componentProp: 'gapSize', description: 'Space between items: xs, sm, md (default), lg or xl.' },
      responsive: { type: 'boolean', default: true, description: 'On by default: a row turns into a column on screens under 768px wide. Set false to keep the row everywhere.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Container Content'
    }
  });

  registry.register({
    name: 'GridLayout',
    component: GridLayout,
    group: 'layout',
    description: 'Puts its children into equal columns, filling them left to right. By default it uses fewer columns on narrow screens.',
    example: '<GridLayout columns="3" gap="lg">\n  <div><h3>Reading</h3><p>Piranesi</p></div>\n  <div><h3>Listening</h3><p>Cocteau Twins</p></div>\n  <div><h3>Growing</h3><p>Runner beans</p></div>\n</GridLayout>',
    props: {
      columns: { type: 'number', min: 1, max: 6, default: 2, description: 'Number of columns, 1 to 6. Defaults to 2.' },
      gap: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md', componentProp: 'gapSize', description: 'Space between items: xs, sm, md (default), lg or xl.' },
      responsive: { type: 'boolean', default: true, description: 'On by default: one column on phones, two from 640px wide, and the full count on wider screens. Set false to keep the full count everywhere.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Grid Items'
    }
  });

  registry.register({
    name: 'Grid',
    component: Grid,
    group: 'layout',
    description: 'A CSS grid with a set number of equal columns. Put GridItem tags inside to place cells by column and row; the column count stays the same on every screen size.',
    example: '<Grid columns="4" gap="1rem">\n  <GridItem column="1" colSpan="3">This week: planted garlic, pulled the last tomatoes.</GridItem>\n  <GridItem column="4">To buy: twine, seed potatoes</GridItem>\n</Grid>',
    props: {
      gridTemplateColumns: { type: 'string', default: 'repeat(3, 1fr)', css: true, description: 'Not used yet. The columns attribute always decides the columns (3 unless you set it).' },
      gridTemplateRows: { type: 'string', default: 'auto', css: true, description: 'CSS grid-template-rows, like auto 1fr. Ignored when rows is set.' },
      gridTemplateAreas: { type: 'string', description: 'Not used yet.' },
      gap: { type: 'string', default: '1rem', css: true, description: 'Space between cells as a CSS length. Defaults to 1rem.' },
      rowGap: { type: 'string', css: true, description: 'Space between rows only, like 0.5rem.' },
      columnGap: { type: 'string', css: true, description: 'Space between columns only, like 2rem.' },
      alignItems: { type: 'enum', values: ['start', 'end', 'center', 'stretch'], default: 'stretch', css: true, description: 'How cells line up top to bottom in their row: start, end, center or stretch (default).' },
      justifyItems: { type: 'enum', values: ['start', 'end', 'center', 'stretch'], default: 'stretch', description: 'Not used yet.' },
      alignContent: { type: 'enum', values: ['start', 'end', 'center', 'stretch', 'space-between', 'space-around', 'space-evenly'], description: 'Not used yet.' },
      justifyContent: { type: 'enum', values: ['start', 'end', 'center', 'stretch', 'space-between', 'space-around', 'space-evenly'], css: true, description: 'Where the columns sit if they do not fill the width: start, end, center, stretch, space-between, space-around or space-evenly.' },
      columns: { type: 'number', min: 1, max: 12, default: 3, description: 'Number of equal columns, 1 to 12. Defaults to 3.' },
      rows: { type: 'number', min: 1, max: 12, description: 'Number of rows, 1 to 12, each as tall as its content.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: ['GridItem'],
      childrenLabel: 'Grid Cells',
      defaultChildren: [
        { type: 'GridItem', props: {} },
        { type: 'GridItem', props: {} },
        { type: 'GridItem', props: {} }
      ]
    }
  });

  registry.register({
    name: 'GridItem',
    component: GridItem,
    group: 'layout',
    description: 'One cell of a Grid, placed by column and row. Only works inside Grid.',
    example: '<Grid columns="3">\n  <GridItem column="1" colSpan="2" row="1" rowSpan="2">Photo of the allotment</GridItem>\n  <GridItem>Weather: drizzle</GridItem>\n</Grid>',
    props: {
      gridColumn: { type: 'string', css: true, description: 'CSS grid-column, like 2 / 4 or span 2. Ignored when column is set.' },
      gridRow: { type: 'string', css: true, description: 'CSS grid-row, like 1 / 3. Ignored when row is set.' },
      gridArea: { type: 'string', css: true, description: 'CSS grid-area by line numbers, like 1 / 1 / 3 / 3. Named areas do not work yet, since Grid does not apply gridTemplateAreas.' },
      justifySelf: { type: 'enum', values: ['start', 'end', 'center', 'stretch'], description: 'Not used yet.' },
      alignSelf: { type: 'enum', values: ['start', 'end', 'center', 'stretch'], css: true, description: 'How this cell lines up top to bottom: start, end, center or stretch.' },
      column: { type: 'number', min: 1, description: 'The column it starts in, counting from 1.' },
      row: { type: 'number', min: 1, description: 'The row it starts in, counting from 1.' },
      colSpan: { type: 'number', min: 1, default: 1, description: 'How many columns it covers. Only works together with column.' },
      rowSpan: { type: 'number', min: 1, default: 1, description: 'How many rows it covers. Only works together with row.' }
    },
    relationship: {
      type: 'child',
      requiresParent: 'Grid',
      acceptsChildren: true,
      childrenLabel: 'Cell Content'
    }
  });

  registry.register({
    name: 'SplitLayout',
    component: SplitLayout,
    group: 'layout',
    description: 'Puts two parts side by side at a set width ratio: the first child on the left, the second on the right. Any extra children stack under the second.',
    example: '<SplitLayout ratio="1:2" gap="lg">\n  <div><h3>About me</h3><p>Knitter, gardener, slow reader.</p></div>\n  <div><h3>Latest</h3><p>Finished my first pair of socks.</p></div>\n</SplitLayout>',
    props: {
      ratio: { type: 'enum', values: ['1:1', '1:2', '2:1', '1:3', '3:1'], default: '1:1', description: 'Width of the left part to the right part: 1:1 (default), 1:2, 2:1, 1:3 or 3:1.' },
      vertical: { type: 'boolean', default: false, description: 'Stacks the two parts at full width. Only takes effect with responsive="false"; otherwise wide screens still put them side by side, at equal width.' },
      gap: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md', componentProp: 'spacing', description: 'Space between the parts: xs, sm, md (default), lg or xl.' },
      responsive: { type: 'boolean', default: true, description: 'On by default: the parts stack on screens under 1024px wide and sit side by side above that. Set false to keep them side by side everywhere.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Split Content'
    }
  });

  registry.register({
    name: 'CenteredBox',
    component: CenteredBox,
    group: 'layout',
    description: 'A box centred on the page, with a maximum width and padding inside.',
    example: '<CenteredBox maxWidth="xl" padding="lg">\n  <p>Welcome to my corner of the web. Take your shoes off and stay a while.</p>\n</CenteredBox>',
    props: {
      maxWidth: { type: 'enum', values: ['sm', 'md', 'lg', 'xl', '2xl', 'full'], default: 'lg', componentProp: 'containerMaxWidth', description: 'How wide it can get: sm (24rem), md (28rem), lg (32rem, default), xl (36rem), 2xl (42rem) or full.' },
      padding: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md', componentProp: 'containerPadding', description: 'Space inside the box: xs, sm, md (default), lg or xl.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Centered Content'
    }
  });

  // Decorative Components
  registry.register({
    name: 'GradientBox',
    component: GradientBox,
    group: 'decorative',
    description: 'A box with a colored gradient background. Put anything you like inside it.',
    example: '<GradientBox gradient="ocean" direction="b" padding="lg">\n  <h2>welcome in</h2>\n  <p>the kettle\'s on. have a look around.</p>\n</GradientBox>',
    props: {
      gradient: { type: 'enum', values: ['sunset', 'ocean', 'forest', 'neon', 'rainbow', 'fire'], default: 'sunset', description: 'Which color blend fills the box. Ignored when colors is set.' },
      direction: { type: 'enum', values: ['r', 'l', 'b', 't', 'br', 'bl', 'tr', 'tl'], default: 'br', description: 'Which way the blend runs: r goes left to right, b top to bottom, br from the top-left corner to the bottom-right, and so on.' },
      padding: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md', componentProp: 'containerPadding', description: 'Space between the edge of the box and what\'s inside. Ignored if you give the box a class.' },
      rounded: { type: 'boolean', default: true, description: 'Rounds the corners. Ignored if you give the box a class.' },
      colors: { type: 'string', description: 'Overrides gradient. white, black and transparent give a plain background, blue-purple gives a blue-to-pink blend, and the six gradient names work here too. Other words are tried as a site color class and often show no background.' },
      opacity: { type: 'string', componentProp: 'gradientOpacity', description: 'Not used yet.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Content'
    }
  });

  registry.register({
    name: 'NeonBorder',
    component: NeonBorder,
    group: 'decorative',
    description: 'Draws a glowing colored border around what\'s inside. The glow pulses gently the whole time.',
    example: '<NeonBorder color="pink" intensity="soft">\n  <p>currently: repotting the monstera</p>\n</NeonBorder>',
    props: {
      color: { type: 'enum', values: ['blue', 'pink', 'green', 'purple', 'cyan', 'yellow'], default: 'blue', componentProp: 'neonColor', description: 'The color of the border and its glow.' },
      intensity: { type: 'enum', values: ['soft', 'medium', 'bright'], default: 'medium', description: 'How far the glow spreads: soft is a thin halo, bright a wide one.' },
      padding: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md', componentProp: 'containerPadding', description: 'Space between the border and what\'s inside.' },
      rounded: { type: 'boolean', default: true, description: 'Rounds the corners.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Content'
    }
  });

  registry.register({
    name: 'RetroTerminal',
    component: RetroTerminal,
    group: 'decorative',
    description: 'A black box with colored monospace text, like an old computer terminal. A title bar with three colored dots and the word terminal sits on top unless you turn it off.',
    example: '<RetroTerminal variant="amber">\n  <p>&gt; whoami</p>\n  <p>part-time gardener, full-time tea drinker</p>\n</RetroTerminal>',
    props: {
      variant: { type: 'enum', values: ['green', 'amber', 'blue', 'white'], default: 'green', description: 'Sets the color of the text and border. The background stays black.' },
      showHeader: { type: 'boolean', default: true, description: 'Shows the title bar across the top.' },
      padding: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md', componentProp: 'containerPadding', description: 'Space around the text inside the terminal.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Terminal Content'
    }
  });

  registry.register({
    name: 'PolaroidFrame',
    component: PolaroidFrame,
    group: 'decorative',
    description: 'A white instant-photo frame with a caption under it. Put an image inside.',
    example: '<PolaroidFrame caption="the allotment in june" rotation="2">\n  <img src="https://example.com/garden.jpg" alt="Bean poles and sunflowers" />\n</PolaroidFrame>',
    props: {
      caption: { type: 'string', default: '', description: 'The handwritten line under the picture.' },
      rotation: { type: 'number', min: -15, max: 15, default: 0, description: 'How crooked, in degrees, from -15 to 15.' },
      shadow: { type: 'boolean', default: true, description: 'A soft shadow under the frame.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Frame Content'
    }
  });

  registry.register({
    name: 'StickyNote',
    component: StickyNote,
    group: 'decorative',
    description: 'A paper sticky note, a little crooked if you like, with dark ink on it.',
    example: '<StickyNote color="pink" rotation="-3">\n  <p>back from the coast on sunday, reply to letters then</p>\n</StickyNote>',
    props: {
      color: { type: 'enum', values: ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'], default: 'yellow', componentProp: 'noteColor', description: 'The paper: yellow, pink, blue, green, orange or purple.' },
      size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md', description: 'How wide: sm, md or lg.' },
      rotation: { type: 'number', min: -15, max: 15, default: 0, description: 'How crooked, in degrees, from -15 to 15.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Note Content'
    }
  });

  registry.register({
    name: 'RevealBox',
    component: RevealBox,
    group: 'interactive',
    description: 'A button that shows what\'s inside when it\'s clicked, and hides it again.',
    example: '<RevealBox buttonText="Spoilers for the book club" revealText="Hide again">\n  <p>The lighthouse keeper was the narrator all along.</p>\n</RevealBox>',
    props: {
      buttonText: { type: 'string', default: 'Click to reveal', description: 'What the button says before it\'s opened.' },
      revealText: { type: 'string', default: 'Hide', description: 'What the button says once it\'s open.' },
      variant: { type: 'enum', values: ['slide', 'fade', 'grow'], default: 'fade', description: 'How it opens: slide, fade or grow.' },
      buttonStyle: { type: 'enum', values: ['button', 'link', 'minimal'], default: 'button', description: 'button, link or minimal.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Hidden Content'
    }
  });

  registry.register({
    name: 'FloatingBadge',
    component: FloatingBadge,
    group: 'decorative',
    description: 'A small rounded label like a sticker, with your text between the tags. It\'s fixed to a corner of the browser window, so it stays in place while visitors scroll.',
    example: '<FloatingBadge color="pink" animation="float" position="bottom-right">new zine up</FloatingBadge>',
    props: {
      color: { type: 'enum', values: ['blue', 'green', 'red', 'yellow', 'purple', 'pink'], default: 'blue', componentProp: 'badgeColor', description: 'The badge\'s background color. The text is white, or black on yellow.' },
      size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md', description: 'The text size and padding of the badge.' },
      animation: { type: 'enum', values: ['bounce', 'pulse', 'float', 'none'], default: 'float', description: 'How it moves: bounce hops up and down, pulse fades in and out, float bobs gently, none keeps it still.' },
      position: { type: 'enum', values: ['top-left', 'top-right', 'bottom-left', 'bottom-right'], default: 'top-right', componentProp: 'badgePosition', description: 'Which corner of the window it sits in.' }
    }
  });

  // Text Effects
  registry.register({
    name: 'WaveText',
    component: WaveText,
    group: 'decorative',
    description: 'Text whose letters bob up and down one after another, like a wave passing through.',
    example: '<WaveText text="thanks for stopping by" speed="slow" amplitude="small" />',
    props: {
      text: { type: 'string', required: true, description: 'The words to animate.' },
      speed: { type: 'enum', values: ['slow', 'medium', 'fast'], default: 'medium', description: 'How long one bob takes: fast is about a second, slow about three.' },
      amplitude: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium', description: 'How high each letter rises.' },
      color: { type: 'string', default: 'currentColor', componentProp: 'waveColor', description: 'Any CSS color for the text. Left out, it matches the text around it.' }
    }
  });

  registry.register({
    name: 'GlitchText',
    component: GlitchText,
    group: 'decorative',
    description: 'Bold text that jitters, with two colored copies shifting behind it like a bad video signal.',
    example: '<GlitchText text="under construction" intensity="low" />',
    props: {
      text: { type: 'string', required: true, description: 'The words to show. An apostrophe in the text stops the colored copies from appearing.' },
      intensity: { type: 'enum', values: ['low', 'medium', 'high'], default: 'medium', description: 'How far and how fast it jitters. high shakes the most.' },
      color: { type: 'string', default: 'currentColor', componentProp: 'glitchColor', description: 'Color of the main text. Left out, it matches the text around it.' },
      glitchColor1: { type: 'string', default: '#ff0000', description: 'Color of the first shifted copy. Red unless you change it.' },
      glitchColor2: { type: 'string', default: '#00ffff', description: 'Color of the second shifted copy. Cyan unless you change it.' }
    }
  });

  // Tabs
  registry.register({
    name: 'Tabs',
    component: Tabs,
    group: 'layout',
    description: 'A row of tab buttons with one panel underneath. Each Tab inside becomes a button; the first is open when the page loads, and clicking another swaps the panel.',
    example: '<Tabs>\n  <Tab title="About"><p>I keep bees and write about it.</p></Tab>\n  <Tab title="Reading list"><ul><li>Piranesi</li><li>A Wizard of Earthsea</li></ul></Tab>\n</Tabs>',
    props: {},
    relationship: {
      type: 'parent',
      acceptsChildren: ['Tab'],
      defaultChildren: [
        { type: 'Tab', props: { title: 'Tab 1' } },
        { type: 'Tab', props: { title: 'Tab 2' } }
      ],
      minChildren: 1,
      childrenLabel: 'Tab Pages'
    }
  });

  registry.register({
    name: 'Tab',
    component: Tab,
    group: 'layout',
    description: 'One page of a Tabs box: its content shows in the panel when its button is clicked. Only works inside Tabs.',
    example: '<Tabs>\n  <Tab title="About"><p>I keep bees and write about it.</p></Tab>\n  <Tab title="Hive notes"><p>Second hive swarmed in June.</p></Tab>\n</Tabs>',
    props: {
      title: { type: 'string', required: true, description: 'The label on this tab button. Required.' }
    },
    relationship: {
      type: 'child',
      requiresParent: 'Tabs',
      acceptsChildren: true
    }
  });

  // Profile Feature Components
  registry.register({
    name: 'ProfileHero',
    component: ProfileHero,
    group: 'profile',
    description: 'Your display name, big, in a banner across the page.',
    example: '<ProfileHero variant="tape" />',
    props: {
      variant: { type: 'enum', values: ['tape', 'plain'], default: 'plain', description: 'plain is a soft card; tape is a yellow strip, slightly crooked.' }
    }
  });

  registry.register({
    name: 'ProfileHeader',
    component: ProfileHeader,
    group: 'profile',
    description: 'The header from the standard profile: your picture, name, status, bio, and the follow button for visitors (Edit Profile for you).',
    example: '<ProfileHeader photoSize="lg" />',
    props: {
      showPhoto: { type: 'boolean', default: true, description: 'Shows your picture.' },
      showBio: { type: 'boolean', default: true, description: 'Shows your bio.' },
      showActions: { type: 'boolean', default: true, description: 'Shows the buttons: follow for visitors, Edit Profile for you.' },
      photoSize: { type: 'enum', values: ['xs', 'sm', 'md', 'lg'], default: 'md', description: 'How big the picture is: xs, sm, md or lg.' }
    }
  });

  registry.register({
    name: 'MediaGrid',
    component: MediaGrid,
    group: 'connected',
    featured: 6,
    description: 'Your featured photos, the six newest, in a grid. A photo\'s caption shows when you point at it.',
    example: '<MediaGrid />',
    props: {}
  });

  registry.register({
    name: 'ProfileBadges',
    component: ProfileBadges,
    group: 'connected',
    description: 'The 88×31 badges of the rings you\'re in, linking to each ring.',
    example: '<ProfileBadges layout="grid" />',
    props: {
      showTitle: { type: 'boolean', default: false, description: 'Not used yet.' },
      layout: { type: 'enum', values: ['grid', 'list'], default: 'grid', description: 'grid puts the badges side by side; list stacks them.' }
    }
  });

  // Your rings and your pixel home (data: lib/templates/owner-rings.ts, lib/templates/page-home.ts)
  registry.register({
    name: 'MyRings',
    component: MyRings,
    group: 'connected',
    featured: 7,
    description: 'The rings you\'re in, as links to each ring\'s page. The list fills in once the page has loaded. With no rings, visitors see nothing and you see a link to find one.',
    example: '<h2>My rings</h2>\n<MyRings />',
    props: {
      limit: { type: 'number', min: 1, max: 50, default: 20, description: 'How many rings to list, 1 to 50.' }
    }
  });

  registry.register({
    name: 'RingNav',
    component: RingNav,
    group: 'connected',
    featured: 8,
    description: 'Webring links for one of your rings: Previous, the ring\'s page, Random and Next. Previous and Next go to the pixel homes of the members before and after you on the ring\'s street. If you\'re not in that ring, or it isn\'t public, visitors see nothing and you see a note.',
    example: '<RingNav ring="tiny-gardens" />',
    props: {
      ring: { type: 'string', required: true, example: 'tiny-gardens', description: 'The ring\'s slug, the end of its address: for /tr/tiny-gardens, write tiny-gardens.' }
    }
  });

  registry.register({
    name: 'MyHouse',
    component: MyHouse,
    group: 'connected',
    featured: 9,
    description: 'Your pixel home, small, linking to it. It shows the picture of your yard once one has been drawn, or else the house. Nothing shows if you don\'t have a home.',
    example: '<MyHouse size="sm" />',
    props: {
      size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md', description: 'How wide: sm (128px), md (256px, default) or lg (512px).' }
    }
  });

  registry.register({
    name: 'HouseBadge',
    component: HouseBadge,
    group: 'connected',
    featured: 10,
    description: 'Your 88×31 house badge, the one beside Step back outside on your profile, linking to your pixel home. Nothing shows if you don\'t have a home.',
    example: '<HouseBadge />',
    props: {}
  });

  registry.register({
    name: 'RetroCard',
    component: RetroCard,
    group: 'layout',
    description: 'A boxed section in the site card style, with an optional heading at the top.',
    example: '<RetroCard title="Currently reading">\n  <ul><li>Piranesi</li><li>A Wizard of Earthsea</li></ul>\n</RetroCard>',
    props: {
      title: { type: 'string', description: 'Heading shown at the top of the card. Leave it out for no heading.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Card Content'
    }
  });

  registry.register({
    name: 'UserImage',
    component: UserImage,
    group: 'layout',
    description: 'Shows one image, from a web address or from your page data such as your uploads. Without width or height it sits in a square box set by size.',
    example: '<UserImage src="https://moss.neocities.org/cat.jpg" alt="My cat asleep on the radiator" size="lg" rounded="full" border="true" />',
    props: {
      src: { type: 'string', description: 'Web address of the image.' },
      data: { type: 'string', description: 'Where to find the image in your page data when src is empty, like owner.avatarUrl or images (your uploaded images). If nothing is found there, nothing shows.' },
      index: { type: 'number', default: 0, description: 'Which image to take when data points at a list, counting from 0 (default).' },
      alt: { type: 'string', default: '', description: 'Text describing the image, for screen readers and for when it does not load.' },
      width: { type: 'string', css: true, description: 'A CSS width, like 200px. Setting width or height replaces size.' },
      height: { type: 'string', css: true, description: 'A CSS height, like 150px. Setting width or height replaces size.' },
      size: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl', 'full'], default: 'md', componentProp: 'imageSize', description: 'Square box size: xs (32px), sm (64px), md (96px, default), lg (128px), xl (192px), or full for the full width at natural height.' },
      rounded: { type: 'enum', values: ['none', 'sm', 'md', 'lg', 'full'], default: 'sm', description: 'Corner rounding: none, sm (default), md, lg or full (a circle for a square box).' },
      border: { type: 'boolean', default: false, componentProp: 'showBorder', description: 'true adds a thin grey border.' },
      shadow: { type: 'enum', values: ['none', 'sm', 'md', 'lg'], default: 'none', componentProp: 'imageShadow', description: 'Drop shadow: none (default), sm, md or lg.' },
      fit: { type: 'enum', values: ['cover', 'contain', 'fill', 'scale-down'], default: 'cover', description: 'How the picture fills its box: cover crops to fill (default), contain shows all of it, fill stretches it, scale-down only ever shrinks it.' },
      fallback: { type: 'string', default: '/assets/default-image.png', description: 'Image to show when src fails to load or is missing. The default path has no image on the site, so set your own if you want a stand-in.' }
    }
  });

  // Display Components (Complex)
  registry.register({
    name: 'ProgressTracker',
    component: ProgressTracker,
    group: 'decorative',
    description: 'A list of progress meters with an optional heading. Each meter is a ProgressItem placed inside it.',
    example: '<ProgressTracker title="winter projects" display="bars" theme="retro">\n  <ProgressItem label="scarf for my sister" value="60" color="green" />\n  <ProgressItem label="books read" value="14" max="24" color="purple" />\n</ProgressTracker>',
    props: {
      title: { type: 'string', description: 'A heading above the meters.' },
      display: { type: 'enum', values: ['bars', 'stars', 'circles', 'dots'], default: 'bars', componentProp: 'displayMode', description: 'How each item is drawn: a filled bar, a star rating, a ring, or a row of dots. Stars count to 5 and dots to 10 unless an item sets max.' },
      theme: { type: 'enum', values: ['modern', 'retro', 'neon', 'minimal'], default: 'modern', description: 'The color set for the meters. retro uses lighter shades, neon adds a soft shadow around the list, minimal makes every meter gray.' },
      showValues: { type: 'boolean', default: true, description: 'Shows each item\'s number next to its meter.' },
      layout: { type: 'enum', values: ['vertical', 'horizontal'], default: 'vertical', description: 'vertical stacks the meters. horizontal puts them side by side and wraps onto new rows.' },
      size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md', description: 'The text size and how thick the bars, rings and dots are.' }
    },
    relationship: {
      type: 'parent',
      acceptsChildren: ['ProgressItem'],
      defaultChildren: [
        { type: 'ProgressItem', props: { label: 'JavaScript', value: 85, max: 100 } },
        { type: 'ProgressItem', props: { label: 'React', value: 90, max: 100 } },
        { type: 'ProgressItem', props: { label: 'TypeScript', value: 75, max: 100 } }
      ],
      minChildren: 1,
      childrenLabel: 'Skills'
    }
  });

  registry.register({
    name: 'ProgressItem',
    component: ProgressItem,
    group: 'decorative',
    description: 'One meter in a ProgressTracker. It only works inside a ProgressTracker; on its own it shows as plain text.',
    example: '<ProgressTracker display="stars">\n  <ProgressItem label="sourdough" value="3.5" max="5" description="the crumb is getting there" />\n</ProgressTracker>',
    props: {
      label: { type: 'string', required: true, description: 'The name shown next to the meter.' },
      value: { type: 'number', required: true, min: 0, description: 'How far along it is. Keep it at or below max. Stars can take a half, like 3.5.' },
      max: { type: 'number', min: 1, description: 'What counts as full. Left out, it\'s 100 for bars and rings, 5 for stars and 10 for dots. When it\'s 100 the number shows as a percent.' },
      color: { type: 'enum', values: ['blue', 'green', 'red', 'purple', 'pink', 'yellow'], default: 'blue', description: 'The meter\'s fill color. The minimal theme ignores it.' },
      description: { type: 'string', description: 'Text that appears when someone hovers over the meter.' }
    },
    relationship: {
      type: 'child',
      requiresParent: 'ProgressTracker'
    }
  });

  registry.register({
    name: 'ImageCarousel',
    component: ImageCarousel,
    group: 'layout',
    description: 'A slideshow with arrows, dots and a thumbnail row; visitors can also use arrow keys or swipe. Put CarouselImage tags inside, or leave it empty to show the images you have uploaded.',
    example: '<ImageCarousel height="lg" autoplay="true" interval="6">\n  <CarouselImage src="https://moss.neocities.org/garden-may.jpg" alt="Seedlings on the windowsill" caption="May" />\n  <CarouselImage src="https://moss.neocities.org/garden-july.jpg" alt="Beans up the canes" caption="July" />\n</ImageCarousel>',
    props: {
      autoplay: { type: 'boolean', default: false, description: 'true moves to the next image on its own and adds a play/pause button. Any click on the controls stops it.' },
      interval: { type: 'number', min: 1, max: 30, default: 5, description: 'Seconds between images when autoplay is on, 1 to 30. Defaults to 5.' },
      showThumbnails: { type: 'boolean', default: true, description: 'Set false to hide the row of small previews.' },
      showDots: { type: 'boolean', default: true, description: 'Set false to hide the dots.' },
      showArrows: { type: 'boolean', default: true, description: 'Set false to hide the previous and next arrows.' },
      height: { type: 'enum', values: ['sm', 'md', 'lg', 'xl'], default: 'md', componentProp: 'carouselHeight', description: 'Height of the picture area: sm (12rem), md (16rem, default), lg (24rem) or xl (32rem). Images are cropped to fill it.' },
      transition: { type: 'enum', values: ['slide', 'fade', 'zoom'], default: 'slide', description: 'How one image changes to the next: slide (default), fade or zoom.' },
      loop: { type: 'boolean', default: true, description: 'On by default: going past the last image comes back to the first. Set false to stop at the ends.' },
      controls: { type: 'enum', values: ['arrows', 'dots', 'thumbnails', 'all'], default: 'all', description: 'Which controls can show: arrows, dots, thumbnails or all (default). Controls only appear with two or more images.' }
    },
    relationship: {
      type: 'parent',
      acceptsChildren: ['CarouselImage'],
      defaultChildren: [
        { type: 'CarouselImage', props: { src: '/placeholder1.jpg', alt: 'Image 1', caption: 'Sample image 1' } },
        { type: 'CarouselImage', props: { src: '/placeholder2.jpg', alt: 'Image 2', caption: 'Sample image 2' } }
      ],
      minChildren: 1,
      childrenLabel: 'Images'
    }
  });

  registry.register({
    name: 'CarouselImage',
    component: CarouselImage,
    group: 'layout',
    description: 'One image in an ImageCarousel. Only works inside ImageCarousel.',
    example: '<ImageCarousel>\n  <CarouselImage src="https://moss.neocities.org/hive.jpg" alt="The blue hive in spring" caption="Hive one" />\n  <CarouselImage src="https://moss.neocities.org/honey.jpg" alt="Jars of honey on a shelf" caption="First harvest" link="https://moss.neocities.org/honey.html" />\n</ImageCarousel>',
    props: {
      src: { type: 'string', required: true, description: 'Web address of the image. Required.' },
      alt: { type: 'string', description: 'Text describing the image.' },
      caption: { type: 'string', description: 'Text laid over the bottom of the image.' },
      link: { type: 'string', description: 'Web address that opens in a new tab when the image is clicked.' }
    },
    relationship: {
      type: 'child',
      requiresParent: 'ImageCarousel'
    }
  });

  registry.register({
    name: 'Embed',
    component: Embed,
    group: 'layout',
    description: 'A video or song from YouTube, Vimeo, Bandcamp, SoundCloud or Spotify. Visitors see a Play button first; the player only loads from the other site when they press it. Paste the link from your address bar. For Bandcamp, use the link in its embed code.',
    example: '<h2>Where it all started</h2>\n<Embed src="https://www.youtube.com/watch?v=jNQXAC9IVRw" title="Me at the zoo" />',
    props: {
      src: { type: 'string', required: true, example: 'https://youtu.be/jNQXAC9IVRw', description: 'The link: a video, song, album or playlist page, or the site\'s own player link. For Bandcamp, the link from its embed code, or the whole embed code.' },
      title: { type: 'string', description: 'What it is, like the song\'s name. Shown next to the Play button, and given to the player for screen readers.' },
      height: { type: 'number', min: 40, max: 1200, description: 'Player height in pixels, 40 to 1200. Without it, videos keep a 16:9 shape and music players use their site\'s own height.' }
    }
  });

  registry.register({
    name: 'ContactCard',
    component: ContactCard,
    group: 'layout',
    description: 'A card listing ways to reach you, each one a link where that makes sense, with a copy button. Put ContactMethod tags inside.',
    example: '<ContactCard title="Say hello" theme="minimal" layout="detailed">\n  <ContactMethod type="email" value="moss@example.com" />\n  <ContactMethod type="website" value="moss.neocities.org" label="My old site" />\n</ContactCard>',
    props: {
      expanded: { type: 'boolean', default: false, description: 'true shows every method from the start instead of only the first few.' },
      theme: { type: 'enum', values: ['modern', 'business', 'creative', 'minimal'], default: 'modern', description: 'Colour scheme: modern (white, default), business (slate grey), creative (purple and pink gradient) or minimal.' },
      layout: { type: 'enum', values: ['compact', 'detailed', 'grid'], default: 'compact', description: 'compact (label under each value, default), detailed (label above, more space) or grid (two columns, no labels).' },
      showHeader: { type: 'boolean', default: true, description: 'Set false to hide the title bar, and the expand arrow in it.' },
      collapsible: { type: 'boolean', default: true, description: 'On by default: when there are more methods than maxMethods, adds a button to show the rest. Set false and the extra ones stay hidden.' },
      maxMethods: { type: 'number', min: 1, max: 10, default: 3, description: 'How many methods show before the rest are tucked away, 1 to 10. Defaults to 3.' },
      title: { type: 'string', default: 'Contact Me', description: 'Title in the header. Defaults to Contact Me.' }
    },
    relationship: {
      type: 'parent',
      acceptsChildren: ['ContactMethod'],
      defaultChildren: [
        { type: 'ContactMethod', props: { type: 'email', value: 'user@example.com', label: 'Email' } }
      ],
      minChildren: 1,
      maxChildren: 10,
      childrenLabel: 'Contact Methods'
    }
  });

  registry.register({
    name: 'ContactMethod',
    component: ContactMethod,
    group: 'layout',
    description: 'One way to reach you, shown as a line in a ContactCard. Only works inside ContactCard.',
    example: '<ContactCard>\n  <ContactMethod type="email" value="moss@example.com" priority="9" />\n  <ContactMethod type="github" value="github.com/moss" copyable="false" />\n</ContactCard>',
    props: {
      type: { type: 'enum', values: ['email', 'phone', 'linkedin', 'github', 'twitter', 'website', 'discord', 'custom'], required: true, description: 'email, phone, linkedin, github, twitter, website, discord or custom. Required. email opens a mail app, phone a phone app, linkedin, github, twitter and website become web links (https:// is added if missing), and discord and custom stay plain text.' },
      value: { type: 'string', required: true, description: 'The address, number or handle to show. Required. For web links write the full address, like github.com/yourname.' },
      label: { type: 'string', description: 'Name shown with the value. Defaults to the name of the type, like Email or GitHub.' },
      icon: { type: 'string', description: 'Text or symbol shown before the value. Each type has a default emoji.' },
      copyable: { type: 'boolean', default: true, description: 'On by default: adds a button that copies the value. Set false to remove it.' },
      priority: { type: 'number', min: 1, max: 10, default: 5, description: 'Order in the card, 1 to 10. Higher numbers come first; ties keep the order you wrote them in. Defaults to 5.' }
    },
    relationship: {
      type: 'child',
      requiresParent: 'ContactCard'
    }
  });

  registry.register({
    name: 'SkillChart',
    component: SkillChart,
    group: 'decorative',
    description: 'A card listing skills or hobbies as bars, rings, bubbles or tags. Put Skill tags inside it. Under the heading it always shows how many skills there are and how they\'re sorted.',
    example: '<SkillChart title="things I\'m learning" theme="minimal" showCategories="false">\n  <Skill name="Knitting" level="70" color="#c97b63" />\n  <Skill name="Sourdough" level="45" color="#d4a373" />\n  <Skill name="Watercolor" level="30" color="#6b9080" />\n</SkillChart>',
    props: {
      title: { type: 'string', default: 'Skills', description: 'The heading at the top of the card.' },
      display: { type: 'enum', values: ['bars', 'radial', 'bubbles', 'tags'], default: 'bars', componentProp: 'displayMode', description: 'How each skill is drawn: a bar, a ring, a bubble that grows with the level, or a pill-shaped tag.' },
      theme: { type: 'enum', values: ['modern', 'neon', 'professional', 'minimal'], default: 'modern', description: 'The card\'s look. modern is white with a blue-to-purple bar, neon is dark with cyan edges, professional is slate gray, minimal is plain white.' },
      layout: { type: 'enum', values: ['grid', 'columns', 'flow'], default: 'grid', description: 'How the skills are arranged. grid stacks bars and puts rings in a grid, columns flows rings into newspaper-style columns, flow lines everything up in wrapping rows.' },
      showValues: { type: 'boolean', default: true, description: 'Shows each skill\'s number or percent.' },
      showCategories: { type: 'boolean', default: true, description: 'Groups skills under a heading for each category, and each group folds shut when its heading is clicked. Only happens when there\'s more than one category.' },
      sortBy: { type: 'enum', values: ['proficiency', 'category', 'name', 'custom'], default: 'proficiency', description: 'The order of the skills: highest level first, grouped by category, alphabetical by name, or custom, which follows each Skill\'s priority.' },
      maxDisplay: { type: 'number', min: 1, max: 50, description: 'Shows only this many skills, counted after sorting.' },
      size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md', componentProp: 'chartSize', description: 'The text size and how thick the bars are.' }
    }
  });

  registry.register({
    name: 'Skill',
    component: Skill,
    group: 'decorative',
    description: 'One entry in a SkillChart. It only works inside a SkillChart; on its own it shows as plain text.',
    example: '<SkillChart display="tags">\n  <Skill name="Birdwatching" level="60" category="Outdoors" color="#4f772d" description="mostly crows, honestly" />\n</SkillChart>',
    props: {
      name: { type: 'string', required: true, description: 'What the skill is called.' },
      level: { type: 'number', required: true, min: 0, description: 'How far along you are, counted out of max.' },
      category: { type: 'string', description: 'A group name. Skills in the same category are listed together and share a color. Left out, the skill goes under Other.' },
      color: { type: 'string', description: 'The skill\'s color. Use a six-digit hex code like #c97b63: other color formats lose the tinted fill in bubbles and tags. In bars, only the professional and minimal themes show it.' },
      icon: { type: 'string', description: 'A short symbol or character shown next to the name. In rings it takes the place of the percent in the middle.' },
      description: { type: 'string', description: 'Text in a tooltip when someone hovers over the skill.' },
      yearsExperience: { type: 'number', min: 0, max: 50, description: 'Adds a line with the number of years to the hover tooltip. Only shows when description is set.' },
      priority: { type: 'number', min: 1, max: 10, default: 5, description: 'The order used when the chart\'s sortBy is custom. Higher numbers come first.' },
      max: { type: 'number', min: 1, default: 100, description: 'What counts as full. 100 unless you change it.' }
    }
  });

  // Retro Components
  registry.register({
    name: 'CRTMonitor',
    component: CRTMonitor,
    group: 'decorative',
    description: 'An old computer monitor: a 400 by 300 pixel black screen with glowing text, scanlines and a blinking cursor, in a dark plastic case. Anything you put between the tags sits on top of the screen but keeps your page\'s own text color, so set its color yourself.',
    example: '<CRTMonitor screenColor="amber" intensity="high">\n  <p style="color: #ffb000; font-family: monospace; padding: 20px;">&gt; now reading: Piranesi<br>&gt; tea: genmaicha</p>\n</CRTMonitor>',
    props: {
      content: { type: 'string', default: 'System initialized...\n> Ready for input', description: 'Text shown on the screen when there\'s nothing between the tags. Line breaks are kept.' },
      screenColor: { type: 'enum', values: ['green', 'amber', 'blue', 'white'], default: 'green', description: 'The color of the screen text, cursor and glow.' },
      intensity: { type: 'enum', values: ['low', 'medium', 'high'], default: 'medium', description: 'How bright the screen text is and how strong its glow.' },
      scanlines: { type: 'boolean', default: true, description: 'Draws thin dark horizontal lines over the screen.' },
      phosphorGlow: { type: 'boolean', default: true, description: 'Adds a soft glow around the screen text and in the middle of the screen.' },
      curvature: { type: 'boolean', default: true, description: 'Rounds the screen corners more and darkens its edges, like curved glass.' },
      fontSize: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium', componentProp: 'textSize', description: 'The size of the content text.' },
      fontFamily: { type: 'enum', values: ['monospace', 'terminal'], default: 'monospace', componentProp: 'textFont', description: 'The font of the content text: monospace uses the browser\'s monospace font, terminal uses Courier New.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Terminal Content'
    }
  });

  registry.register({
    name: 'NeonSign',
    component: NeonSign,
    group: 'decorative',
    description: 'Glowing neon-tube lettering with a faint reflection underneath. Use the text attribute, or put words between the tags.',
    example: '<NeonSign text="kettle\'s on" color="cyan" intensity="dim" animation="flicker" />',
    props: {
      text: { type: 'string', default: 'NEON SIGN', description: 'The words on the sign. Words between the tags replace it.' },
      color: { type: 'enum', values: ['blue', 'pink', 'green', 'purple', 'cyan', 'yellow', 'red', 'white'], default: 'blue', componentProp: 'neonColor', description: 'The color of the tube and its glow.' },
      intensity: { type: 'enum', values: ['dim', 'bright', 'blazing'], default: 'bright', description: 'How bright the glow is and how far it spreads.' },
      animation: { type: 'enum', values: ['steady', 'flicker', 'pulse', 'buzz'], default: 'steady', description: 'steady stays lit, flicker dips every few seconds like a tired tube, pulse slowly brightens and dims, buzz trembles very fast.' },
      fontSize: { type: 'enum', values: ['small', 'medium', 'large', 'xl'], default: 'medium', componentProp: 'textSize', description: 'How big the letters are.' },
      fontWeight: { type: 'enum', values: ['normal', 'bold', 'black'], default: 'bold', componentProp: 'textWeight', description: 'How thick the letters are.' },
      uppercase: { type: 'boolean', default: true, description: 'Shows the words in capitals.' },
      outline: { type: 'boolean', default: true, description: 'Adds a thin dark edge around the letters.' },
      background: { type: 'boolean', default: false, description: 'Puts a soft colored glow behind the sign and adds room around it.' }
    },
    relationship: {
      type: 'text',
      acceptsChildren: true,
      childrenLabel: 'Neon Text'
    }
  });

  registry.register({
    name: 'ArcadeButton',
    component: ArcadeButton,
    group: 'decorative',
    description: 'A chunky arcade cabinet button that dips when pressed. With href, clicking it opens that link in a new tab; without it, the button only presses.',
    example: '<ArcadeButton text="links" color="green" shape="rectangle" href="https://example.neocities.org/links.html" />',
    props: {
      text: { type: 'string', default: 'START', description: 'The label, always in capitals. Words between the tags replace it.' },
      color: { type: 'enum', values: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'white', 'black'], default: 'red', componentProp: 'buttonColor', description: 'The button\'s color. White and yellow get black text, the others white.' },
      size: { type: 'enum', values: ['small', 'medium', 'large', 'xl'], default: 'medium', description: 'How big the button is: small is 60 pixels across, xl is 180.' },
      shape: { type: 'enum', values: ['circle', 'square', 'rectangle'], default: 'circle', description: 'circle is round, square has slightly rounded corners, rectangle is wide and short.' },
      style3D: { type: 'boolean', default: true, description: 'Shades the button so it looks domed and raised. Off makes it flat.' },
      glowing: { type: 'boolean', default: false, description: 'Adds a glow around the button in its own color.' },
      clickEffect: { type: 'boolean', default: true, description: 'Makes the button sink and darken while it\'s pressed.' },
      sound: { type: 'boolean', default: false, description: 'Plays a short beep when it\'s clicked.' },
      href: { type: 'string', description: 'A link to open in a new tab when someone clicks the button.' }
    },
    relationship: {
      type: 'leaf',
      acceptsChildren: true,
      childrenLabel: 'Button Text'
    }
  });

  registry.register({
    name: 'PixelArtFrame',
    component: PixelArtFrame,
    group: 'decorative',
    description: 'A chunky frame around what\'s inside, for pixel art and small pictures. Images inside are drawn with crisp pixels instead of being blurred when scaled up.',
    example: '<PixelArtFrame frameColor="gold" cornerStyle="beveled">\n  <img src="https://example.neocities.org/cat-sprite.png" alt="my cat as a tiny sprite" width="128">\n</PixelArtFrame>',
    props: {
      content: { type: 'string', default: '', description: 'Text shown in the frame when there\'s nothing between the tags.' },
      frameColor: { type: 'enum', values: ['classic', 'gold', 'silver', 'copper', 'neon', 'rainbow'], default: 'classic', description: 'The frame\'s color. classic is wood brown, gold, silver and copper are metal tones, neon is cyan, rainbow is pink unless animated is on.' },
      frameWidth: { type: 'enum', values: ['thin', 'medium', 'thick', 'ultra'], default: 'medium', description: 'How thick the frame is, from 4 pixels to 16.' },
      borderStyle: { type: 'enum', values: ['solid', 'dashed', 'dotted', 'double'], default: 'solid', description: 'The line style of the frame. Only works with square or ornate corners.' },
      cornerStyle: { type: 'enum', values: ['square', 'beveled', 'rounded', 'ornate'], default: 'square', description: 'square is plain, beveled lights the top and left edges and shades the others, rounded rounds the corners, ornate adds a second outline and small squares at the corners.' },
      shadowEffect: { type: 'boolean', default: true, description: 'Adds a hard shadow down and to the right, like an old game window.' },
      glowEffect: { type: 'boolean', default: false, description: 'Adds a soft glow in the frame\'s color.' },
      animated: { type: 'boolean', default: false, description: 'Cycles the frame through rainbow colors. Only works with frameColor rainbow.' },
      innerPadding: { type: 'enum', values: ['none', 'small', 'medium', 'large'], default: 'medium', description: 'Space between the frame and what\'s inside.' },
      backgroundColor: { type: 'string', default: 'transparent', componentProp: 'fillColor', description: 'Any CSS color to fill the space behind the content. Left transparent, it gets a faint dark tint.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Frame Content'
    }
  });

  registry.register({
    name: 'RetroGrid',
    component: RetroGrid,
    group: 'decorative',
    description: 'A 300 pixel tall panel with a glowing grid stretching back to a horizon, like an 80s album cover. Text or HTML inside is centered on top in the grid\'s color.',
    example: '<RetroGrid gridStyle="vaporwave" horizon="low">\n  <h2>you found my corner of the web</h2>\n</RetroGrid>',
    props: {
      gridStyle: { type: 'enum', values: ['synthwave', 'outrun', 'cyberpunk', 'vaporwave', 'matrix', 'tron'], default: 'synthwave', description: 'The color scheme: the sky gradient, the grid lines and their glow.' },
      perspective: { type: 'enum', values: ['none', 'shallow', 'deep', 'extreme'], default: 'deep', description: 'How steeply the grid tilts into the distance. none lays it flat, extreme tilts it the most.' },
      animation: { type: 'enum', values: ['none', 'pulse', 'scroll', 'wave', 'glitch'], default: 'none', description: 'pulse fades the grid in and out. scroll, wave and glitch move the grid, but for now they also push it off center.' },
      opacity: { type: 'enum', values: ['subtle', 'medium', 'strong', 'intense'], default: 'medium', componentProp: 'gridOpacity', description: 'How strongly the grid lines show.' },
      size: { type: 'enum', values: ['small', 'medium', 'large', 'xlarge'], default: 'medium', componentProp: 'gridSize', description: 'The spacing between grid lines.' },
      horizon: { type: 'enum', values: ['high', 'middle', 'low', 'hidden'], default: 'middle', description: 'How far down the horizon line sits. hidden pushes the grid out of view and leaves only the sky.' },
      scanlines: { type: 'boolean', default: false, description: 'Draws thin dark horizontal lines over the whole panel.' },
      glow: { type: 'boolean', default: true, description: 'Adds a glow to the grid lines.' },
      content: { type: 'string', default: '', description: 'Text shown in the middle when there\'s nothing between the tags.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Grid Overlay Content'
    }
  });

  registry.register({
    name: 'VHSTape',
    component: VHSTape,
    group: 'decorative',
    description: 'A picture of a VHS cassette with a label showing a title, genre, year and running time. It\'s only a picture and doesn\'t play anything.',
    example: '<VHSTape title="beach trip 94" year="1994" genre="Documentary" duration="60 min" labelStyle="homemade" wear="worn" />',
    props: {
      title: { type: 'string', default: 'HOME VIDEO', description: 'The name on the label, in capitals and on one line. Words between the tags replace it.' },
      year: { type: 'string', default: '1985', description: 'The year printed on the label.' },
      genre: { type: 'enum', values: ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Documentary'], default: 'Action', description: 'The genre printed on the label. It only changes that word.' },
      duration: { type: 'string', default: '120 min', description: 'The running time printed on the label, exactly as you write it.' },
      tapeColor: { type: 'enum', values: ['black', 'white', 'clear', 'blue', 'red'], default: 'black', description: 'The color of the plastic shell.' },
      labelStyle: { type: 'enum', values: ['classic', 'rental', 'homemade', 'premium'], default: 'classic', description: 'The label\'s paper and type: classic is plain off-white, rental is yellow with heavy type, homemade is white with typewriter text, premium is black with serif text.' },
      wear: { type: 'enum', values: ['mint', 'good', 'worn', 'damaged'], default: 'good', description: 'How used the tape looks. Going from mint to damaged, it fades more and gets faint scratches.' },
      showBarcode: { type: 'boolean', default: true, description: 'Prints a small barcode in the corner of the label.' }
    },
    relationship: {
      type: 'text',
      acceptsChildren: true,
      childrenLabel: 'VHS Title'
    }
  });

  registry.register({
    name: 'CassetteTape',
    component: CassetteTape,
    group: 'decorative',
    description: 'A picture of an audio cassette with a label for the title, artist, side, length and year. It\'s only a picture and doesn\'t play anything.',
    example: '<CassetteTape title="rainy day mix" artist="made by me" side="B" duration="60 min" labelStyle="handwritten" />',
    props: {
      title: { type: 'string', default: 'MIX TAPE', description: 'The name on the label, in capitals. Long titles are cut short. Words between the tags replace it.' },
      artist: { type: 'string', default: 'Various Artists', description: 'The line under the title, usually who\'s on the tape.' },
      album: { type: 'string', default: '', description: 'An extra line under the artist. Left out, the line isn\'t shown.' },
      year: { type: 'string', default: '1985', description: 'The year printed on the label.' },
      side: { type: 'enum', values: ['A', 'B'], default: 'A', description: 'Which side the label says, A or B.' },
      duration: { type: 'string', default: '45 min', description: 'The length printed on the label, exactly as you write it.' },
      tapeColor: { type: 'enum', values: ['black', 'white', 'clear', 'chrome', 'metal'], default: 'black', description: 'The color of the plastic shell.' },
      labelStyle: { type: 'enum', values: ['classic', 'handwritten', 'typed', 'minimal'], default: 'classic', description: 'The label\'s paper and type: classic is plain off-white, handwritten is cream paper with typewriter text, typed is white with typewriter text, minimal is a dark label with light text.' },
      wear: { type: 'enum', values: ['mint', 'good', 'worn', 'damaged'], default: 'good', description: 'How used the tape looks. Going from mint to damaged, it fades more and gets faint scratches.' },
      showSpokesToRotate: { type: 'boolean', default: true, description: 'Slowly spins the two reels.' }
    },
    relationship: {
      type: 'text',
      acceptsChildren: true,
      childrenLabel: 'Cassette Title'
    }
  });

  registry.register({
    name: 'RetroTV',
    component: RetroTV,
    group: 'decorative',
    description: 'An old television set, 400 by 320 pixels, showing whatever you put inside on its screen in the screen color. With nothing inside, the screen says RETRO TV. The knobs are only drawings.',
    example: '<RetroTV tvStyle="vintage" screenColor="amber" channelNumber="7">\n  <p>now showing: the garden, live</p>\n</RetroTV>',
    props: {
      screenColor: { type: 'enum', values: ['green', 'amber', 'white', 'blue', 'red'], default: 'green', description: 'The color of the screen\'s text and glow, and the dark tint behind them.' },
      tvStyle: { type: 'enum', values: ['crt', 'vintage', 'portable', 'console'], default: 'crt', description: 'The kind of set: crt is dark gray with knobs, vintage is wood brown with knobs and antennas, portable has a thin bezel and antennas but no knobs, console is black with a wide bezel and knobs.' },
      channelNumber: { type: 'string', default: '3', description: 'The number in the small CH badge at the bottom left.' },
      showStatic: { type: 'boolean', default: false, description: 'Adds flickering speckled noise to the screen.' },
      showScanlines: { type: 'boolean', default: true, description: 'Draws thin dark lines across the screen.' },
      curvature: { type: 'enum', values: ['none', 'slight', 'medium', 'heavy'], default: 'medium', description: 'How rounded the screen corners are.' },
      brightness: { type: 'number', default: 100, description: 'Screen brightness as a percent. 100 is normal.' },
      contrast: { type: 'number', default: 100, description: 'Screen contrast as a percent. 100 is normal.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'TV Screen Content'
    }
  });

  registry.register({
    name: 'Boombox',
    component: Boombox,
    group: 'decorative',
    description: 'A picture of an 80s boombox with two speakers, a tape deck, a track display, a radio strip, an equalizer and a row of buttons. It doesn\'t play any sound and the buttons do nothing. Anything between the tags is laid over its middle and can\'t be clicked.',
    example: '<Boombox color="silver" currentTrack="Linger" isPlaying="true" volume="60" />',
    props: {
      boomboxStyle: { type: 'enum', values: ['classic', 'modern', 'portable', 'monster'], default: 'classic', description: 'The size and shape: classic is 500 pixels wide with a handle, modern is a little smaller with no handle, portable is the smallest, monster is the biggest.' },
      color: { type: 'enum', values: ['black', 'silver', 'red', 'blue', 'white'], default: 'black', componentProp: 'boomboxColor', description: 'The body color. Each one comes with its own color for the display text.' },
      showEqualizer: { type: 'boolean', default: true, description: 'Shows a row of ten level bars.' },
      showCassetteDeck: { type: 'boolean', default: true, description: 'Shows the tape deck window with its two reels.' },
      showRadio: { type: 'boolean', default: true, description: 'Shows a strip that reads FM 102.5 MHz STEREO. The text can\'t be changed.' },
      isPlaying: { type: 'boolean', default: false, description: 'Makes it look like it\'s playing: the reels spin, the equalizer bars bounce, the little light blinks and the play button shows pause. There\'s still no sound.' },
      currentTrack: { type: 'string', default: 'Track 01', description: 'The words on the track display, such as a song name.' },
      volume: { type: 'number', default: 75, description: 'Lights up to five VOL bars, one for every 20 (75 lights three). 0 is treated as 75.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Boombox Content'
    }
  });

  registry.register({
    name: 'MatrixRain',
    component: MatrixRain,
    group: 'decorative',
    description: 'A 400 pixel tall black panel with characters raining down in columns, like the film. Anything between the tags is shown centered in a dim box on top and can\'t be clicked. A small label in the bottom corner always names the current settings.',
    example: '<MatrixRain color="green" speed="slow" characters="binary">\n  <p>wake up, neighbor</p>\n</MatrixRain>',
    props: {
      color: { type: 'enum', values: ['green', 'blue', 'red', 'purple', 'cyan', 'white'], default: 'green', componentProp: 'matrixColor', description: 'The color of the falling characters.' },
      speed: { type: 'enum', values: ['slow', 'medium', 'fast', 'ultra'], default: 'medium', description: 'How quickly the rain falls.' },
      density: { type: 'enum', values: ['low', 'medium', 'high', 'extreme'], default: 'medium', description: 'low only fills the left half of the panel. medium fills all of it. high and extreme currently look the same as medium.' },
      characters: { type: 'enum', values: ['katakana', 'binary', 'hex', 'ascii', 'custom'], default: 'katakana', description: 'Which characters fall: Japanese katakana, ones and zeros, hex digits, letters with numbers and symbols, or your own set from customCharacters.' },
      customCharacters: { type: 'string', default: '', description: 'The characters to use when characters is custom. Left empty, it picks from the letters of MATRIX.' },
      fadeEffect: { type: 'boolean', default: true, description: 'Leaves fading trails behind each falling character. Off, only single characters show.' },
      glowEffect: { type: 'boolean', default: true, description: 'Adds a soft glow around each character.' },
      backgroundOpacity: { type: 'number', default: 95, description: 'How quickly the trails fade, from 0 to 100. Lower numbers leave longer trails. Only used when fadeEffect is on.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Matrix Content'
    }
  });

  // Navigation
  registry.register({
    name: 'ThreadsteadNavigation',
    component: NavigationPreview,
    group: 'site',
    description: 'The site\'s top bar. Every page here already gets the site\'s own bar (the editor can hide it), so this tag is taken out when you save.',
    example: '<ThreadsteadNavigation />',
    props: {
      backgroundColor: { type: 'string', default: 'rgba(0, 0, 0, 0.1)', componentProp: 'navBackgroundColor', description: 'A CSS colour for the bar. Defaults to a faint dark tint.' },
      textColor: { type: 'string', default: 'inherit', componentProp: 'navTextColor', description: 'Colour of the links and site name. Defaults to inherit, which leaves the site name dark green.' },
      opacity: { type: 'number', min: 0, max: 1, default: 1, componentProp: 'navOpacity', description: 'Opacity of the whole bar, 0 to 1. Defaults to 1.' },
      blur: { type: 'number', min: 0, max: 20, default: 10, componentProp: 'navBlur', description: 'Blurs the page behind the bar, in pixels, 0 to 20. Defaults to 10.' },
      borderColor: { type: 'string', default: 'rgba(255, 255, 255, 0.2)', componentProp: 'navBorderColor', description: 'Colour of the line under the bar.' },
      borderWidth: { type: 'number', min: 0, max: 10, default: 1, componentProp: 'navBorderWidth', description: 'Thickness of that line in pixels, 0 to 10. Defaults to 1.' },
      dropdownBackgroundColor: { type: 'string', default: 'white', description: 'Background of the open menus. Defaults to white.' },
      dropdownTextColor: { type: 'string', default: '#374151', description: 'Text colour in the open menus.' },
      dropdownBorderColor: { type: 'string', default: '#e5e7eb', description: 'Border colour of the open menus.' },
      dropdownHoverColor: { type: 'string', default: '#f3f4f6', description: 'Background of a menu item under the pointer.' }
    },
    relationship: {
      type: 'leaf'
    }
  });
}
