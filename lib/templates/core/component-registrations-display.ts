// Display and Layout Component Registrations
import { ComponentRegistry } from './template-registry-class';
import { mergeWithUniversalProps } from '@/lib/templates/core/universal-styling';
import { headingProp } from '@/components/features/templates/component-heading';

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
import FlexContainer from '@/components/features/templates/FlexContainer';
import GridLayout from '@/components/features/templates/GridLayout';
import CenteredBox from '@/components/features/templates/CenteredBox';
import PolaroidFrame from '@/components/features/templates/PolaroidFrame';
import StickyNote from '@/components/features/templates/StickyNote';
import RevealBox from '@/components/features/templates/RevealBox';
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
import ImageCarousel, { CarouselImage } from '@/components/features/templates/ImageCarousel';
import Embed from '@/components/features/templates/Embed';
import ArcadeButton from '@/components/features/templates/ArcadeButton';
import Heading from '@/components/features/templates/Heading';

/**
 * Register all display and layout components
 */
export function registerDisplayComponents(registry: ComponentRegistry) {
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
    props: mergeWithUniversalProps({ heading: headingProp('About Me') }, 'text')
  });

  registry.register({
    name: 'BlogPosts',
    component: BlogPosts,
    group: 'connected',
    featured: 3,
    description: 'Your latest posts, newest first, with their comments. Or just how many you\'ve written, with mode="count".',
    example: '<h2>Lately</h2>\n<BlogPosts limit="3" heading="none" />',
    props: {
      heading: headingProp('Recent Posts'),
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
    example: '<h2>Sign my guestbook</h2>\n<Guestbook heading="none" />',
    props: {
      heading: headingProp('Guestbook')
    }
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
    props: {
      heading: headingProp('Friends')
    }
  });

  registry.register({
    name: 'WebsiteDisplay',
    component: WebsiteDisplay,
    group: 'connected',
    description: 'Your website recommendations, with their descriptions. You add them in Settings, under Profile.',
    example: '<WebsiteDisplay />',
    props: {
      heading: headingProp('Website Recommendations')
    }
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

  // Tabs
  registry.register({
    name: 'Tabs',
    component: Tabs,
    group: 'layout',
    description: 'A row of tab buttons with one panel underneath. Each Tab inside becomes a button; the first is open when the page loads, and clicking another swaps the panel.',
    example: '<Tabs>\n  <Tab title="About"><p>I keep bees and write about it.</p></Tab>\n  <Tab title="Reading list"><ul><li>Piranesi</li><li>A Wizard of Earthsea</li></ul></Tab>\n</Tabs>',
    props: {
      label: { type: 'string', default: 'Sections', description: 'What screen readers call the row of tabs, like "My pages". Defaults to Sections.' }
    },
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
    description: 'Your featured photos, the six newest, in a grid. A photo\'s caption shows when you point at it. With none featured, visitors see nothing and you see a reminder.',
    example: '<MediaGrid />',
    props: {
      heading: headingProp('Featured Photos')
    }
  });

  registry.register({
    name: 'ProfileBadges',
    component: ProfileBadges,
    group: 'connected',
    description: 'The 88×31 badges of the rings you\'re in, linking to each ring. With none, visitors see nothing and you see a reminder.',
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
      src: { type: 'url', description: 'Web address of the image.' },
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
      src: { type: 'url', required: true, description: 'Web address of the image. Required.' },
      alt: { type: 'string', description: 'Text describing the image.' },
      caption: { type: 'string', description: 'Text laid over the bottom of the image.' },
      link: { type: 'url', description: 'Web address that opens in a new tab when the image is clicked.' }
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
      href: { type: 'url', description: 'A link to open in a new tab when someone clicks the button.' }
    },
    relationship: {
      type: 'leaf',
      acceptsChildren: true,
      childrenLabel: 'Button Text'
    }
  });
}
