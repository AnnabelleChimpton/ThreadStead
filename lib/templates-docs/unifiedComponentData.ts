// Unified Component Data
// Template Language components reference

import { componentCategories as templateCategories, componentData as templateData, Component as TemplateComponent } from './componentData';

export interface UnifiedComponent {
  id: string;
  name: string;
  category: string;
  description: string;
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
  // Template Language categories
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
export function filterByAvailability(components: Array<{ component: UnifiedComponent; categoryId: string }>, filter: 'all' | 'code-only'): Array<{ component: UnifiedComponent; categoryId: string }> {
  if (filter === 'code-only') {
    return components.filter(item => item.component.codeOnly);
  }
  return components;
}
