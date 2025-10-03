/**
 * Component constraints utility
 *
 * Determines resize, drag, and aspect ratio constraints for different component types.
 *
 * Usage:
 * ```typescript
 * const constraints = getComponentConstraints('ProfilePhoto');
 * // { canResize: false, canDrag: true, fixedAspectRatio: true, description: '...' }
 * ```
 */

export interface ComponentConstraints {
  /**
   * Whether the component can be resized
   */
  canResize: boolean;

  /**
   * Whether the component can be dragged
   */
  canDrag: boolean;

  /**
   * Whether the component has a fixed aspect ratio
   */
  fixedAspectRatio: boolean;

  /**
   * Human-readable description of the constraints
   */
  description: string;
}

/**
 * Get constraints for a component type
 *
 * @param componentType - The component type string (e.g., 'ProfilePhoto', 'TextElement')
 * @returns Constraint configuration
 */
export function getComponentConstraints(componentType: string): ComponentConstraints {
  const constraints: ComponentConstraints = {
    canResize: true,
    canDrag: true,
    fixedAspectRatio: false,
    description: ''
  };

  // Components with limited sizing capabilities
  const fixedSizeComponents = ['ProfilePhoto', 'NotificationBell', 'FriendBadge', 'FollowButton'];
  const navigationComponents = ['ThreadsteadNavigation'];

  if (fixedSizeComponents.includes(componentType)) {
    constraints.canResize = false;
    constraints.fixedAspectRatio = true;
    constraints.description = 'Size controlled by properties';
  }

  if (navigationComponents.includes(componentType)) {
    constraints.canResize = false;
    constraints.canDrag = false;
    constraints.description = 'Fixed navigation bar';
  }

  return constraints;
}
