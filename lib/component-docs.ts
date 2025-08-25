// Helper functions for generating component documentation
import { componentRegistry, type PropSchema } from './template-registry';

export interface PropDocumentation {
  name: string;
  type: string;
  required: boolean;
  default?: any;
  description: string;
  values?: string[];
  constraints?: string;
}

export interface ComponentDocumentation {
  name: string;
  description: string;
  props: PropDocumentation[];
  example: string;
  category: string;
}

// Generate user-friendly prop documentation
export function generatePropDocs(propName: string, schema: PropSchema): PropDocumentation {
  const docs: PropDocumentation = {
    name: propName,
    type: schema.type,
    required: schema.required || false,
    default: schema.default,
    description: '',
    values: schema.values ? [...schema.values] : undefined,
    constraints: undefined
  };

  // Add type-specific descriptions and constraints
  switch (schema.type) {
    case 'enum':
      docs.description = `Choose from: ${schema.values?.join(', ') || 'predefined options'}`;
      break;
    case 'string':
      docs.description = 'Text value';
      if (schema.required) {
        docs.description += ' (required)';
      }
      break;
    case 'number':
      docs.description = 'Numeric value';
      if (schema.min !== undefined || schema.max !== undefined) {
        docs.constraints = `Range: ${schema.min ?? '∞'} to ${schema.max ?? '∞'}`;
      }
      break;
    case 'boolean':
      docs.description = 'True or false value';
      break;
  }

  // Add specific prop descriptions
  const propDescriptions: Record<string, string> = {
    // Layout props
    direction: 'Sets the flex direction for container layout',
    align: 'Aligns items along the cross axis',
    justify: 'Distributes items along the main axis',
    wrap: 'Whether items should wrap to new lines',
    gap: 'Spacing between items',
    columns: 'Number of grid columns',
    responsive: 'Whether grid should be responsive on mobile',
    ratio: 'Size ratio between split sections (e.g., "2:1")',
    vertical: 'Whether split should be vertical instead of horizontal',
    maxWidth: 'Maximum width of the centered content',
    padding: 'Internal spacing around content',
    
    // Visual props
    gradient: 'Gradient style to apply',
    rounded: 'Whether corners should be rounded',
    color: 'Color theme or specific color value',
    intensity: 'Strength of the effect',
    variant: 'Style variant to use',
    showHeader: 'Whether to show a header bar',
    caption: 'Text caption to display',
    rotation: 'Rotation angle in degrees',
    shadow: 'Whether to show drop shadow',
    size: 'Size of the component',
    animation: 'Animation type to apply',
    position: 'Position relative to parent',
    
    // Interactive props
    buttonText: 'Text to show on the button',
    revealText: 'Text to show when content is revealed',
    buttonStyle: 'Style of the reveal button',
    
    // Text props
    text: 'Text content to display',
    speed: 'Animation speed',
    amplitude: 'Animation strength/size',
    glitchColor1: 'First glitch effect color',
    glitchColor2: 'Second glitch effect color',
    
    // Component-specific
    limit: 'Maximum number of items to display',
    title: 'Title text for the tab',
    message: 'Message text to display',
    
    // Conditional props
    when: 'Condition expression to evaluate',
    data: 'Data path to check (e.g., "posts", "owner.handle")',
    equals: 'Value to compare against',
    exists: 'Whether to check for existence only',
    condition: 'Condition expression for When components',
    
    // Image props
    src: 'Direct URL to the image source',
    alt: 'Alternative text for accessibility',
    width: 'Custom width (e.g., "200px", "50%")',
    height: 'Custom height (e.g., "200px", "50%")',
    fit: 'How image should fit within container',
    fallback: 'Fallback image URL if main image fails to load'
  };

  if (propDescriptions[propName]) {
    docs.description = propDescriptions[propName];
  }

  return docs;
}

