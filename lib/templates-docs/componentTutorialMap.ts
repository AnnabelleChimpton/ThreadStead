// Component to Tutorial Mapping
// Generates reverse lookup: which tutorials feature each component

import { tutorials, Tutorial } from './tutorialContent';

export interface ComponentTutorialInfo {
  tutorial: Tutorial;
  appearsInSteps: number[]; // Step numbers where component is mentioned
  isRelatedComponent: boolean; // Listed in tutorial.relatedComponents
}

/**
 * Build a map of component IDs to the tutorials that feature them
 */
export function buildComponentTutorialMap(): Map<string, ComponentTutorialInfo[]> {
  const map = new Map<string, ComponentTutorialInfo[]>();

  tutorials.forEach((tutorial) => {
    // Track which components are mentioned in this tutorial
    const componentSteps = new Map<string, number[]>();

    // 1. Extract from step concepts (component names used in examples)
    tutorial.steps.forEach((step, index) => {
      step.concepts.forEach((componentName) => {
        const componentId = componentName.toLowerCase();
        if (!componentSteps.has(componentId)) {
          componentSteps.set(componentId, []);
        }
        componentSteps.get(componentId)!.push(index + 1); // 1-indexed step numbers
      });
    });

    // 2. Add components from relatedComponents list
    tutorial.relatedComponents.forEach((componentId) => {
      if (!componentSteps.has(componentId)) {
        componentSteps.set(componentId, []);
      }
    });

    // 3. Add to global map
    componentSteps.forEach((steps, componentId) => {
      if (!map.has(componentId)) {
        map.set(componentId, []);
      }

      map.get(componentId)!.push({
        tutorial,
        appearsInSteps: steps,
        isRelatedComponent: tutorial.relatedComponents.includes(componentId),
      });
    });
  });

  return map;
}

/**
 * Get all tutorials that feature a specific component
 */
export function getTutorialsForComponent(componentId: string): ComponentTutorialInfo[] {
  const map = buildComponentTutorialMap();
  return map.get(componentId.toLowerCase()) || [];
}

/**
 * Get a human-readable summary of where a component appears
 */
export function getComponentAppearanceSummary(componentId: string): string {
  const tutorials = getTutorialsForComponent(componentId);

  if (tutorials.length === 0) {
    return 'Not featured in any tutorials yet';
  }

  if (tutorials.length === 1) {
    const tutorial = tutorials[0];
    if (tutorial.appearsInSteps.length > 0) {
      return `Featured in "${tutorial.tutorial.title}" (Step${tutorial.appearsInSteps.length > 1 ? 's' : ''} ${tutorial.appearsInSteps.join(', ')})`;
    }
    return `Related to "${tutorial.tutorial.title}"`;
  }

  return `Featured in ${tutorials.length} tutorial${tutorials.length > 1 ? 's' : ''}`;
}

// Pre-build the map for performance (only computed once)
const COMPONENT_TUTORIAL_MAP = buildComponentTutorialMap();

/**
 * Get cached tutorial data for a component
 */
export function getCachedTutorialsForComponent(componentId: string): ComponentTutorialInfo[] {
  return COMPONENT_TUTORIAL_MAP.get(componentId.toLowerCase()) || [];
}
