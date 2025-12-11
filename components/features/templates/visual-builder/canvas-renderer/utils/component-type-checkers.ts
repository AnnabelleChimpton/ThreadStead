/**
 * Component type checking utilities for canvas renderer
 */

import { componentRegistry } from '@/lib/templates/core/template-registry';

/**
 * Check if a component is a container component that can accept children
 */
export function isContainerComponent(componentType: string): boolean {
  // PHASE 4.3: Explicit list of known container components (defensive check)
  // Note: Tabs is included because it has relationship.type='parent' (not 'container')
  // but still needs to accept Tab children in the Visual Builder
  const knownContainers = ['FlexContainer', 'GridLayout', 'Grid', 'GridItem', 'SplitLayout', 'CenteredBox',
                           'GradientBox', 'NeonBorder', 'RetroTerminal', 'PolaroidFrame', 'Tabs'];

  if (knownContainers.includes(componentType)) {
    return true;
  }

  // Fallback to registry check for other components
  const registration = componentRegistry.get(componentType);
  const acceptsChildren = registration?.relationship?.acceptsChildren;
  const isContainer = registration?.relationship?.type === 'container' &&
                     (acceptsChildren === true || Array.isArray(acceptsChildren));

  return isContainer;
}

/**
 * Check if a component is a text component
 */
export function isTextComponent(componentType: string): boolean {
  const registration = componentRegistry.get(componentType);
  return registration?.relationship?.type === 'text';
}
