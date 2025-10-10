// Component registry for user templates - Main barrel file
// This file has been decomposed into multiple files for better maintainability
// See: P2.1 File Decomposition (TEMPLATE_SYSTEM_NEXT_STEPS.md)

// Re-export all types and validation utilities
export type {
  PropType,
  PropSchema,
  ComponentRelationship,
  ComponentRegistration,
  StandardizedComponentRegistration,
} from './template-registry-types';

export {
  validateAndCoerceProp,
  validateAndCoerceProps,
  validateStandardizedProps,
} from './template-registry-types';

// Re-export the ComponentRegistry class
export { ComponentRegistry } from './template-registry-class';

// Import registration functions
import { ComponentRegistry } from './template-registry-class';
import { registerDisplayComponents } from './component-registrations-display';
import { registerConditionalComponents } from './component-registrations-conditional';
import { registerStateComponents } from './component-registrations-state';
import { registerActionComponents } from './component-registrations-actions';
import { registerEventComponents } from './component-registrations-events';

// Create the default registry instance
export const componentRegistry = new ComponentRegistry();

// Register all components by category
registerDisplayComponents(componentRegistry);
registerConditionalComponents(componentRegistry);
registerStateComponents(componentRegistry);
registerActionComponents(componentRegistry);
registerEventComponents(componentRegistry);