// Generate documentation for all components
export function generateAllComponentDocs(): ComponentDocumentation[] {
  const docs: ComponentDocumentation[] = [];
  
  // Get all registered components
  const allowedTags = componentRegistry.getAllowedTags();
  
  for (const tagName of allowedTags) {
    const registration = componentRegistry.get(tagName);
    if (!registration) continue;
    
    const propDocs = Object.entries(registration.props).map(([propName, schema]) =>
      generatePropDocs(propName, schema)
    );
    
    // Categorize components
    let category = 'other';
    if (['FlexContainer', 'GridLayout', 'SplitLayout', 'CenteredBox'].includes(tagName)) {
      category = 'layout';
    } else if (['GradientBox', 'NeonBorder', 'RetroTerminal', 'PolaroidFrame', 'StickyNote', 'Image'].includes(tagName)) {
      category = 'visual';
    } else if (['RevealBox', 'FloatingBadge', 'WaveText', 'GlitchText'].includes(tagName)) {
      category = 'interactive';
    } else if (['FollowButton', 'MutualFriends', 'FriendDisplay', 'WebsiteDisplay', 'FriendBadge', 'ProfilePhoto', 'DisplayName', 'Bio', 'BlogPosts', 'Guestbook'].includes(tagName)) {
      category = 'social';
    } else if (['SiteBranding', 'NavigationLinks', 'Breadcrumb', 'NotificationCenter', 'NotificationBell', 'UserAccount'].includes(tagName)) {
      category = 'navigation';
    } else if (['Show', 'Choose', 'When', 'Otherwise', 'IfOwner', 'IfVisitor'].includes(tagName)) {
      category = 'conditional';
    }
    
    docs.push({
      name: tagName,
      description: getComponentDescription(tagName),
      props: propDocs,
      example: generateComponentExample(tagName, registration.props),
      category
    });
  }
  
  return docs;
}

function getComponentDescription(tagName: string): string {
  const descriptions: Record<string, string> = {
    ProfilePhoto: 'Display user profile photo with size and shape options',
    Image: 'Display user images or external images with customizable styling',
    DisplayName: 'Show the user\'s display name',
    Bio: 'Display user biography text',
    BlogPosts: 'List of user blog posts with pagination',
    Guestbook: 'Interactive guestbook for visitor messages',
    FollowButton: 'Button to follow/unfollow the profile owner',
    MutualFriends: 'Display mutual friends between viewer and owner',
    FriendBadge: 'Simple friend status indicator',
    FriendDisplay: 'Grid of featured friends',
    WebsiteDisplay: 'List of user\'s recommended websites',
    NotificationCenter: 'Full notification dropdown interface',
    NotificationBell: 'Simple notification bell with count',
    UserAccount: 'Login and user account controls',
    SiteBranding: 'Site name and tagline display',
    NavigationLinks: 'Main site navigation menu',
    Breadcrumb: 'Auto-generated breadcrumb navigation',
    FlexContainer: 'Flexible box layouts with customizable direction and alignment',
    GridLayout: 'Responsive CSS grids with configurable columns',
    SplitLayout: 'Two-panel layouts with adjustable ratios',
    CenteredBox: 'Center content with optional max-width constraints',
    GradientBox: 'Beautiful gradient backgrounds in various styles',
    NeonBorder: 'Glowing animated neon borders',
    RetroTerminal: 'Old-school computer terminal styling',
    PolaroidFrame: 'Photo-style frames with captions and rotation',
    StickyNote: 'Post-it note styling in various colors',
    RevealBox: 'Click-to-reveal content with animations',
    FloatingBadge: 'Animated floating badges and indicators',
    WaveText: 'Animated wavy text effect',
    GlitchText: 'Retro glitch text effects',
    Tabs: 'Tabbed content container',
    Tab: 'Individual tab within Tabs component',
    ProfileHero: 'Hero section for user profiles',
    RetroCard: 'Retro-styled card container',
    Show: 'Conditionally display content based on data',
    Choose: 'Multi-condition container for When/Otherwise',
    When: 'Conditional branch within Choose component',
    Otherwise: 'Default fallback within Choose component',
    IfOwner: 'Show content only to the profile owner',
    IfVisitor: 'Show content only to visitors (not owner)'
  };
  
  return descriptions[tagName] || 'Template component';
}

