// Tutorial content for template documentation

export interface TutorialStep {
  id: string;
  title: string;
  explanation: string;
  code: string;
  tips?: string[];
  concepts: string[]; // Component names covered in this step
}

export interface Tutorial {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  icon: string;
  color: string;
  hoverColor: string;
  learningObjectives: string[];
  prerequisites: string[];
  steps: TutorialStep[];
  summary: string;
  nextTutorial?: string;
  relatedComponents: string[];
}

export const tutorials: Tutorial[] = [
  // Tutorial 1: Your First Template
  {
    id: 'tutorial-1',
    slug: 'your-first-template',
    title: 'Your First Template',
    description: 'Learn the basics of template syntax by building a simple interactive counter',
    difficulty: 'beginner',
    estimatedTime: '10 minutes',
    icon: '',
    color: 'bg-green-200',
    hoverColor: 'hover:bg-green-100',
    learningObjectives: [
      'Understand template structure and syntax',
      'Declare and display variables',
      'Create interactive buttons with event handlers',
      'Use actions to modify state'
    ],
    prerequisites: [],
    steps: [
      {
        id: 'step-1',
        title: 'Creating Your First Variable',
        explanation: 'Every interactive template starts with state. Let\'s create a counter variable that will hold a number.',
        code: '<Var name="counter" type="number" initial="0" />',
        concepts: ['Var'],
        tips: [
          'Variables must be declared at the top of your template (before any elements that reference them)',
          'The initial value determines what users see when they first load your template'
        ]
      },
      {
        id: 'step-2',
        title: 'Displaying the Counter',
        explanation: 'Now let\'s show the counter value to users. The ShowVar component displays the current value of any variable.',
        code: `<Var name="counter" type="number" initial="0" />

<div>
  <p>Current count: <ShowVar name="counter" /></p>
</div>`,
        concepts: ['ShowVar']
      },
      {
        id: 'step-3',
        title: 'Adding a Button',
        explanation: 'Let\'s add a button that users can click. We\'ll attach an event handler in the next step.',
        code: `<Var name="counter" type="number" initial="0" />

<div>
  <p>Current count: <ShowVar name="counter" /></p>
  <Button>Increment Counter</Button>
</div>`,
        concepts: ['Button']
      },
      {
        id: 'step-4',
        title: 'Making it Interactive',
        explanation: 'Now for the magic! Add an OnClick event handler with an Increment action. When clicked, the counter will increase by 1.',
        code: `<Var name="counter" type="number" initial="0" />

<div>
  <p>Current count: <ShowVar name="counter" /></p>
  <Button>
    <OnClick>
      <Increment var="counter" />
    </OnClick>
    Increment Counter
  </Button>
</div>`,
        concepts: ['OnClick', 'Increment'],
        tips: [
          'Event handlers like OnClick can contain multiple actions',
          'Actions execute in the order they appear'
        ]
      },
      {
        id: 'step-5',
        title: 'Adding a Reset Button',
        explanation: 'Let\'s add another button to reset the counter back to 0 using the Reset action.',
        code: `<Var name="counter" type="number" initial="0" />

<div>
  <p>Current count: <ShowVar name="counter" /></p>
  <Button>
    <OnClick>
      <Increment var="counter" />
    </OnClick>
    Increment Counter
  </Button>
  <Button>
    <OnClick>
      <Reset var="counter" />
    </OnClick>
    Reset
  </Button>
</div>`,
        concepts: ['Reset'],
        tips: [
          'Reset always returns a variable to its initial value'
        ]
      }
    ],
    summary: 'You\'ve built your first interactive template! You learned how to declare variables, display them, and modify them with user actions. These fundamentals are the building blocks for all templates.',
    nextTutorial: 'working-with-variables',
    relatedComponents: ['var', 'showvar', 'button', 'onclick', 'increment', 'reset']
  },

  // Tutorial 2: Working with Variables
  {
    id: 'tutorial-2',
    slug: 'working-with-variables',
    title: 'Working with Variables',
    description: 'Master different variable types, computed values, and persistence',
    difficulty: 'beginner',
    estimatedTime: '15 minutes',
    icon: '',
    color: 'bg-green-200',
    hoverColor: 'hover:bg-green-100',
    learningObjectives: [
      'Use different variable types (number, string, boolean, array)',
      'Create computed variables with expressions',
      'Persist data with localStorage',
      'Work with URL parameters'
    ],
    prerequisites: ['your-first-template'],
    steps: [
      {
        id: 'step-1',
        title: 'Number Variables',
        explanation: 'You\'ve already seen number variables. They\'re perfect for counters, scores, quantities, and calculations.',
        code: `<Var name="score" type="number" initial="0" />
<Var name="lives" type="number" initial="3" />

<p>Score: <ShowVar name="score" /></p>
<p>Lives: <ShowVar name="lives" /></p>`,
        concepts: ['Var']
      },
      {
        id: 'step-2',
        title: 'String Variables',
        explanation: 'String variables store text. Great for names, messages, and user input.',
        code: `<Var name="username" type="string" initial="Guest" />
<Var name="message" type="string" initial="Welcome!" />

<p>Hello, <ShowVar name="username" /></p>
<p><ShowVar name="message" /></p>`,
        concepts: ['Var']
      },
      {
        id: 'step-3',
        title: 'Boolean Variables',
        explanation: 'Boolean variables are true/false flags. Perfect for toggles, visibility, and feature flags.',
        code: `<Var name="isVisible" type="boolean" initial="true" />
<Var name="isDarkMode" type="boolean" initial="false" />

<p>Visible: <ShowVar name="isVisible" /></p>
<Button>
  <OnClick>
    <Toggle var="isVisible" />
  </OnClick>
  Toggle Visibility
</Button>`,
        concepts: ['Var', 'Toggle']
      },
      {
        id: 'step-4',
        title: 'Array Variables',
        explanation: 'Arrays store lists of values. Use the .length property to count how many items are in an array.',
        code: `<Var name="todos" type="array" initial='["Buy groceries", "Walk dog", "Code"]' />
<Var name="todoCount" type="computed" expression="$vars.todos.length" />

<p>You have <ShowVar name="todoCount" /> todos</p>
<p>Todos: <ShowVar name="todos" /></p>`,
        concepts: ['Var'],
        tips: [
          'Arrays can be empty [] or contain initial values',
          'Use .length property in computed variables to count array items',
          'We\'ll learn to loop through arrays in a later tutorial'
        ]
      },
      {
        id: 'step-5',
        title: 'Computed Variables',
        explanation: 'Computed variables calculate their value from other variables using expressions. Reference other variables with $vars.variableName.',
        code: `<Var name="price" type="number" initial="100" />
<Var name="quantity" type="number" initial="2" />
<Var name="total" type="computed" expression="$vars.price * $vars.quantity" />

<p>Price: $<ShowVar name="price" /></p>
<p>Quantity: <ShowVar name="quantity" /></p>
<p>Total: $<ShowVar name="total" /></p>

<Button>
  <OnClick>
    <Increment var="quantity" />
  </OnClick>
  Add One
</Button>`,
        concepts: ['Var', 'Button', 'OnClick', 'Increment'],
        tips: [
          'Computed variables update automatically when dependencies change',
          'Always use $vars. prefix to reference other variables',
          'You can use math operators: +, -, *, /, %',
          'Try clicking "Add One" to see the total update automatically'
        ]
      },
      {
        id: 'step-6',
        title: 'Persistent Variables',
        explanation: 'Add persist="true" to save variables to localStorage. They\'ll survive page reloads!',
        code: `<Var name="highScore" type="number" initial="0" persist="true" />

<p>High Score: <ShowVar name="highScore" /></p>
<Button>
  <OnClick>
    <Increment var="highScore" />
  </OnClick>
  Increase High Score
</Button>`,
        concepts: ['Var'],
        tips: [
          'Persisted variables are saved per-template in the browser\'s localStorage',
          'Data is stored locally on the user\'s device and persists across page reloads',
          'Each template instance maintains its own persisted data (scoped per user per template)',
          'Great for high scores, user preferences, and progress tracking'
        ]
      },
      {
        id: 'step-7',
        title: 'URL Parameter Variables',
        explanation: 'Read values from the URL query string. Perfect for shareable links and pre-filled forms. These variables are read-only and cannot be modified.',
        code: `<Var name="productId" type="urlParam" param="id" default="unknown" />

<p>Viewing product: <ShowVar name="productId" /></p>
<p>Try adding ?id=12345 to the URL!</p>`,
        concepts: ['Var'],
        tips: [
          'URL param variables are READ-ONLY - they cannot be modified by actions',
          'The value comes from the URL query string (e.g., ?id=12345)',
          'Always provide a default value for when the param is not present',
          'Great for shareable templates and pre-filled forms'
        ]
      }
    ],
    summary: 'You now understand all variable types and how to use them effectively. Variables are the foundation of every template - choose the right type for your data!',
    nextTutorial: 'user-interactions',
    relatedComponents: ['var', 'showvar', 'toggle']
  },

  // Tutorial 3: User Interactions
  {
    id: 'tutorial-3',
    slug: 'user-interactions',
    title: 'User Interactions',
    description: 'Capture user input with forms, text fields, checkboxes, and more',
    difficulty: 'intermediate',
    estimatedTime: '20 minutes',
    icon: '',
    color: 'bg-yellow-200',
    hoverColor: 'hover:bg-yellow-100',
    learningObjectives: [
      'Capture text input from users',
      'Work with checkboxes and toggles',
      'Use sliders and range inputs',
      'Handle onChange events',
      'Build interactive forms'
    ],
    prerequisites: ['your-first-template', 'working-with-variables'],
    steps: [
      {
        id: 'step-1',
        title: 'Text Input Basics',
        explanation: 'The TInput component captures text from users and stores it in a variable.',
        code: `<Var name="username" type="string" initial="" />

<TInput var="username" placeholder="Enter your name" />
<p>Hello, <ShowVar name="username" />!</p>`,
        concepts: ['TInput'],
        tips: [
          'TInput automatically updates the variable as users type',
          'Use placeholder for helpful hints'
        ]
      },
      {
        id: 'step-2',
        title: 'Input with OnChange',
        explanation: 'Use OnChange to run actions when input values change. Let\'s show a toast notification.',
        code: `<Var name="email" type="string" initial="" />

<TInput var="email" placeholder="your@email.com">
  <OnChange>
    <ShowToast message="Email updated!" />
  </OnChange>
</TInput>`,
        concepts: ['TInput', 'OnChange', 'ShowToast']
      },
      {
        id: 'step-3',
        title: 'Checkboxes',
        explanation: 'Checkboxes toggle boolean variables on and off.',
        code: `<Var name="agreedToTerms" type="boolean" initial="false" />
<Var name="newsletter" type="boolean" initial="false" />

<label>
  <Checkbox var="agreedToTerms" />
  I agree to the terms and conditions
</label>

<label>
  <Checkbox var="newsletter" />
  Subscribe to newsletter
</label>

<p>Agreed: <ShowVar name="agreedToTerms" /></p>`,
        concepts: ['Checkbox']
      },
      {
        id: 'step-4',
        title: 'Sliders',
        explanation: 'Sliders let users choose numeric values within a range.',
        code: `<Var name="volume" type="number" initial="50" />
<Var name="brightness" type="number" initial="75" />

<label>Volume: <ShowVar name="volume" /></label>
<Slider var="volume" min="0" max="100" step="1" />

<label>Brightness: <ShowVar name="brightness" /></label>
<Slider var="brightness" min="0" max="100" step="5" />`,
        concepts: ['Slider']
      },
      {
        id: 'step-5',
        title: 'Select Dropdowns',
        explanation: 'Select components create dropdown menus for choosing from predefined options. Use Option components as children.',
        code: `<Var name="country" type="string" initial="USA" />

<label>Select your country:</label>
<Select var="country">
  <Option value="USA">United States</Option>
  <Option value="Canada">Canada</Option>
  <Option value="Mexico">Mexico</Option>
  <Option value="UK">United Kingdom</Option>
</Select>

<p>You selected: <ShowVar name="country" /></p>`,
        concepts: ['Select'],
        tips: [
          'Use <Option> components (capital O) inside <Select>',
          'The value prop is what gets stored in the variable'
        ]
      },
      {
        id: 'step-6',
        title: 'Radio Groups',
        explanation: 'RadioGroup components let users choose one option from a set. Use Radio components as children.',
        code: `<Var name="plan" type="string" initial="basic" />

<RadioGroup var="plan">
  <Radio value="basic">Basic - $9/mo</Radio>
  <Radio value="pro">Pro - $29/mo</Radio>
  <Radio value="enterprise">Enterprise - $99/mo</Radio>
</RadioGroup>

<p>Selected plan: <ShowVar name="plan" /></p>`,
        concepts: ['RadioGroup'],
        tips: [
          'Use <Radio> components inside <RadioGroup>',
          'Only one radio can be selected at a time',
          'The selected radio\'s value is stored in the variable'
        ]
      },
      {
        id: 'step-7',
        title: 'Complete Form Example',
        explanation: 'Let\'s combine everything into a complete user profile form.',
        code: `<Var name="fullName" type="string" initial="" />
<Var name="age" type="number" initial="18" />
<Var name="notifications" type="boolean" initial="true" />
<Var name="theme" type="string" initial="light" />

<div>
  <h3>User Profile</h3>

  <label>Full Name</label>
  <TInput var="fullName" placeholder="John Doe" />

  <label>Age: <ShowVar name="age" /></label>
  <Slider var="age" min="13" max="100" step="1" />

  <label>
    <Checkbox var="notifications" />
    Enable notifications
  </label>

  <label>Theme</label>
  <RadioGroup var="theme">
    <Radio value="light">Light Mode</Radio>
    <Radio value="dark">Dark Mode</Radio>
  </RadioGroup>

  <Button>
    <OnClick>
      <ShowToast message="Profile saved!" />
    </OnClick>
    Save Profile
  </Button>
</div>`,
        concepts: ['TInput', 'Slider', 'Checkbox', 'RadioGroup', 'Button', 'OnClick', 'ShowToast']
      }
    ],
    summary: 'You now know how to capture all types of user input! These components are the building blocks for forms, settings pages, and interactive experiences.',
    nextTutorial: 'conditional-logic',
    relatedComponents: ['tinput', 'checkbox', 'slider', 'select', 'radiogroup', 'onchange']
  },

  // Tutorial 4: Conditional Logic
  {
    id: 'tutorial-4',
    slug: 'conditional-logic',
    title: 'Conditional Logic',
    description: 'Show and hide content dynamically based on state and user input',
    difficulty: 'intermediate',
    estimatedTime: '20 minutes',
    icon: '',
    color: 'bg-yellow-200',
    hoverColor: 'hover:bg-yellow-100',
    learningObjectives: [
      'Use If components for conditional rendering and actions',
      'Master comparison operators and combined conditions',
      'Combine multiple conditions in a single If tag',
      'Build multi-branch logic with Switch',
      'Create dynamic UIs that respond to state'
    ],
    prerequisites: ['user-interactions'],
    steps: [
      {
        id: 'step-1',
        title: 'Basic If Statement',
        explanation: 'The If component shows its contents only when a condition is true.',
        code: `<Var name="isLoggedIn" type="boolean" initial="false" />

<Button>
  <OnClick>
    <Toggle var="isLoggedIn" />
  </OnClick>
  Toggle Login
</Button>

<If condition="isLoggedIn">
  <p>Welcome back!</p>
</If>`,
        concepts: ['If', 'Toggle'],
        tips: [
          'If components remove content from the DOM when false',
          'Great for conditionally rendering entire sections'
        ]
      },
      {
        id: 'step-2',
        title: 'Comparison Operators',
        explanation: 'Use comparison operators as separate props: equals, notEquals, greaterThan, lessThan, greaterThanOrEqual, lessThanOrEqual, contains',
        code: `<Var name="age" type="number" initial="16" />

<Slider var="age" min="0" max="100" step="1" />
<p>Age: <ShowVar name="age" /></p>

<If condition="$vars.age" greaterThanOrEqual="18">
  <p>✓ You are an adult</p>
</If>

<If condition="$vars.age" lessThan="18">
  <p>You are a minor</p>
</If>`,
        concepts: ['If'],
        tips: [
          'Use condition prop for the variable path: condition="$vars.age"',
          'Add comparison as separate prop: greaterThanOrEqual="18"',
          'Comparison operators: equals, notEquals, greaterThan, lessThan, greaterThanOrEqual, lessThanOrEqual',
          'String operator: contains (checks if string contains a substring)',
          'Boolean operators: and, or, not (combine multiple conditions)'
        ]
      },
      {
        id: 'step-3',
        title: 'Boolean Conditionals',
        explanation: 'If can check boolean variables directly - just pass the variable path without any comparison operators.',
        code: `<Var name="showDetails" type="boolean" initial="false" />

<Button>
  <OnClick>
    <Toggle var="showDetails" />
  </OnClick>
  Toggle Details
</Button>

<If condition="$vars.showDetails">
  <div>
    <p>These details can be toggled on and off</p>
    <p>The element is shown when showDetails is true</p>
  </div>
</If>`,
        concepts: ['If'],
        tips: [
          'For boolean checks, just use condition="$vars.variableName"',
          'No comparison operators needed for truthy/falsy checks'
        ]
      },
      {
        id: 'step-4',
        title: 'Multiple Conditions with AND',
        explanation: 'Use the and prop with comma-separated variable paths to require multiple conditions to be true.',
        code: `<Var name="username" type="string" initial="" />
<Var name="password" type="string" initial="" />

<TInput var="username" placeholder="Username" />
<TInput var="password" placeholder="Password" />

<If and="$vars.username,$vars.password">
  <Button>
    <OnClick>
      <ShowToast message="Logging in..." />
    </OnClick>
    Login
  </Button>
</If>`,
        concepts: ['If'],
        tips: [
          'Use and="$vars.var1,$vars.var2" with comma-separated paths to require all variables to be truthy',
          'Empty strings, 0, null, undefined, and false are falsy values',
          'For OR logic, use or="$vars.var1,$vars.var2" instead'
        ]
      },
      {
        id: 'step-5',
        title: 'Switch Statements',
        explanation: 'Switch components handle multiple conditions elegantly. Like if/else if/else chains.',
        code: `<Var name="status" type="string" initial="pending" />

<Button>
  <OnClick>
    <Cycle var="status" values="pending,approved,rejected" />
  </OnClick>
  Change Status
</Button>

<Switch value="$vars.status">
  <Case value="pending">
    <p>⏳ Application is pending review</p>
  </Case>
  <Case value="approved">
    <p>✓ Application approved!</p>
  </Case>
  <Case value="rejected">
    <p>✗ Application rejected</p>
  </Case>
</Switch>`,
        concepts: ['Switch', 'Cycle'],
        tips: [
          'Cycle uses comma-separated values: values="value1,value2,value3"',
          'Case component names are case-sensitive (use capital C)',
          'Switch evaluates the value once, then checks each Case in order',
          'First matching Case wins - subsequent Cases are skipped'
        ]
      },
      {
        id: 'step-6',
        title: 'Dynamic Form Validation',
        explanation: 'Combine If operators with computed variables for real-time validation feedback.',
        code: `<Var name="email" type="string" initial="" />
<Var name="password" type="string" initial="" />
<Var name="passwordLength" type="computed" expression="$vars.password.length" />

<label>Email</label>
<TInput var="email" placeholder="user@example.com" />

<label>Password (min 8 characters)</label>
<TInput var="password" placeholder="Password" />
<If and="$vars.password" condition="$vars.passwordLength" lessThan="8">
  <p style="color: red">Password must be at least 8 characters</p>
</If>

<If condition="$vars.email" contains="@">
  <If condition="$vars.passwordLength" greaterThanOrEqual="8">
    <Button>
      <OnClick>
        <ShowToast message="Form submitted!" />
      </OnClick>
      Submit
    </Button>
  </If>
</If>`,
        concepts: ['If', 'Var', 'TInput'],
        tips: [
          'Use contains operator to check if strings include substrings',
          'Computed variables can access .length property',
          'Nest If components to create AND conditions',
          'lessThan and greaterThanOrEqual work with numbers'
        ]
      }
    ],
    summary: 'Conditional logic lets you create dynamic, responsive templates that adapt to user input and state changes. Master If and Switch to build sophisticated UIs! NEW: You can now combine multiple conditions (and/or with comparison operators) in a single If tag, making complex logic more readable.',
    nextTutorial: 'loops-and-lists',
    relatedComponents: ['if', 'switch', 'toggle', 'cycle']
  },

  // Tutorial 5: Loops and Lists
  {
    id: 'tutorial-5',
    slug: 'loops-and-lists',
    title: 'Loops and Lists',
    description: 'Work with arrays, iterate over data, and build dynamic lists',
    difficulty: 'intermediate',
    estimatedTime: '25 minutes',
    icon: '',
    color: 'bg-yellow-200',
    hoverColor: 'hover:bg-yellow-100',
    learningObjectives: [
      'Iterate over arrays with ForEach',
      'Add and remove items from lists',
      'Access array items by index',
      'Build a complete todo list',
      'Understand Break and Continue'
    ],
    prerequisites: ['conditional-logic'],
    steps: [
      {
        id: 'step-1',
        title: 'Creating Arrays',
        explanation: 'Arrays store lists of items. Start with an empty array or provide initial values. Use .length to count items.',
        code: `<Var name="fruits" type="array" initial='["Apple", "Banana", "Orange"]' />
<Var name="todos" type="array" initial="[]" />
<Var name="fruitCount" type="computed" expression="$vars.fruits.length" />
<Var name="todoCount" type="computed" expression="$vars.todos.length" />

<p>Fruit count: <ShowVar name="fruitCount" /></p>
<p>Todo count: <ShowVar name="todoCount" /></p>`,
        concepts: ['Var']
      },
      {
        id: 'step-2',
        title: 'Adding Items with Push',
        explanation: 'Use Push to add items to the end of an array.',
        code: `<Var name="items" type="array" initial="[]" />
<Var name="newItem" type="string" initial="" />
<Var name="itemCount" type="computed" expression="$vars.items.length" />

<TInput var="newItem" placeholder="Enter an item" />
<Button>
  <OnClick>
    <Push var="items" expression="$vars.newItem" />
    <Set var="newItem" value="" />
  </OnClick>
  Add Item
</Button>

<p>Total items: <ShowVar name="itemCount" /></p>`,
        concepts: ['Push', 'Set', 'Var', 'ShowVar'],
        tips: [
          'Use expression="$vars.varName" to push a variable\'s value',
          'Use value="literal" to push a literal string/number',
          'Computed variables automatically update when dependencies change'
        ]
      },
      {
        id: 'step-3',
        title: 'Displaying Lists with ForEach',
        explanation: 'ForEach iterates over arrays and renders content for each item.',
        code: `<Var name="colors" type="array" initial='["red", "blue", "green"]' />

<ul>
  <ForEach var="colors" item="color" index="i">
    <li>
      Color #<ShowVar name="i" />: <ShowVar name="color" />
    </li>
  </ForEach>
</ul>`,
        concepts: ['ForEach'],
        tips: [
          'item defines the variable name for each element',
          'index provides the array position (0-based)',
          'Both item and index are available inside ForEach'
        ]
      },
      {
        id: 'step-4',
        title: 'Removing Items',
        explanation: 'Use RemoveAt to delete items by their index.',
        code: `<Var name="tasks" type="array" initial='["Buy milk", "Walk dog", "Code"]' />

<ul>
  <ForEach var="tasks" item="task" index="idx">
    <li>
      <ShowVar name="task" />
      <Button>
        <OnClick>
          <RemoveAt var="tasks" index="{idx}" />
        </OnClick>
        Delete
      </Button>
    </li>
  </ForEach>
</ul>`,
        concepts: ['RemoveAt', 'ForEach'],
        tips: [
          'Use index="{varName}" syntax (e.g., index="{idx}") to pass loop variables as attribute values',
          'This {varName} syntax in attributes is different from <ShowVar /> - it passes the value directly',
          'RemoveAt modifies the array in place'
        ]
      },
      {
        id: 'step-5',
        title: 'Getting Items by Index',
        explanation: 'Use array indexing syntax to retrieve a specific item from an array.',
        code: `<Var name="players" type="array" initial='["Alice", "Bob", "Charlie"]' />
<Var name="selectedIndex" type="number" initial="0" />
<Var name="selectedPlayer" type="computed" expression="$vars.players[$vars.selectedIndex]" />

<Slider var="selectedIndex" min="0" max="2" step="1" />
<p>Selected player: <ShowVar name="selectedPlayer" /></p>`,
        concepts: ['Var', 'Slider', 'ShowVar'],
        tips: [
          'Use array[index] syntax to access array items by index',
          'Computed variables update automatically when dependencies change',
          'Returns undefined if index is out of bounds'
        ]
      },
      {
        id: 'step-6',
        title: 'Complete Todo List',
        explanation: 'Let\'s combine everything into a fully functional todo list!',
        code: `<Var name="todos" type="array" initial="[]" />
<Var name="newTodo" type="string" initial="" />
<Var name="todoCount" type="computed" expression="$vars.todos.length" />

<div>
  <h3>My Todo List (<ShowVar name="todoCount" />)</h3>

  <TInput var="newTodo" placeholder="What needs to be done?" />
  <Button>
    <OnClick>
      <If condition="$vars.newTodo">
        <Push var="todos" expression="$vars.newTodo" />
        <Set var="newTodo" value="" />
        <ShowToast message="Todo added!" />
      </If>
    </OnClick>
    Add Todo
  </Button>

  <If condition="$vars.todoCount" equals="0">
    <p>No todos yet. Add one above!</p>
  </If>

  <ul>
    <ForEach var="todos" item="todo" index="idx">
      <li>
        <ShowVar name="todo" />
        <Button>
          <OnClick>
            <RemoveAt var="todos" index="{idx}" />
            <ShowToast message="Todo removed!" />
          </OnClick>
          Complete
        </Button>
      </li>
    </ForEach>
  </ul>
</div>`,
        concepts: ['ForEach', 'Push', 'RemoveAt', 'Get', 'If'],
        tips: [
          'Combine arrays with conditionals for rich UIs',
          'Always validate input before adding to arrays',
          'Use .length in computed variables for dynamic counts'
        ]
      }
    ],
    summary: 'You can now build dynamic lists and iterate over data! Arrays and ForEach are essential for displaying collections, building todo lists, and managing dynamic content.',
    nextTutorial: 'collection-operations',
    relatedComponents: ['foreach', 'push', 'pop', 'removeat', 'get']
  },

  // Tutorial 6: Collection Operations
  {
    id: 'tutorial-6',
    slug: 'collection-operations',
    title: 'Collection Operations',
    description: 'Master advanced array operations like filtering, sorting, and transforming data',
    difficulty: 'advanced',
    estimatedTime: '30 minutes',
    icon: '',
    color: 'bg-red-200',
    hoverColor: 'hover:bg-red-100',
    learningObjectives: [
      'Filter arrays based on conditions',
      'Sort arrays by different criteria',
      'Transform array items',
      'Find items in arrays',
      'Calculate sums and aggregates',
      'Build a searchable product catalog'
    ],
    prerequisites: ['loops-and-lists'],
    steps: [
      {
        id: 'step-1',
        title: 'Filtering Arrays',
        explanation: 'Filter is an action component that creates a new array containing only items that match a condition. Use it inside button clicks.',
        code: `<Var name="numbers" type="array" initial="[1, 5, 10, 15, 20, 25, 30]" />
<Var name="filtered" type="array" initial="[]" />

<p>Original: <ShowVar name="numbers" /></p>

<Button>
  <OnClick>
    <Filter var="numbers" target="filtered" where="item > 10" />
    <ShowToast message="Filtered numbers > 10!" />
  </OnClick>
  Filter Numbers (> 10)
</Button>

<p>Filtered: <ShowVar name="filtered" /></p>`,
        concepts: ['Filter', 'Button', 'OnClick'],
        tips: [
          '⚠️ IMPORTANT: Filter is an ACTION component - must be used inside event handlers (OnClick, OnChange, OnMount, OnInterval, Sequence)',
          'Actions cannot be used directly in the template - they must be triggered by events',
          'Use var for source array and target for result',
          'Condition expression uses "item" to reference each array element',
          'Returns a new array - original is unchanged'
        ]
      },
      {
        id: 'step-2',
        title: 'Sorting Arrays',
        explanation: 'Sort is an action component that arranges array items in ascending or descending order. Trigger it when the user changes sort order.',
        code: `<Var name="prices" type="array" initial="[25, 10, 50, 5, 100]" />
<Var name="sortOrder" type="string" initial="asc" />
<Var name="sorted" type="array" initial="[]" />

<p>Sort Order: <ShowVar name="sortOrder" /></p>

<RadioGroup var="sortOrder">
  <OnChange>
    <Sort var="prices" target="sorted" by="item" order-var="sortOrder" />
  </OnChange>
  <Radio value="asc">Low to High</Radio>
  <Radio value="desc">High to Low</Radio>
</RadioGroup>

<p>Original: <ShowVar name="prices" /></p>
<p>Sorted: <ShowVar name="sorted" /></p>`,
        concepts: ['Sort', 'RadioGroup', 'OnChange'],
        tips: [
          'Sort is an ACTION component - must be used inside event handlers',
          'Use order-var="variableName" for dynamic sorting',
          'by="item" sorts the items directly (for arrays of primitives)',
          'Accepts "asc" (ascending) or "desc" (descending)',
          'Works with numbers and strings'
        ]
      },
      {
        id: 'step-3',
        title: 'Transforming Arrays',
        explanation: 'Transform is an action component that maps over an array, applying an expression to each item.',
        code: `<Var name="prices" type="array" initial="[10, 20, 30, 40]" />
<Var name="taxRate" type="number" initial="0.1" />
<Var name="withTax" type="array" initial="[]" />

<p>Original prices: <ShowVar name="prices" /></p>
<p>Tax rate: <ShowVar name="taxRate" /></p>

<Button>
  <OnClick>
    <Transform var="prices" target="withTax" expression="item * (1 + taxRate)" />
    <ShowToast message="Applied tax!" />
  </OnClick>
  Apply Tax
</Button>

<p>With tax: <ShowVar name="withTax" /></p>`,
        concepts: ['Transform', 'Button', 'OnClick'],
        tips: [
          'Transform is an ACTION component - must be used inside event handlers',
          'Expression uses "item" to reference each array element',
          'Can access template variables in the expression',
          'Creates a new array with modified values'
        ]
      },
      {
        id: 'step-4',
        title: 'Finding Items',
        explanation: 'Find is an action component that returns the first item matching a condition.',
        code: `<Var name="users" type="array" initial='[{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}, {"id": 3, "name": "Charlie"}]' />
<Var name="searchId" type="number" initial="2" />
<Var name="found" type="object" initial="{}" />

<Slider var="searchId" min="1" max="3" step="1" />
<p>Search for ID: <ShowVar name="searchId" /></p>

<Button>
  <OnClick>
    <Find var="users" target="found" where="item.id == searchId" />
  </OnClick>
  Search
</Button>

<p>Found: <ShowVar name="found" /></p>`,
        concepts: ['Find', 'Slider', 'Button'],
        tips: [
          'Find is an ACTION component - must be used inside event handlers',
          'Use var for source array and target for result',
          'Returns the first matching item',
          'Returns undefined if no match found'
        ]
      },
      {
        id: 'step-5',
        title: 'Calculating Sums',
        explanation: 'Sum is an action component that adds up all numbers in an array.',
        code: `<Var name="cart" type="array" initial="[10.99, 25.50, 5.00, 15.00]" />
<Var name="total" type="number" initial="0" />
<Var name="itemCount" type="computed" expression="$vars.cart.length" />

<p>Items in cart: <ShowVar name="itemCount" /></p>
<p>Cart: <ShowVar name="cart" /></p>

<Button>
  <OnClick>
    <Sum var="cart" target="total" />
    <ShowToast message="Calculated total!" />
  </OnClick>
  Calculate Total
</Button>

<p>Total: $<ShowVar name="total" /></p>`,
        concepts: ['Sum', 'Button', 'OnClick']
      },
      {
        id: 'step-6',
        title: 'Product Catalog Example',
        explanation: 'Build a searchable and sortable product catalog using action components!',
        code: `<Var name="products" type="array" initial='[
  {"name": "Laptop", "price": 999, "category": "Electronics"},
  {"name": "Mouse", "price": 25, "category": "Electronics"},
  {"name": "Desk", "price": 299, "category": "Furniture"},
  {"name": "Chair", "price": 199, "category": "Furniture"}
]' />

<Var name="searchTerm" type="string" initial="" />
<Var name="sortBy" type="string" initial="asc" />
<Var name="filtered" type="array" initial='[
  {"name": "Laptop", "price": 999, "category": "Electronics"},
  {"name": "Mouse", "price": 25, "category": "Electronics"},
  {"name": "Desk", "price": 299, "category": "Furniture"},
  {"name": "Chair", "price": 199, "category": "Furniture"}
]' />
<Var name="resultCount" type="computed" expression="$vars.filtered.length" />

<div>
  <h3>Product Catalog</h3>

  <TInput var="searchTerm" placeholder="Search products..." />

  <RadioGroup var="sortBy">
    <Radio value="asc">Price: Low to High</Radio>
    <Radio value="desc">Price: High to Low</Radio>
  </RadioGroup>

  <Button>
    <OnClick>
      <If condition="$vars.searchTerm" notEquals="">
        <Filter var="products" target="filtered" where="item.name.toLowerCase().includes($vars.searchTerm.toLowerCase())" />
      </If>
      <If condition="$vars.searchTerm" equals="">
        <Set var="filtered" expression="$vars.products" />
      </If>
      <Sort var="filtered" target="filtered" by="item.price" order-var="sortBy" />
      <ShowToast message="Updated catalog!" />
    </OnClick>
    Apply Filters
  </Button>

  <p>Showing <ShowVar name="resultCount" /> products</p>

  <ul>
    <ForEach var="filtered" item="product" index="i">
      <li>
        <strong>{product.name}</strong>
        - \${product.price}
        ({product.category})
      </li>
    </ForEach>
  </ul>
</div>`,
        concepts: ['Filter', 'Sort', 'ForEach', 'If'],
        tips: [
          'Collection operations are ACTIONS - trigger them with buttons',
          'Use If to conditionally apply filters',
          'Can reuse target variable for chaining (filter, then sort)',
          'Inside ForEach loops, use {item.property} syntax (e.g., {product.name}) to display object properties',
          'For regular variables, use <ShowVar name="varName" /> component instead'
        ]
      }
    ],
    summary: 'You\'ve mastered advanced collection operations! These tools let you build powerful search, filter, and sort functionality for any data-driven template.',
    nextTutorial: 'timing-and-sequences',
    relatedComponents: ['filter', 'sort', 'transform', 'find', 'count', 'sum', 'extract']
  },

  // Tutorial 7: Timing and Sequences
  {
    id: 'tutorial-7',
    slug: 'timing-and-sequences',
    title: 'Timing and Sequences',
    description: 'Create animations, countdowns, and time-based interactions',
    difficulty: 'advanced',
    estimatedTime: '25 minutes',
    icon: '',
    color: 'bg-red-200',
    hoverColor: 'hover:bg-red-100',
    learningObjectives: [
      'Use OnInterval for repeated actions',
      'Create delays with Delay',
      'Chain actions with Sequence',
      'Build countdown timers',
      'Create animations and transitions'
    ],
    prerequisites: ['conditional-logic'],
    steps: [
      {
        id: 'step-1',
        title: 'Basic Intervals',
        explanation: 'OnInterval runs actions repeatedly at a specified interval (in milliseconds).',
        code: `<Var name="seconds" type="number" initial="0" />

<OnInterval interval="1000">
  <Increment var="seconds" />
</OnInterval>

<p>Elapsed seconds: <ShowVar name="seconds" /></p>`,
        concepts: ['OnInterval', 'Increment'],
        tips: [
          'Interval is in milliseconds (1000 = 1 second)',
          'OnInterval starts automatically when the template loads'
        ]
      },
      {
        id: 'step-2',
        title: 'Start/Stop Intervals',
        explanation: 'Control intervals by wrapping actions in If components to conditionally execute them.',
        code: `<Var name="isRunning" type="boolean" initial="false" />
<Var name="count" type="number" initial="0" />

<OnInterval interval="1000">
  <If condition="$vars.isRunning">
    <Increment var="count" />
  </If>
</OnInterval>

<Button>
  <OnClick>
    <Toggle var="isRunning" />
  </OnClick>
  <If condition="$vars.isRunning">Stop</If>
  <If not="$vars.isRunning">Start</If>
</Button>

<p>Count: <ShowVar name="count" /></p>`,
        concepts: ['OnInterval', 'Toggle', 'If'],
        tips: [
          'Wrap interval actions in If to conditionally execute them',
          'Perfect for stopwatches and timers'
        ]
      },
      {
        id: 'step-3',
        title: 'Delays',
        explanation: 'Delay pauses execution before running the next action. Wrap actions in Sequence to ensure proper sequential execution with delays.',
        code: `<Var name="message" type="string" initial="" />

<Button>
  <OnClick>
    <Sequence>
      <Set var="message" value="Starting..." />
      <Delay milliseconds="1000" />
      <Set var="message" value="Loading..." />
      <Delay milliseconds="1000" />
      <Set var="message" value="Complete!" />
    </Sequence>
  </OnClick>
  Start Process
</Button>

<p><ShowVar name="message" /></p>`,
        concepts: ['Sequence', 'Delay', 'Set'],
        tips: [
          'Wrap actions with delays in a Sequence component',
          'Use milliseconds prop for delays (1000 = 1 second)',
          'Actions execute in order, waiting for each delay to complete'
        ]
      },
      {
        id: 'step-4',
        title: 'Sequences',
        explanation: 'Sequence explicitly chains actions, running them one after another.',
        code: `<Var name="step" type="number" initial="0" />

<Button>
  <OnClick>
    <Sequence>
      <Set var="step" value="1" />
      <Delay milliseconds="500" />
      <Set var="step" value="2" />
      <Delay milliseconds="500" />
      <Set var="step" value="3" />
      <Delay milliseconds="500" />
      <Set var="step" value="0" />
    </Sequence>
  </OnClick>
  Animate
</Button>

<p>Current step: <ShowVar name="step" /></p>`,
        concepts: ['Sequence', 'Delay'],
        tips: [
          'Sequence ensures actions run in order',
          'Combine with Delay for animations'
        ]
      },
      {
        id: 'step-5',
        title: 'Countdown Timer',
        explanation: 'Let\'s build a countdown timer with start, pause, and reset controls!',
        code: `<Var name="timeLeft" type="number" initial="60" />
<Var name="isRunning" type="boolean" initial="false" />
<Var name="isFinished" type="computed" expression="timeLeft <= 0" />
<Var name="shouldTick" type="computed" expression="isRunning && !isFinished" />

<OnInterval interval="1000">
  <If condition="$vars.shouldTick">
    <Decrement var="timeLeft" />
    <If condition="$vars.isFinished">
      <Set var="isRunning" value="false" />
      <ShowToast message="Time's up!" />
    </If>
  </If>
</OnInterval>

<div>
  <h3>Countdown Timer</h3>
  <p style="font-size: 48px; font-weight: bold">
    <ShowVar name="timeLeft" /> seconds
  </p>

  <If not="$vars.isFinished">
    <Button>
      <OnClick>
        <Toggle var="isRunning" />
      </OnClick>
      <If condition="$vars.isRunning">Pause</If>
      <If not="$vars.isRunning">Start</If>
    </Button>
  </If>

  <Button>
    <OnClick>
      <Set var="timeLeft" value="60" />
      <Set var="isRunning" value="false" />
    </OnClick>
    Reset
  </Button>

  <If condition="$vars.isFinished">
    <p style="color: red; font-weight: bold">⏰ Time's Up!</p>
  </If>
</div>`,
        concepts: ['OnInterval', 'Decrement', 'If', 'Toggle', 'Set'],
        tips: [
          'Use computed variables for complex conditions (isRunning && !isFinished)',
          'Computed variables make your logic cleaner and easier to understand',
          'Wrap OnInterval actions in If for conditional execution'
        ]
      },
      {
        id: 'step-6',
        title: 'Loading Animation',
        explanation: 'Create a multi-step loading animation with Sequence and Delay.',
        code: `<Var name="loadingStage" type="string" initial="idle" />
<Var name="dots" type="string" initial="" />

<Button>
  <OnClick>
    <Sequence>
      <Set var="loadingStage" value="Connecting" />
      <Set var="dots" value="." />
      <Delay milliseconds="500" />
      <Set var="dots" value=".." />
      <Delay milliseconds="500" />
      <Set var="dots" value="..." />
      <Delay milliseconds="500" />

      <Set var="loadingStage" value="Loading data" />
      <Set var="dots" value="." />
      <Delay milliseconds="500" />
      <Set var="dots" value=".." />
      <Delay milliseconds="500" />
      <Set var="dots" value="..." />
      <Delay milliseconds="500" />

      <Set var="loadingStage" value="Complete" />
      <Set var="dots" value="!" />
      <ShowToast message="All done!" />
    </Sequence>
  </OnClick>
  Start Loading
</Button>

<p><ShowVar name="loadingStage" /><ShowVar name="dots" /></p>`,
        concepts: ['Sequence', 'Delay', 'Set', 'ShowToast'],
        tips: [
          'Sequences are great for multi-step animations',
          'Use small delays (300-500ms) for smooth transitions',
          'Visual feedback improves user experience'
        ]
      }
    ],
    summary: 'You can now create time-based interactions, animations, and countdowns! OnInterval, Delay, and Sequence are powerful tools for dynamic, engaging templates.',
    nextTutorial: 'advanced-state-management',
    relatedComponents: ['oninterval', 'delay', 'sequence', 'timeout']
  },

  // Tutorial 8: Advanced State Management
  {
    id: 'tutorial-8',
    slug: 'advanced-state-management',
    title: 'Advanced State Management',
    description: 'Master complex state with objects, nested data, and advanced patterns',
    difficulty: 'advanced',
    estimatedTime: '35 minutes',
    icon: '',
    color: 'bg-red-200',
    hoverColor: 'hover:bg-red-100',
    learningObjectives: [
      'Work with object variables',
      'Extract properties from objects',
      'Merge and clone objects',
      'Update nested object properties',
      'Build a user profile editor',
      'Manage complex state structures'
    ],
    prerequisites: ['collection-operations'],
    steps: [
      {
        id: 'step-1',
        title: 'Object Variables',
        explanation: 'Objects store structured data with named properties.',
        code: `<Var name="user" type="object" initial='{"name": "Alice", "age": 25, "email": "alice@example.com"}' />

<p>User object: <ShowVar name="user" /></p>`,
        concepts: ['Var'],
        tips: [
          'Objects use JSON syntax',
          'Can contain strings, numbers, booleans, arrays, and nested objects',
          'Use double quotes for property names'
        ]
      },
      {
        id: 'step-2',
        title: 'Extracting Properties',
        explanation: 'Extract pulls properties from an object into variables using Property children.',
        code: `<Var name="user" type="object" initial='{"name": "Bob", "age": 30}' />

<Extract from="user">
  <Property path="name" as="userName" />
  <Property path="age" as="userAge" />
</Extract>

<p>Name: <ShowVar name="userName" /></p>
<p>Age: <ShowVar name="userAge" /></p>`,
        concepts: ['Extract', 'Property'],
        tips: [
          'Extract creates variables from object properties',
          'Property defines what to extract with path and as props',
          'Can extract nested properties with dot notation (e.g., path="address.city")'
        ]
      },
      {
        id: 'step-3',
        title: 'Nested Properties',
        explanation: 'Extract can access nested properties using dot notation in the path.',
        code: `<Var name="user" type="object" initial='{"name": "Charlie", "address": {"city": "Portland", "state": "OR"}}' />

<Extract from="user">
  <Property path="name" as="userName" />
  <Property path="address.city" as="userCity" />
  <Property path="address.state" as="userState" />
</Extract>

<p>Name: <ShowVar name="userName" /></p>
<p>Location: <ShowVar name="userCity" />, <ShowVar name="userState" /></p>`,
        concepts: ['Extract', 'Property'],
        tips: [
          'Use dot notation for nested properties (e.g., "address.city")',
          'Works with any depth of nesting',
          'Great for working with complex data structures'
        ]
      },
      {
        id: 'step-4',
        title: 'Updating Object Properties',
        explanation: 'ObjectSet updates a property in an object.',
        code: `<Var name="settings" type="object" initial='{"theme": "light", "notifications": true}' />
<Var name="newTheme" type="string" initial="dark" />

<Extract from="settings">
  <Property path="theme" as="currentTheme" />
</Extract>

<Button>
  <OnClick>
    <ObjectSet var="settings" path="theme" expression="$vars.newTheme" />
    <ShowToast message="Theme updated!" />
  </OnClick>
  Change Theme to Dark
</Button>

<p>Current theme: <ShowVar name="currentTheme" /></p>`,
        concepts: ['ObjectSet', 'Extract', 'Property'],
        tips: [
          'Use value for literal values',
          'Use expression with $vars.varName to use a variable\'s value',
          '⚠️ IMPORTANT: ObjectSet creates a NEW object (immutable update) - the original object is not modified directly'
        ]
      },
      {
        id: 'step-5',
        title: 'Merging Objects',
        explanation: 'Merge combines two objects, with later sources overwriting matching properties.',
        code: `<Var name="defaults" type="object" initial='{"color": "blue", "size": "medium", "quantity": 1}' />
<Var name="overrides" type="object" initial='{"color": "red", "quantity": 5}' />
<Var name="merged" type="object" initial="{}" />

<OnMount>
  <Merge sources="defaults,overrides" target="merged" />
</OnMount>

<p>Merged: <ShowVar name="merged" /></p>
<p>Result: color=red, size=medium, quantity=5</p>`,
        concepts: ['Merge', 'OnMount'],
        tips: [
          'Later sources override earlier ones in the sources list',
          'Great for applying defaults with custom values',
          'Use OnMount to merge automatically when template loads'
        ]
      },
      {
        id: 'step-6',
        title: 'Cloning Objects',
        explanation: 'Clone creates an independent copy of an object. Changes to one don\'t affect the other!',
        code: `<Var name="original" type="object" initial='{"name": "Original", "count": 0}' />
<Var name="copy" type="object" initial="{}" />

<OnMount>
  <Clone var="original" target="copy" />
</OnMount>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px">
  <div>
    <h4>Original Object</h4>
    <p>Count: <ShowVar name="original" /></p>
    <Button>
      <OnClick>
        <ObjectSet var="original" path="count" expression="$vars.original.count + 1" />
      </OnClick>
      Increment Original
    </Button>
  </div>

  <div>
    <h4>Cloned Copy</h4>
    <p>Count: <ShowVar name="copy" /></p>
    <Button>
      <OnClick>
        <ObjectSet var="copy" path="count" expression="$vars.copy.count + 1" />
      </OnClick>
      Increment Copy
    </Button>
  </div>
</div>

<p style="margin-top: 20px; padding: 10px; background: #f0f0f0">
  <strong>Notice:</strong> Each button only affects its own object. They are independent!
</p>`,
        concepts: ['Clone', 'OnMount', 'ObjectSet'],
        tips: [
          'Clone creates an independent copy - changes to one don\'t affect the other',
          'Without Clone, both variables would point to the same object',
          'Essential for maintaining separate state'
        ]
      },
      {
        id: 'step-7',
        title: 'User Profile Editor',
        explanation: 'Let\'s build a complete user profile editor with nested objects!',
        code: `<Var name="profile" type="object" initial='{
  "name": "Alex Smith",
  "email": "alex@example.com",
  "age": 28,
  "preferences": {
    "theme": "dark",
    "notifications": true,
    "language": "en"
  }
}' persist="true" />

<Var name="editName" type="string" initial="" />
<Var name="editEmail" type="string" initial="" />
<Var name="editAge" type="number" initial="18" />
<Var name="editTheme" type="string" initial="dark" />
<Var name="editNotifications" type="boolean" initial="true" />

<div>
  <h3>User Profile Editor</h3>

  <Extract from="profile">
    <Property path="name" as="currentName" />
    <Property path="email" as="currentEmail" />
    <Property path="age" as="currentAge" />
    <Property path="preferences.theme" as="currentTheme" />
    <Property path="preferences.notifications" as="currentNotifications" />
  </Extract>

  <div style="border: 2px solid #000; padding: 20px; margin: 20px 0">
    <h4>Current Profile</h4>
    <p><strong>Name:</strong> <ShowVar name="currentName" /></p>
    <p><strong>Email:</strong> <ShowVar name="currentEmail" /></p>
    <p><strong>Age:</strong> <ShowVar name="currentAge" /></p>
    <p><strong>Theme:</strong> <ShowVar name="currentTheme" /></p>
    <p><strong>Notifications:</strong> <ShowVar name="currentNotifications" /></p>
  </div>

  <h4>Edit Basic Info</h4>

  <label>Name</label>
  <TInput var="editName" placeholder="Enter new name" />
  <Button>
    <OnClick>
      <If condition="$vars.editName">
        <ObjectSet var="profile" path="name" expression="$vars.editName" />
        <Set var="editName" value="" />
        <ShowToast message="Name updated!" />
      </If>
    </OnClick>
    Update Name
  </Button>

  <label>Email</label>
  <TInput var="editEmail" placeholder="Enter new email" />
  <Button>
    <OnClick>
      <If condition="$vars.editEmail">
        <ObjectSet var="profile" path="email" expression="$vars.editEmail" />
        <Set var="editEmail" value="" />
        <ShowToast message="Email updated!" />
      </If>
    </OnClick>
    Update Email
  </Button>

  <label>Age: <ShowVar name="editAge" /></label>
  <Slider var="editAge" min="13" max="100" step="1" />
  <Button>
    <OnClick>
      <ObjectSet var="profile" path="age" expression="$vars.editAge" />
      <ShowToast message="Age updated!" />
    </OnClick>
    Update Age
  </Button>

  <h4>Preferences</h4>

  <label>Theme</label>
  <RadioGroup var="editTheme">
    <Radio value="light">Light</Radio>
    <Radio value="dark">Dark</Radio>
  </RadioGroup>
  <Button>
    <OnClick>
      <ObjectSet var="profile" path="preferences.theme" expression="$vars.editTheme" />
      <ShowToast message="Theme updated!" />
    </OnClick>
    Save Theme
  </Button>

  <label>
    <Checkbox var="editNotifications" />
    Enable notifications
  </label>
  <Button>
    <OnClick>
      <ObjectSet var="profile" path="preferences.notifications" expression="$vars.editNotifications" />
      <ShowToast message="Notifications updated!" />
    </OnClick>
    Save Notifications
  </Button>

  <Button>
    <OnClick>
      <Set var="profile" value='{
        "name": "Alex Smith",
        "email": "alex@example.com",
        "age": 28,
        "preferences": {
          "theme": "dark",
          "notifications": true,
          "language": "en"
        }
      }' />
      <ShowToast message="Profile reset to defaults!" />
    </OnClick>
    Reset to Defaults
  </Button>
</div>`,
        concepts: ['Extract', 'ObjectSet', 'Property', 'Var', 'TInput', 'Slider', 'RadioGroup', 'Checkbox', 'If'],
        tips: [
          'Extract nested properties by first extracting parent object',
          'Use temp variables when updating nested properties',
          'Persist complex objects to save user data',
          'Validate input before updating objects',
          'Provide feedback with ShowToast'
        ]
      }
    ],
    summary: 'You\'ve mastered complex state management with objects! You can now build sophisticated templates with structured data, nested properties, and advanced state patterns. You\'re ready to build anything!',
    relatedComponents: ['extract', 'property', 'objectset', 'merge', 'clone']
  }
];

// Helper functions to get tutorials
export function getTutorialBySlug(slug: string): Tutorial | undefined {
  return tutorials.find(t => t.slug === slug);
}

export function getAllTutorialSlugs(): string[] {
  return tutorials.map(t => t.slug);
}

export function getTutorialsByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): Tutorial[] {
  return tutorials.filter(t => t.difficulty === difficulty);
}
