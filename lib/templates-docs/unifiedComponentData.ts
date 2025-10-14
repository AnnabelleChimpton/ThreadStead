// Unified Component Data
// Combines Visual Builder components and Template Language components into one reference

import { componentCategories as templateCategories, componentData as templateData, Component as TemplateComponent } from './componentData';
import { componentCategories as visualCategories, componentData as visualData } from '@/components/design-tutorial/componentData';

export interface UnifiedComponent {
  id: string;
  name: string;
  category: string;
  description: string;
  availableInVisualBuilder: boolean;
  codeOnly: boolean;
  isRetro: boolean;
  isInteractive: boolean;
  tags: string[];
  // Template Language component data (with defaults to ensure arrays are never undefined)
  props: any[];
  examples: any[];
  useCases: string[];
  tips?: string[];
  // Visual Builder component data
  preview?: any;
  tutorial?: string;
  example?: string;
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

export interface UnifiedCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  color?: string;
  hoverColor?: string;
}

// Map Visual Builder component data to unified format
function mapVisualComponentToUnified(component: any, categoryId: string): UnifiedComponent | null {
  const isRetro = categoryId === 'retro-components';
  const isCodeOnlyCategory = ['visual-builder', 'css-classes'].includes(categoryId);

  // Filter out tutorial/documentation items that aren't actual components
  const tutorialItems = [
    'Getting Started',
    'Component Palette',
    'Multi-Select & Bulk Editing',
    'CSS Grid System & Snapping',
    'Advanced Positioning Controls',
    'Responsive Breakpoint Preview',
    'Universal CSS Styling'
  ];

  if (tutorialItems.includes(component.name)) {
    return null;
  }

  // Auto-assign difficulty for Visual Builder components
  let difficulty: 'beginner' | 'intermediate' | 'advanced' | undefined = component.difficulty;
  if (!difficulty) {
    if (['content', 'profile', 'retro-components'].includes(categoryId)) {
      difficulty = 'beginner';
    } else if (['layout', 'media', 'interactive'].includes(categoryId)) {
      difficulty = 'intermediate';
    }
  }

  return {
    id: component.name.toLowerCase().replace(/\s+/g, '-'),
    name: component.name,
    category: categoryId,
    description: component.description || '',
    availableInVisualBuilder: !isCodeOnlyCategory,
    codeOnly: false,
    isRetro,
    isInteractive: component.props?.some((p: any) => ['onClick', 'onChange', 'onSubmit'].includes(p.name)) || false,
    tags: [
      isRetro ? 'retro' : '',
      categoryId === 'content' ? 'content' : '',
      categoryId === 'layout' ? 'layout' : '',
      categoryId === 'visual' ? 'visual' : '',
      categoryId === 'interactive' ? 'interactive' : '',
    ].filter(Boolean),
    props: component.props || [],
    examples: component.example ? [{ title: 'Example', code: component.example }] : [],
    preview: component.preview,
    tutorial: component.tutorial,
    useCases: component.useCases || [],
    difficulty,
    pairsWellWith: component.pairsWellWith,
    accessibility: component.accessibility,
    performanceNotes: component.performanceNotes,
    operators: component.operators,
  };
}

// Map Template Language component data to unified format
function mapTemplateComponentToUnified(component: TemplateComponent): UnifiedComponent {
  const codeOnlyCategories = ['state', 'actions', 'collections', 'objects', 'events', 'timing', 'conditionals', 'loops'];
  const isCodeOnly = codeOnlyCategories.includes(component.category);
  const isInteractive = ['inputs', 'actions', 'events'].includes(component.category);

  // Auto-assign difficulty based on category if not explicitly set
  let difficulty: 'beginner' | 'intermediate' | 'advanced' | undefined = component.difficulty;
  if (!difficulty) {
    if (['state', 'inputs', 'conditionals'].includes(component.category)) {
      difficulty = 'beginner';
    } else if (['actions', 'loops', 'events'].includes(component.category)) {
      difficulty = 'intermediate';
    } else if (['collections', 'objects', 'timing'].includes(component.category)) {
      difficulty = 'advanced';
    }
  }

  return {
    id: component.id,
    name: component.name,
    category: component.category,
    description: component.description,
    availableInVisualBuilder: !isCodeOnly,
    codeOnly: isCodeOnly,
    isRetro: false,
    isInteractive,
    tags: [
      isCodeOnly ? 'code-only' : '',
      isInteractive ? 'interactive' : '',
      component.category,
    ].filter(Boolean),
    props: component.props || [],
    examples: component.examples || [],
    useCases: component.useCases || [],
    tips: component.tips,
    difficulty,
    pairsWellWith: component.pairsWellWith,
    accessibility: component.accessibility,
    performanceNotes: component.performanceNotes,
    operators: component.operators,
  };
}

// Combine all categories
export const unifiedCategories: UnifiedCategory[] = [
  // Visual Builder categories
  ...visualCategories.map(cat => ({
    id: cat.id,
    title: cat.title,
    icon: cat.icon,
    description: cat.description,
  })),
  // Template Language categories (excluding duplicates)
  ...templateCategories.map(cat => ({
    id: cat.id,
    title: cat.title,
    icon: cat.icon,
    description: cat.description,
    color: cat.color,
    hoverColor: cat.hoverColor,
  })),
];

// Combine all components
export const unifiedComponentData: Record<string, UnifiedComponent[]> = {};

// Add Visual Builder components
Object.entries(visualData).forEach(([categoryId, components]) => {
  if (!unifiedComponentData[categoryId]) {
    unifiedComponentData[categoryId] = [];
  }
  components.forEach((component: any) => {
    const mappedComponent = mapVisualComponentToUnified(component, categoryId);
    if (mappedComponent) {
      unifiedComponentData[categoryId].push(mappedComponent);
    }
  });
});

// Add Template Language components
Object.entries(templateData).forEach(([categoryId, components]) => {
  if (!unifiedComponentData[categoryId]) {
    unifiedComponentData[categoryId] = [];
  }
  components.forEach((component: TemplateComponent) => {
    unifiedComponentData[categoryId].push(mapTemplateComponentToUnified(component));
  });
});

// Get all components as flat array for search/filtering
export function getAllUnifiedComponents(): Array<{ component: UnifiedComponent; categoryId: string }> {
  const allComponents: Array<{ component: UnifiedComponent; categoryId: string }> = [];

  Object.entries(unifiedComponentData).forEach(([categoryId, components]) => {
    components.forEach((component) => {
      allComponents.push({ component, categoryId });
    });
  });

  return allComponents;
}

// Filter helpers
export function filterByAvailability(components: Array<{ component: UnifiedComponent; categoryId: string }>, filter: 'all' | 'visual-builder' | 'code-only'): Array<{ component: UnifiedComponent; categoryId: string }> {
  if (filter === 'visual-builder') {
    return components.filter(item => item.component.availableInVisualBuilder);
  }
  if (filter === 'code-only') {
    return components.filter(item => item.component.codeOnly);
  }
  return components;
}