function generateComponentExample(tagName: string, props: Record<string, PropSchema>): string {
  const hasProps = Object.keys(props).length > 0;
  
  if (!hasProps) {
    return `<${tagName} />`;
  }
  
  // Generate example with some common prop values
  const exampleProps: string[] = [];
  
  for (const [propName, schema] of Object.entries(props)) {
    if (schema.required) {
      if (schema.type === 'string' && schema.values) {
        exampleProps.push(`${propName}="${schema.values[0]}"`);
      } else if (schema.type === 'string') {
        exampleProps.push(`${propName}="example text"`);
      } else {
        exampleProps.push(`${propName}="${schema.default || 'value'}"`);
      }
    }
  }
  
  // Add one non-required prop as example
  for (const [propName, schema] of Object.entries(props)) {
    if (!schema.required && exampleProps.length < 3) {
      if (schema.values && schema.values.length > 1) {
        exampleProps.push(`${propName}="${schema.values[1] || schema.values[0]}"`);
      } else if (schema.default !== undefined) {
        exampleProps.push(`${propName}="${schema.default}"`);
      }
      break;
    }
  }
  
  if (exampleProps.length === 0) {
    return `<${tagName} />`;
  }
  
  return `<${tagName} ${exampleProps.join(' ')} />`;
}

// Data structure documentation for conditional components
export interface DataField {
  path: string;
  type: string;
  description: string;
  example?: string;
}

export function getAvailableDataFields(): DataField[] {
  return [
    {
      path: 'owner.id',
      type: 'string',
      description: 'Unique ID of the profile owner',
      example: 'owner.id'
    },
    {
      path: 'owner.handle',
      type: 'string',
      description: 'Handle/username of the profile owner',
      example: 'owner.handle'
    },
    {
      path: 'owner.displayName',
      type: 'string',
      description: 'Display name of the profile owner',
      example: 'owner.displayName'
    },
    {
      path: 'owner.avatarUrl',
      type: 'string | undefined',
      description: 'URL to the profile owner\'s avatar image',
      example: 'owner.avatarUrl'
    },
    {
      path: 'viewer.id',
      type: 'string | null',
      description: 'ID of the current viewer (null if not logged in)',
      example: 'viewer.id'
    },
    {
      path: 'posts',
      type: 'array',
      description: 'Array of user blog posts',
      example: 'posts'
    },
    {
      path: 'posts.length',
      type: 'number',
      description: 'Number of posts the user has',
      example: 'posts.length'
    },
    {
      path: 'guestbook',
      type: 'array',
      description: 'Array of guestbook messages',
      example: 'guestbook'
    },
    {
      path: 'guestbook.length',
      type: 'number',
      description: 'Number of guestbook entries',
      example: 'guestbook.length'
    },
    {
      path: 'capabilities.bio',
      type: 'string | undefined',
      description: 'User\'s biography text',
      example: 'capabilities.bio'
    },
    {
      path: 'featuredFriends',
      type: 'array | undefined',
      description: 'Array of featured friends',
      example: 'featuredFriends'
    },
    {
      path: 'featuredFriends.length',
      type: 'number',
      description: 'Number of featured friends',
      example: 'featuredFriends.length'
    },
    {
      path: 'websites',
      type: 'array | undefined',
      description: 'Array of user\'s websites',
      example: 'websites'
    },
    {
      path: 'websites.length',
      type: 'number',
      description: 'Number of websites',
      example: 'websites.length'
    },
    {
      path: 'images',
      type: 'array | undefined',
      description: 'Array of user uploaded images',
      example: 'images'
    },
    {
      path: 'images.length',
      type: 'number',
      description: 'Number of uploaded images',
      example: 'images.length'
    },
    {
      path: 'profileImages',
      type: 'array | undefined',
      description: 'Array of profile-specific images (avatar, banner, gallery)',
      example: 'profileImages'
    },
    {
      path: 'profileImages.length',
      type: 'number',
      description: 'Number of profile images',
      example: 'profileImages.length'
    }
  ];
}