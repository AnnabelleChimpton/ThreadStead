// Template Component Data
// Extracted from INTERACTIVE_COMPONENTS_REFERENCE.md

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: string;
  options?: string[];
}

export interface ComponentExample {
  title: string;
  code: string;
  description?: string;
}

export interface Component {
  id: string;
  name: string;
  category: string;
  description: string;
  props: ComponentProp[];
  examples: ComponentExample[];
  useCases: string[];
  tips?: string[];
  // Enhanced metadata for better discoverability
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  pairsWellWith?: string[]; // Component IDs that work well with this one
  accessibility?: string[]; // Accessibility tips and best practices
  performanceNotes?: string[]; // Performance considerations
  operators?: Array<{ // For conditional/logic components
    name: string;
    syntax: string;
    example: string;
    description: string;
  }>;
}

export interface ComponentCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  hoverColor: string;
}

export const componentCategories: ComponentCategory[] = [
  {
    id: 'state',
    title: 'Variables & Display',
    description: 'Declare and display template variables',
    icon: '💾',
    color: 'bg-purple-200',
    hoverColor: 'hover:bg-purple-100',
  },
  {
    id: 'inputs',
    title: 'User Input',
    description: 'Interactive form components',
    icon: '⌨️',
    color: 'bg-cyan-200',
    hoverColor: 'hover:bg-cyan-100',
  },
  {
    id: 'actions',
    title: 'Actions',
    description: 'Manipulate state, arrays, and UI',
    icon: '⚡',
    color: 'bg-yellow-200',
    hoverColor: 'hover:bg-yellow-100',
  },
  {
    id: 'collections',
    title: 'Collection Operations',
    description: 'Filter, sort, and transform arrays',
    icon: '📊',
    color: 'bg-blue-200',
    hoverColor: 'hover:bg-blue-100',
  },
  {
    id: 'objects',
    title: 'Object Operations',
    description: 'Work with nested objects and properties',
    icon: '🧩',
    color: 'bg-indigo-200',
    hoverColor: 'hover:bg-indigo-100',
  },
  {
    id: 'events',
    title: 'Event Handlers',
    description: 'Respond to user interactions',
    icon: '👆',
    color: 'bg-pink-200',
    hoverColor: 'hover:bg-pink-100',
  },
  {
    id: 'timing',
    title: 'Timing & Sequences',
    description: 'Delayed actions and animations',
    icon: '⏱️',
    color: 'bg-red-200',
    hoverColor: 'hover:bg-red-100',
  },
  {
    id: 'conditionals',
    title: 'Conditional Logic',
    description: 'Show/hide content based on conditions',
    icon: '🔀',
    color: 'bg-green-200',
    hoverColor: 'hover:bg-green-100',
  },
  {
    id: 'loops',
    title: 'Loops & Iteration',
    description: 'Repeat content with ForEach',
    icon: '🔁',
    color: 'bg-orange-200',
    hoverColor: 'hover:bg-orange-100',
  },
];

