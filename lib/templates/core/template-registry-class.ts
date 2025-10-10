// ComponentRegistry class for managing template component registrations
import {
  ComponentRegistration,
  StandardizedComponentRegistration,
  ComponentRelationship,
} from './template-registry-types';
import { StandardComponentProps } from '@/lib/templates/core/standard-component-interface';

// Component registry class
export class ComponentRegistry {
  private components = new Map<string, ComponentRegistration>();
  private standardizedComponents = new Map<string, StandardizedComponentRegistration<any>>();

  // QUICK WIN #2: Size property for schema cache invalidation
  get size(): number {
    return this.components.size + this.standardizedComponents.size;
  }

  register(registration: ComponentRegistration) {
    this.components.set(registration.name, registration);
  }

  /**
   * NEW: Register standardized components using web-standard interfaces
   */
  registerStandardized<T extends StandardComponentProps>(registration: StandardizedComponentRegistration<T>) {
    this.standardizedComponents.set(registration.name, registration);
  }

  get(name: string): ComponentRegistration | undefined {
    // First try exact match
    const registration = this.components.get(name);
    if (registration) return registration;

    // Try case-insensitive match for template compatibility
    const lowerName = name.toLowerCase();
    for (const [key, value] of this.components.entries()) {
      if (key.toLowerCase() === lowerName) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * NEW: Get standardized component registration
   */
  getStandardized(name: string): StandardizedComponentRegistration | undefined {
    // First try exact match
    const registration = this.standardizedComponents.get(name);
    if (registration) return registration;

    // Try case-insensitive match for template compatibility
    const lowerName = name.toLowerCase();
    for (const [key, value] of this.standardizedComponents.entries()) {
      if (key.toLowerCase() === lowerName) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Get any component (standardized or legacy) - checks both registries
   */
  getAnyComponent(name: string): { type: 'standardized'; registration: StandardizedComponentRegistration } | { type: 'legacy'; registration: ComponentRegistration } | undefined {
    // Check standardized components first (preferred)
    const standardized = this.getStandardized(name);
    if (standardized) {
      return { type: 'standardized', registration: standardized };
    }

    // Fall back to legacy components
    const legacy = this.get(name);
    if (legacy) {
      return { type: 'legacy', registration: legacy };
    }

    return undefined;
  }

  getAllowedTags(): string[] {
    // Combine both legacy and standardized component names
    const legacyTags = Array.from(this.components.keys());
    const standardizedTags = Array.from(this.standardizedComponents.keys());
    return [...legacyTags, ...standardizedTags];
  }

  getAllowedAttributes(tagName: string): string[] {
    // First check for standardized component
    const standardized = this.getStandardized(tagName);
    if (standardized) {
      // For standardized components, return common CSS/HTML attributes
      return [
        // Standard HTML attributes
        'className', 'id', 'title', 'role', 'aria-label',
        // Standard CSS properties as props
        'backgroundColor', 'color', 'fontSize', 'fontFamily', 'fontWeight', 'textAlign',
        'padding', 'margin', 'border', 'borderRadius', 'boxShadow', 'opacity',
        'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'zIndex',
        'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
        'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow'
      ];
    }

    // Fall back to legacy component
    const registration = this.components.get(tagName);
    if (!registration) return [];
    return Object.keys(registration.props);
  }

  getAllRegistrations(): Map<string, ComponentRegistration> {
    return new Map(this.components);
  }

  // Relationship utility methods
  getRelationship(componentType: string): ComponentRelationship | undefined {
    const registration = this.get(componentType);
    return registration?.relationship;
  }

  canAcceptChild(parentType: string, childType: string): boolean {
    const parentRegistration = this.get(parentType);
    if (!parentRegistration?.relationship) return false;

    const { acceptsChildren } = parentRegistration.relationship;
    if (acceptsChildren === true) return true;
    if (Array.isArray(acceptsChildren)) {
      return acceptsChildren.includes(childType);
    }
    return false;
  }

  getValidChildTypes(parentType: string): string[] {
    const parentRegistration = this.get(parentType);
    if (!parentRegistration?.relationship) return [];

    const { acceptsChildren } = parentRegistration.relationship;
    if (acceptsChildren === true) {
      // Return all registered component types
      return this.getAllowedTags();
    }
    if (Array.isArray(acceptsChildren)) {
      return acceptsChildren;
    }
    return [];
  }

  getRequiredParent(childType: string): string | undefined {
    const childRegistration = this.get(childType);
    return childRegistration?.relationship?.requiresParent;
  }

  getDefaultChildren(parentType: string): Array<{ type: string; props: Record<string, unknown> }> {
    const parentRegistration = this.get(parentType);
    return parentRegistration?.relationship?.defaultChildren || [];
  }

  isParentComponent(componentType: string): boolean {
    const relationship = this.getRelationship(componentType);
    return relationship?.type === 'parent' || relationship?.type === 'container';
  }

  isChildComponent(componentType: string): boolean {
    const relationship = this.getRelationship(componentType);
    return relationship?.type === 'child';
  }
}