export const componentData: Record<string, Component[]> = {
  state: [
    {
      id: 'var',
      name: 'Var',
      category: 'state',
      description: 'Declare and initialize template variables for interactive state',
      props: [
        { name: 'name', type: 'string', required: true, description: 'Variable name' },
        { name: 'type', type: 'enum', required: true, description: 'Variable type', options: ['number', 'string', 'boolean', 'array', 'object', 'computed', 'random', 'urlParam'] },
        { name: 'initial', type: 'any', required: false, description: 'Initial value' },
        { name: 'persist', type: 'boolean', required: false, description: 'Save to localStorage' },
        { name: 'expression', type: 'string', required: false, description: 'For computed variables' },
        { name: 'param', type: 'string', required: false, description: 'URL parameter name (for urlParam type)' },
        { name: 'default', type: 'any', required: false, description: 'Default value for urlParam' },
        { name: 'coerce', type: 'enum', required: false, description: 'Type coercion for urlParam', options: ['number', 'boolean', 'array'] },
      ],
      examples: [
        {
          title: 'Simple counter',
          code: '<Var name="counter" type="number" initial="0" />',
        },
        {
          title: 'Persistent theme',
          code: '<Var name="theme" type="string" initial="dark" persist="true" />',
        },
        {
          title: 'Computed total',
          code: `<Var name="price" type="number" initial="10" />
<Var name="quantity" type="number" initial="2" />
<Var name="total" type="computed" expression="$vars.price * $vars.quantity" />`,
        },
      ],
      useCases: ['Counter states', 'Form data', 'UI toggles', 'Computed calculations', 'Persistent user preferences'],
      difficulty: 'beginner',
      pairsWellWith: ['showvar', 'set', 'button', 'tinput', 'slider'],
    },
    {
      id: 'showvar',
      name: 'ShowVar',
      category: 'state',
      description: 'Display variable values with optional formatting',
      props: [
        { name: 'name', type: 'string', required: true, description: 'Variable name to display' },
        { name: 'format', type: 'enum', required: false, description: 'Display format', options: ['currency', 'percent', 'date'] },
        { name: 'decimals', type: 'number', required: false, description: 'Decimal places for numbers' },
        { name: 'dateFormat', type: 'string', required: false, description: 'Date format string' },
      ],
      examples: [
        {
          title: 'Display a number',
          code: '<ShowVar name="counter" />',
        },
        {
          title: 'Currency formatting',
          code: '<ShowVar name="price" format="currency" />',
        },
        {
          title: 'Date formatting',
          code: '<ShowVar name="createdAt" format="date" dateFormat="MMM dd, yyyy" />',
        },
      ],
      useCases: ['Display variable values', 'Formatted currency', 'Date display', 'Percentage display'],
      difficulty: 'beginner',
      pairsWellWith: ['var', 'set', 'increment', 'decrement', 'toggle'],
    },
    {
      id: 'dynamicimage',
      name: 'DynamicImage',
      category: 'state',
      description: 'Display images with variable-bound src attribute',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Variable containing image URL' },
        { name: 'alt', type: 'string', required: true, description: 'Alt text for accessibility' },
        { name: 'width', type: 'number', required: false, description: 'Image width' },
        { name: 'height', type: 'number', required: false, description: 'Image height' },
      ],
      examples: [
        {
          title: 'User-selected avatar',
          code: `<Select var="avatar">
  <Option value="avatar1.png">Avatar 1</Option>
  <Option value="avatar2.png">Avatar 2</Option>
</Select>
<DynamicImage var="avatar" alt="Avatar" width="150" height="150" />`,
        },
      ],
      useCases: ['User avatars', 'Gallery images', 'Theme-dependent images', 'Dynamic backgrounds'],
    },
  ],

  inputs: [
    {
      id: 'tinput',
      name: 'TInput',
      category: 'inputs',
      description: 'Text or number input with multiline support',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Variable to bind to' },
        { name: 'type', type: 'enum', required: false, description: 'Input type', options: ['text', 'number', 'email', 'password', 'tel', 'url'], default: 'text' },
        { name: 'placeholder', type: 'string', required: false, description: 'Placeholder text' },
        { name: 'multiline', type: 'boolean', required: false, description: 'Render as textarea' },
        { name: 'rows', type: 'number', required: false, description: 'Rows for multiline', default: '3' },
      ],
      examples: [
        {
          title: 'Text input',
          code: '<TInput var="username" placeholder="Enter username" />',
        },
        {
          title: 'Multiline textarea',
          code: '<TInput var="bio" multiline="true" rows="5" placeholder="Tell us about yourself" />',
        },
      ],
      useCases: ['Form fields', 'Search boxes', 'Comments', 'Bio text'],
      difficulty: 'beginner',
      pairsWellWith: ['var', 'validate', 'if', 'onchange', 'button'],
      accessibility: [
        'Always pair with a visible <label> for screen readers',
        'Use appropriate type attribute for mobile keyboards (email, tel, url)',
        'Provide clear placeholder text as hints',
        'Use aria-label if no visible label is present'
      ],
    },
    {
      id: 'checkbox',
      name: 'Checkbox',
      category: 'inputs',
      description: 'Boolean checkbox input',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Boolean variable to bind to' },
        { name: 'label', type: 'string', required: false, description: 'Label text' },
      ],
      examples: [
        {
          title: 'Simple checkbox',
          code: '<Checkbox var="agree" label="I agree to the terms" />',
        },
      ],
      useCases: ['Agreements', 'Feature toggles', 'Task completion', 'Settings'],
      difficulty: 'beginner',
      pairsWellWith: ['var', 'if', 'toggle', 'showvar'],
      accessibility: [
        'Label prop provides accessible text for screen readers',
        'Keyboard accessible (Space to toggle)',
        'Consider using role="checkbox" for custom styled checkboxes'
      ],
    },
    {
      id: 'radiogroup',
      name: 'RadioGroup',
      category: 'inputs',
      description: 'Single-choice radio button group',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Variable to bind selected value' },
      ],
      examples: [
        {
          title: 'Theme selector',
          code: `<RadioGroup var="theme">
  <Radio value="light">Light</Radio>
  <Radio value="dark">Dark</Radio>
  <Radio value="auto">Auto</Radio>
</RadioGroup>`,
        },
      ],
      useCases: ['Single selection', 'Theme chooser', 'Option picker', 'Settings'],
    },
    {
      id: 'slider',
      name: 'Slider',
      category: 'inputs',
      description: 'Numeric range slider with visual feedback',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Numeric variable to bind' },
        { name: 'min', type: 'number', required: true, description: 'Minimum value' },
        { name: 'max', type: 'number', required: true, description: 'Maximum value' },
        { name: 'step', type: 'number', required: false, description: 'Step increment', default: '1' },
      ],
      examples: [
        {
          title: 'Volume slider',
          code: '<Slider var="volume" min="0" max="100" step="5" />',
        },
      ],
      useCases: ['Volume control', 'Brightness', 'Zoom level', 'Numeric ranges'],
      difficulty: 'beginner',
      pairsWellWith: ['var', 'showvar', 'set', 'if'],
      accessibility: [
        'Keyboard accessible (Arrow keys to adjust)',
        'Provide visible value indicator with ShowVar',
        'Consider adding aria-label with current value',
        'Use aria-valuemin, aria-valuemax, aria-valuenow for screen readers'
      ],
    },
    {
      id: 'select',
      name: 'Select',
      category: 'inputs',
      description: 'Dropdown selection',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Variable to bind selected value' },
      ],
      examples: [
        {
          title: 'Country selector',
          code: `<Select var="country">
  <Option value="us">United States</Option>
  <Option value="uk">United Kingdom</Option>
  <Option value="ca">Canada</Option>
</Select>`,
        },
      ],
      useCases: ['Dropdowns', 'Country selection', 'Category picker', 'Options menu'],
    },
    {
      id: 'colorpicker',
      name: 'ColorPicker',
      category: 'inputs',
      description: 'HTML5 color input',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Variable to store color value' },
      ],
      examples: [
        {
          title: 'Theme color picker',
          code: '<ColorPicker var="accentColor" />',
        },
      ],
      useCases: ['Color themes', 'Customization', 'Drawing tools', 'Styling'],
      difficulty: 'beginner',
      pairsWellWith: ['var', 'showvar', 'set', 'gradientbox', 'setcssvar'],
      tips: [
        'Pair with GradientBox to show live color preview',
        'Use SetCSSVar to apply color dynamically to theme',
        'Display selected color with ShowVar for user feedback'
      ],
    },
  ],

  actions: [
    {
      id: 'set',
      name: 'Set',
      category: 'actions',
      description: 'Set a variable to a value or evaluated expression',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Variable name to set' },
        { name: 'value', type: 'any', required: false, description: 'Literal value to set' },
        { name: 'expression', type: 'string', required: false, description: 'Expression to evaluate and set' },
      ],
      examples: [
        {
          title: 'Set literal value',
          code: '<Set var="status" value="active" />',
        },
        {
          title: 'Set from expression',
          code: '<Set var="total" expression="$vars.price * $vars.quantity" />',
        },
      ],
      useCases: ['Update counters', 'Set form values', 'Calculate results', 'Update UI state'],
    },
    {
      id: 'increment',
      name: 'Increment',
      category: 'actions',
      description: 'Increment a numeric variable',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Variable to increment' },
        { name: 'by', type: 'number', required: false, description: 'Amount to increment', default: '1' },
        { name: 'max', type: 'number', required: false, description: 'Maximum value (won\'t exceed)' },
      ],
      examples: [
        {
          title: 'Simple counter',
          code: '<Button><OnClick><Increment var="counter" /></OnClick>+1</Button>',
        },
        {
          title: 'With maximum',
          code: '<Increment var="score" by="10" max="100" />',
        },
      ],
      useCases: ['Counters', 'Pagination', 'Score tracking', 'Quantity adjustments'],
    },
    {
      id: 'decrement',
      name: 'Decrement',
      category: 'actions',
      description: 'Decrement a numeric variable',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Variable to decrement' },
        { name: 'by', type: 'number', required: false, description: 'Amount to decrement', default: '1' },
        { name: 'min', type: 'number', required: false, description: 'Minimum value (won\'t go below)' },
      ],
      examples: [
        {
          title: 'Simple counter',
          code: '<Button><OnClick><Decrement var="counter" /></OnClick>-1</Button>',
        },
      ],
      useCases: ['Counters', 'Undo operations', 'Quantity adjustments', 'Timers'],
    },
    {
      id: 'toggle',
      name: 'Toggle',
      category: 'actions',
      description: 'Toggle a boolean variable between true/false',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Boolean variable to toggle' },
      ],
      examples: [
        {
          title: 'Toggle menu',
          code: '<Button><OnClick><Toggle var="menuOpen" /></OnClick>Toggle Menu</Button>',
        },
      ],
      useCases: ['Show/hide content', 'Dark mode toggle', 'Accordion expand/collapse', 'Modal open/close'],
    },
    {
      id: 'cycle',
      name: 'Cycle',
      category: 'actions',
      description: 'Cycle through a comma-separated list of values',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Variable to cycle' },
        { name: 'values', type: 'string', required: true, description: 'Comma-separated list of values' },
      ],
      examples: [
        {
          title: 'Theme cycle',
          code: '<Cycle var="theme" values="light,dark,auto" />',
        },
      ],
      useCases: ['Theme cycling', 'Status changes', 'Rotation states', 'Step progression'],
    },
    {
      id: 'reset',
      name: 'Reset',
      category: 'actions',
      description: 'Reset a variable to its initial value',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Variable to reset' },
      ],
      examples: [
        {
          title: 'Reset form',
          code: '<Button><OnClick><Reset var="formData" /></OnClick>Reset Form</Button>',
        },
      ],
      useCases: ['Reset forms', 'Clear filters', 'Restart games', 'Undo changes'],
    },
    {
      id: 'push',
      name: 'Push',
      category: 'actions',
      description: 'Add an item to the end of an array',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Array variable' },
        { name: 'value', type: 'any', required: false, description: 'Literal value to push' },
        { name: 'expression', type: 'string', required: false, description: 'Expression to evaluate and push' },
      ],
      examples: [
        {
          title: 'Add todo item',
          code: '<Push var="todos" value="New task" />',
        },
      ],
      useCases: ['Add list items', 'Build arrays', 'Collect data', 'History tracking'],
    },
    {
      id: 'pop',
      name: 'Pop',
      category: 'actions',
      description: 'Remove the last item from an array',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Array variable' },
      ],
      examples: [
        {
          title: 'Undo last action',
          code: '<Button><OnClick><Pop var="history" /></OnClick>Undo</Button>',
        },
      ],
      useCases: ['Undo operations', 'Remove items', 'Stack operations', 'History management'],
    },
    {
      id: 'removeat',
      name: 'RemoveAt',
      category: 'actions',
      description: 'Remove an item at a specific index from an array',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Array variable' },
        { name: 'index', type: 'number', required: true, description: 'Index to remove' },
      ],
      examples: [
        {
          title: 'Remove todo item',
          code: '<RemoveAt var="todos" index="2" />',
        },
      ],
      useCases: ['Delete list items', 'Remove by index', 'Clean arrays', 'User deletions'],
    },
    {
      id: 'showtoast',
      name: 'ShowToast',
      category: 'actions',
      description: 'Display a temporary notification toast',
      props: [
        { name: 'message', type: 'string', required: true, description: 'Toast message' },
        { name: 'type', type: 'enum', required: false, description: 'Toast type', options: ['success', 'error', 'info', 'warning'], default: 'info' },
        { name: 'duration', type: 'number', required: false, description: 'Display duration in ms', default: '3000' },
      ],
      examples: [
        {
          title: 'Success message',
          code: '<ShowToast message="Saved successfully!" type="success" />',
        },
      ],
      useCases: ['User feedback', 'Confirmations', 'Errors', 'Notifications'],
    },
  ],

  collections: [
    {
      id: 'filter',
      name: 'Filter',
      category: 'collections',
      description: 'Filter array items by condition',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Source array variable' },
        { name: 'target', type: 'string', required: true, description: 'Target variable for filtered results' },
        { name: 'where', type: 'string', required: true, description: 'Filter condition expression (use "item" for each element)' },
      ],
      examples: [
        {
          title: 'Filter active items',
          code: '<Filter var="items" target="activeItems" where="item.status === \'active\'" />',
        },
        {
          title: 'Filter by price',
          code: '<Filter var="products" target="expensive" where="item.price > 100" />',
        },
      ],
      useCases: ['Search filtering', 'Category filtering', 'Status filtering', 'Data analysis'],
    },
    {
      id: 'sort',
      name: 'Sort',
      category: 'collections',
      description: 'Sort array items',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Source array variable' },
        { name: 'target', type: 'string', required: true, description: 'Target variable for sorted results' },
        { name: 'by', type: 'string', required: true, description: 'Property or expression to sort by' },
        { name: 'order', type: 'enum', required: false, description: 'Sort order', options: ['asc', 'desc'], default: 'asc' },
        { name: 'order-var', type: 'string', required: false, description: 'Variable name containing sort order (for dynamic sorting)' },
      ],
      examples: [
        {
          title: 'Sort by price',
          code: '<Sort var="products" target="sorted" by="item.price" order="desc" />',
        },
        {
          title: 'Sort by name',
          code: '<Sort var="users" target="sortedUsers" by="item.name" order="asc" />',
        },
        {
          title: 'Dynamic sort order',
          code: '<RadioGroup var="sortOrder">\n  <OnChange>\n    <Sort var="products" target="sorted" by="item.price" order-var="sortOrder" />\n  </OnChange>\n  <Radio value="asc">Ascending</Radio>\n  <Radio value="desc">Descending</Radio>\n</RadioGroup>',
        },
      ],
      useCases: ['Sort lists', 'Order products', 'Alphabetize', 'Rank items'],
    },
    {
      id: 'transform',
      name: 'Transform',
      category: 'collections',
      description: 'Map/transform array items',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Source array variable' },
        { name: 'target', type: 'string', required: true, description: 'Target variable for transformed results' },
        { name: 'expression', type: 'string', required: true, description: 'Transform expression (use "item" for each element)' },
      ],
      examples: [
        {
          title: 'Extract names',
          code: '<Transform var="users" target="names" expression="item.name" />',
        },
        {
          title: 'Calculate discounts',
          code: '<Transform var="prices" target="discounted" expression="item * 0.9" />',
        },
      ],
      useCases: ['Extract properties', 'Calculate values', 'Format data', 'Create summaries'],
    },
    {
      id: 'find',
      name: 'Find',
      category: 'collections',
      description: 'Find the first matching item in an array',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Source array variable' },
        { name: 'target', type: 'string', required: true, description: 'Target variable for found item' },
        { name: 'where', type: 'string', required: true, description: 'Find condition expression' },
      ],
      examples: [
        {
          title: 'Find user by ID',
          code: '<Find var="users" target="currentUser" where="item.id === 123" />',
        },
      ],
      useCases: ['Search items', 'Lookup by ID', 'Find matches', 'Data retrieval'],
    },
    {
      id: 'count',
      name: 'Count',
      category: 'collections',
      description: 'Count array items with optional filtering. This is an ACTION component - use inside event handlers. For simple counts, use .length in computed variables instead.',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Array variable to count' },
        { name: 'target', type: 'string', required: true, description: 'Target variable for count result' },
        { name: 'where', type: 'string', required: false, description: 'Optional filter condition' },
      ],
      examples: [
        {
          title: 'Count all items',
          code: '<Button>\n  <OnClick>\n    <Count var="todos" target="totalCount" />\n  </OnClick>\n  Count Items\n</Button>',
        },
        {
          title: 'Count with filter',
          code: '<Button>\n  <OnClick>\n    <Count var="todos" target="completedCount" where="item.done === true" />\n  </OnClick>\n  Count Completed\n</Button>',
        },
      ],
      useCases: ['Filtered counts', 'Statistics with conditions', 'Progress tracking', 'Data analysis'],
      tips: [
        'Count is an action component - use inside event handlers like OnClick',
        'For simple counts without filters, use .length property in computed variables: expression="$vars.todos.length"',
        'Use the where prop to count items matching a condition'
      ]
    },
    {
      id: 'sum',
      name: 'Sum',
      category: 'collections',
      description: 'Sum numeric values in an array',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Array variable' },
        { name: 'target', type: 'string', required: true, description: 'Target variable for sum result' },
        { name: 'property', type: 'string', required: false, description: 'Property to sum (for arrays of objects)' },
      ],
      examples: [
        {
          title: 'Sum prices',
          code: '<Sum var="items" target="totalPrice" property="price" />',
        },
      ],
      useCases: ['Calculate totals', 'Sum prices', 'Aggregate data', 'Statistics'],
    },
    {
      id: 'get',
      name: 'Get',
      category: 'collections',
      description: 'Get a property or index from an object/array',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Source variable (object or array)' },
        { name: 'target', type: 'string', required: true, description: 'Target variable for result' },
        { name: 'property', type: 'string', required: false, description: 'Property name or path' },
        { name: 'index', type: 'number', required: false, description: 'Array index' },
      ],
      examples: [
        {
          title: 'Get array item',
          code: '<Get var="items" target="firstItem" index="0" />',
        },
        {
          title: 'Get object property',
          code: '<Get var="user" target="userName" property="name" />',
        },
      ],
      useCases: ['Access nested data', 'Get array items', 'Extract properties', 'Dynamic access'],
    },
  ],

  objects: [
    {
      id: 'extract',
      name: 'Extract',
      category: 'objects',
      description: 'Extract properties from an object into separate variables using Property children',
      props: [
        { name: 'from', type: 'string', required: true, description: 'Source object (variable reference or $vars.varName)' },
      ],
      examples: [
        {
          title: 'Extract user properties',
          code: `<Extract from="user">
  <Property path="name" as="userName" />
  <Property path="email" as="userEmail" />
  <Property path="age" as="userAge" />
</Extract>`,
        },
        {
          title: 'Extract nested properties',
          code: `<Extract from="profile">
  <Property path="address.city" as="city" />
  <Property path="address.state" as="state" />
</Extract>`,
        },
      ],
      useCases: ['Object destructuring', 'Extract data', 'Create variables', 'Data unpacking'],
    },
    {
      id: 'property',
      name: 'Property',
      category: 'objects',
      description: 'Child component of Extract - defines a property to extract from parent Extract source',
      props: [
        { name: 'path', type: 'string', required: true, description: 'Property path to extract (supports dot notation like "address.city")' },
        { name: 'as', type: 'string', required: true, description: 'Target variable name to create' },
      ],
      examples: [
        {
          title: 'Extract nested property',
          code: `<Extract from="user">
  <Property path="profile.bio" as="userBio" />
</Extract>`,
        },
      ],
      useCases: ['Access nested data', 'Deep property extraction', 'Complex objects', 'Must be used inside Extract'],
    },
    {
      id: 'merge',
      name: 'Merge',
      category: 'objects',
      description: 'Merge multiple objects into one',
      props: [
        { name: 'target', type: 'string', required: true, description: 'Target variable for merged result' },
        { name: 'sources', type: 'string', required: true, description: 'Comma-separated source variable names' },
      ],
      examples: [
        {
          title: 'Merge objects',
          code: '<Merge target="combined" sources="defaults,userSettings" />',
        },
      ],
      useCases: ['Combine objects', 'Merge settings', 'Data aggregation', 'Defaults + overrides'],
    },
    {
      id: 'clone',
      name: 'Clone',
      category: 'objects',
      description: 'Create a deep copy of an object',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Source variable to clone' },
        { name: 'target', type: 'string', required: true, description: 'Target variable for clone' },
      ],
      examples: [
        {
          title: 'Clone object',
          code: '<Clone var="original" target="copy" />',
        },
      ],
      useCases: ['Duplicate data', 'Preserve original', 'Undo functionality', 'Safe mutations'],
    },
    {
      id: 'objectset',
      name: 'ObjectSet',
      category: 'objects',
      description: 'Set a nested property in an object immutably',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Object variable to modify' },
        { name: 'path', type: 'string', required: true, description: 'Property path (e.g., "user.address.city")' },
        { name: 'value', type: 'any', required: false, description: 'Literal value to set' },
        { name: 'expression', type: 'string', required: false, description: 'Expression to evaluate and set' },
      ],
      examples: [
        {
          title: 'Update nested property',
          code: '<ObjectSet var="cart" path="items[0].quantity" value="5" />',
        },
      ],
      useCases: ['Update nested data', 'Immutable updates', 'Deep property setting', 'Complex state'],
    },
  ],

  events: [
    {
      id: 'onclick',
      name: 'OnClick',
      category: 'events',
      description: 'Execute actions when an element is clicked',
      props: [],
      examples: [
        {
          title: 'Increment counter on click',
          code: `<Button>
  <OnClick>
    <Increment var="counter" />
  </OnClick>
  Click me
</Button>`,
        },
      ],
      useCases: ['Button clicks', 'Interactive elements', 'User actions', 'Triggers'],
    },
    {
      id: 'onchange',
      name: 'OnChange',
      category: 'events',
      description: 'Execute actions when an input value changes',
      props: [
        { name: 'debounce', type: 'number', required: false, description: 'Debounce delay in ms' },
      ],
      examples: [
        {
          title: 'Search with debounce',
          code: `<TInput var="searchQuery">
  <OnChange debounce="300">
    <Filter var="items" target="results" where="item.name.includes($vars.searchQuery)" />
  </OnChange>
</TInput>`,
        },
      ],
      useCases: ['Form inputs', 'Search', 'Real-time validation', 'Auto-save'],
    },
    {
      id: 'onmount',
      name: 'OnMount',
      category: 'events',
      description: 'Execute actions when component mounts',
      props: [],
      examples: [
        {
          title: 'Load data on mount',
          code: `<div>
  <OnMount>
    <Set var="loaded" value="true" />
  </OnMount>
  Content
</div>`,
        },
      ],
      useCases: ['Initialization', 'Data fetching', 'Setup actions', 'Load defaults'],
    },
    {
      id: 'oninterval',
      name: 'OnInterval',
      category: 'events',
      description: 'Execute actions repeatedly at a fixed interval',
      props: [
        { name: 'seconds', type: 'number', required: true, description: 'Interval in seconds' },
      ],
      examples: [
        {
          title: 'Auto-incrementing timer',
          code: `<div>
  <OnInterval seconds="1">
    <Increment var="timer" />
  </OnInterval>
  <ShowVar name="timer" />
</div>`,
        },
      ],
      useCases: ['Timers', 'Auto-refresh', 'Polling', 'Animations'],
    },
    {
      id: 'onhover',
      name: 'OnHover',
      category: 'events',
      description: 'Execute actions when mouse hovers over element',
      props: [],
      examples: [
        {
          title: 'Show tooltip on hover',
          code: `<div>
  <OnHover>
    <Set var="showTooltip" value="true" />
  </OnHover>
  Hover me
</div>`,
        },
      ],
      useCases: ['Tooltips', 'Previews', 'Hover effects', 'Interactive UI'],
    },
    {
      id: 'onkeypress',
      name: 'OnKeyPress',
      category: 'events',
      description: 'Execute actions when a key is pressed',
      props: [
        { name: 'key', type: 'string', required: true, description: 'Key to listen for (e.g., "Enter", "Escape")' },
      ],
      examples: [
        {
          title: 'Submit on Enter',
          code: `<OnKeyPress key="Enter">
  <ShowToast message="Submitted!" type="success" />
</OnKeyPress>`,
        },
      ],
      useCases: ['Keyboard shortcuts', 'Form submission', 'Navigation', 'Accessibility'],
    },
    {
      id: 'onvisible',
      name: 'OnVisible',
      category: 'events',
      description: 'Execute actions when element becomes visible in viewport',
      props: [],
      examples: [
        {
          title: 'Track visibility',
          code: `<div>
  <OnVisible>
    <Set var="viewCount" expression="$vars.viewCount + 1" />
  </OnVisible>
  Content
</div>`,
        },
      ],
      useCases: ['Lazy loading', 'Analytics', 'Infinite scroll', 'View tracking'],
    },
  ],

  timing: [
    {
      id: 'delay',
      name: 'Delay',
      category: 'timing',
      description: 'Execute actions after a delay (specify either seconds or milliseconds)',
      props: [
        { name: 'seconds', type: 'number', required: false, description: 'Delay in seconds' },
        { name: 'milliseconds', type: 'number', required: false, description: 'Delay in milliseconds (alternative to seconds)' },
      ],
      examples: [
        {
          title: 'Show message after delay (seconds)',
          code: `<Button>
  <OnClick>
    <Set var="loading" value="true" />
    <Delay seconds="2">
      <Set var="loading" value="false" />
      <ShowToast message="Done!" type="success" />
    </Delay>
  </OnClick>
  Load
</Button>`,
        },
        {
          title: 'Quick feedback (milliseconds)',
          code: `<Button>
  <OnClick>
    <ShowToast message="Starting..." />
    <Delay milliseconds="500">
      <ShowToast message="Complete!" />
    </Delay>
  </OnClick>
  Quick Action
</Button>`,
        },
      ],
      useCases: ['Loading states', 'Delayed feedback', 'Animations', 'Timed actions'],
    },
    {
      id: 'sequence',
      name: 'Sequence',
      category: 'timing',
      description: 'Execute multiple actions sequentially with custom delays. Supports two patterns: Step-based (explicit delays) or direct children (with Delay components)',
      props: [],
      examples: [
        {
          title: 'Step-based pattern',
          code: `<Sequence>
  <Step delay="0">
    <Set var="step" value="1" />
  </Step>
  <Step delay="1000">
    <Set var="step" value="2" />
  </Step>
  <Step delay="1000">
    <Set var="step" value="3" />
  </Step>
</Sequence>`,
        },
        {
          title: 'Direct children pattern (simpler)',
          code: `<Sequence>
  <Set var="message" value="Starting..." />
  <Delay milliseconds="1000" />
  <Set var="message" value="Loading..." />
  <Delay milliseconds="1000" />
  <Set var="message" value="Complete!" />
</Sequence>`,
        },
      ],
      useCases: ['Animations', 'Step-by-step processes', 'Timed sequences', 'Tutorials'],
    },
    {
      id: 'timeout',
      name: 'Timeout',
      category: 'timing',
      description: 'Execute actions automatically after a timeout',
      props: [
        { name: 'seconds', type: 'number', required: true, description: 'Timeout in seconds' },
      ],
      examples: [
        {
          title: 'Auto-hide notification',
          code: `<div>
  <Timeout seconds="5">
    <Set var="showNotification" value="false" />
  </Timeout>
  Notification text
</div>`,
        },
      ],
      useCases: ['Auto-dismiss', 'Timeouts', 'Expiring content', 'Auto-actions'],
    },
  ],

  conditionals: [
    {
      id: 'if',
      name: 'If',
      category: 'conditionals',
      description: 'Universal conditional component - render content conditionally OR execute actions conditionally inside event handlers. Supports combining multiple conditions.',
      props: [
        { name: 'condition', type: 'string', required: false, description: 'Variable path to evaluate (use with comparison operators)' },
        { name: 'and', type: 'string', required: false, description: 'Comma-separated variables that must ALL be truthy' },
        { name: 'or', type: 'string', required: false, description: 'Comma-separated variables where at least ONE must be truthy' },
        { name: 'not', type: 'string', required: false, description: 'Variable that must be falsy' },
        { name: 'equals', type: 'any', required: false, description: 'Value to compare equality' },
        { name: 'notEquals', type: 'any', required: false, description: 'Value to compare inequality' },
        { name: 'greaterThan', type: 'number', required: false, description: 'Greater than comparison' },
        { name: 'lessThan', type: 'number', required: false, description: 'Less than comparison' },
        { name: 'greaterThanOrEqual', type: 'number', required: false, description: 'Greater than or equal comparison' },
        { name: 'lessThanOrEqual', type: 'number', required: false, description: 'Less than or equal comparison' },
        { name: 'contains', type: 'string', required: false, description: 'Check if string contains value' },
      ],
      examples: [
        {
          title: 'Simple condition',
          code: `<If condition="$vars.isLoggedIn">
  <p>Welcome back!</p>
</If>`,
        },
        {
          title: 'Combined conditions (AND with comparison)',
          code: `<If and="$vars.password" condition="$vars.passwordLength" lessThan="8">
  <p>Password must be at least 8 characters</p>
</If>`,
        },
        {
          title: 'Multiple AND conditions',
          code: `<If and="$vars.username,$vars.email,$vars.agreed">
  <Button>Submit</Button>
</If>`,
        },
        {
          title: 'If/ElseIf/Else chain (actions)',
          code: `<Button>
  <OnClick>
    <If condition="$vars.score" greaterThanOrEqual="90">
      <Set var="grade" value="A" />
    </If>
    <ElseIf condition="$vars.score" greaterThanOrEqual="80">
      <Set var="grade" value="B" />
    </ElseIf>
    <Else>
      <Set var="grade" value="C" />
    </Else>
  </OnClick>
</Button>`,
        },
      ],
      useCases: ['Conditional rendering', 'Form validation', 'Access control', 'Feature flags', 'Multi-condition checks', 'Action chains'],
      tips: [
        'NEW: You can now combine and/or with comparison operators in a single If tag',
        'Use condition="$vars.varName" with comparison operators like lessThan, greaterThan, etc.',
        'Use and="$vars.var1,$vars.var2" to require multiple variables to be truthy',
        'All conditions are combined with AND logic - all must be true',
        'If works in two contexts: rendering (shows/hides content) and actions (inside OnClick, OnChange, etc.)'
      ],
      difficulty: 'beginner',
      pairsWellWith: ['var', 'showvar', 'else', 'elseif', 'button'],
      operators: [
        {
          name: 'equals',
          syntax: 'condition="$vars.status" equals="active"',
          example: '<If condition="$vars.theme" equals="dark">Dark mode enabled</If>',
          description: 'Check if variable equals a value'
        },
        {
          name: 'notEquals',
          syntax: 'condition="$vars.status" notEquals=""',
          example: '<If condition="$vars.username" notEquals="">Welcome!</If>',
          description: 'Check if variable does not equal a value'
        },
        {
          name: 'greaterThan',
          syntax: 'condition="$vars.age" greaterThan="17"',
          example: '<If condition="$vars.score" greaterThan="90">A+ grade!</If>',
          description: 'Check if number is greater than value'
        },
        {
          name: 'lessThan',
          syntax: 'condition="$vars.age" lessThan="18"',
          example: '<If condition="$vars.stock" lessThan="5">Low stock</If>',
          description: 'Check if number is less than value'
        },
        {
          name: 'greaterThanOrEqual',
          syntax: 'condition="$vars.score" greaterThanOrEqual="80"',
          example: '<If condition="$vars.age" greaterThanOrEqual="18">Adult</If>',
          description: 'Check if number is greater than or equal to value'
        },
        {
          name: 'lessThanOrEqual',
          syntax: 'condition="$vars.rating" lessThanOrEqual="3"',
          example: '<If condition="$vars.temp" lessThanOrEqual="32">Freezing!</If>',
          description: 'Check if number is less than or equal to value'
        },
        {
          name: 'contains',
          syntax: 'condition="$vars.email" contains="@"',
          example: '<If condition="$vars.username" contains="admin">Admin user</If>',
          description: 'Check if string contains a substring'
        },
        {
          name: 'and',
          syntax: 'and="$vars.username,$vars.password"',
          example: '<If and="$vars.agreed,$vars.email">Can submit</If>',
          description: 'All listed variables must be truthy'
        },
        {
          name: 'or',
          syntax: 'or="$vars.isPro,$vars.isTrial"',
          example: '<If or="$vars.isAdmin,$vars.isOwner">Has access</If>',
          description: 'At least one listed variable must be truthy'
        },
        {
          name: 'not',
          syntax: 'not="$vars.isDisabled"',
          example: '<If not="$vars.isLoading">Show content</If>',
          description: 'Variable must be falsy'
        }
      ]
    },
    {
      id: 'switch',
      name: 'Switch',
      category: 'conditionals',
      description: 'Pattern matching with multiple cases',
      props: [
        { name: 'value', type: 'string', required: true, description: 'Value or expression to match against' },
      ],
      examples: [
        {
          title: 'Status indicator',
          code: `<Switch value="$vars.status">
  <Case value="pending">⏳ Pending</Case>
  <Case value="active">✅ Active</Case>
  <Default>❓ Unknown</Default>
</Switch>`,
        },
      ],
      useCases: ['Multiple conditions', 'Status rendering', 'State machines', 'Complex logic'],
    },
  ],

  loops: [
    {
      id: 'foreach',
      name: 'ForEach',
      category: 'loops',
      description: 'Iterate over arrays and render content for each item',
      props: [
        { name: 'var', type: 'string', required: true, description: 'Array variable to iterate' },
        { name: 'item', type: 'string', required: false, description: 'Name for current item', default: 'item' },
        { name: 'index', type: 'string', required: false, description: 'Name for current index', default: 'index' },
      ],
      examples: [
        {
          title: 'Render list items',
          code: `<ForEach var="todos" item="todo">
  <div>
    <ShowVar name="todo.title" />
  </div>
</ForEach>`,
        },
      ],
      useCases: ['Lists', 'Tables', 'Galleries', 'Repeated content'],
    },
    {
      id: 'break',
      name: 'Break',
      category: 'loops',
      description: 'Exit a ForEach loop early based on a condition',
      props: [
        { name: 'when', type: 'string', required: false, description: 'Condition expression to break' },
      ],
      examples: [
        {
          title: 'Stop at first match',
          code: `<ForEach var="items">
  <Break when="item.found === true" />
  <div><ShowVar name="item.name" /></div>
</ForEach>`,
        },
      ],
      useCases: ['Early exit', 'Find first match', 'Performance optimization', 'Conditional iteration'],
    },
    {
      id: 'continue',
      name: 'Continue',
      category: 'loops',
      description: 'Skip the current iteration in a ForEach loop',
      props: [
        { name: 'when', type: 'string', required: false, description: 'Condition expression to skip' },
      ],
      examples: [
        {
          title: 'Skip inactive items',
          code: `<ForEach var="items">
  <Continue when="item.active === false" />
  <div><ShowVar name="item.name" /></div>
</ForEach>`,
        },
      ],
      useCases: ['Skip items', 'Filter rendering', 'Conditional display', 'Data filtering'],
    },
  ],
};
