/**
 * Smart Snapping and Alignment System for Visual Builder
 * Provides component-to-component snapping, grid snapping, and alignment guides
 */

export interface SnapPoint {
  x?: number;
  y?: number;
  type: 'edge' | 'center' | 'grid';
  componentId?: string;
  edge?: 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y';
}

export interface AlignmentGuide {
  id: string;
  type: 'vertical' | 'horizontal';
  position: number; // x for vertical, y for horizontal
  start: number;
  end: number;
  componentIds: string[];
  strength: 'strong' | 'medium' | 'weak';
}

export interface ComponentBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  snapPoints: SnapPoint[];
  alignmentGuides: AlignmentGuide[];
}

export interface SnapConfig {
  enabled: boolean;
  snapDistance: number; // pixels
  componentSnapping: boolean;
  gridSnapping: boolean;
  gridSize: number;
  showGuides: boolean;
  showSnapDistance: boolean;
}

export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  enabled: true,
  snapDistance: 8, // 8px snap distance
  componentSnapping: true,
  gridSnapping: false,
  gridSize: 20,
  showGuides: true,
  showSnapDistance: true,
};

/**
 * Smart snapping utility class
 */
export class SmartSnapping {
  private config: SnapConfig;

  constructor(config: Partial<SnapConfig> = {}) {
    this.config = { ...DEFAULT_SNAP_CONFIG, ...config };
  }

  /**
   * Update snapping configuration
   */
  updateConfig(config: Partial<SnapConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get component bounds for snapping calculations
   */
  getComponentBounds(component: { id: string; x: number; y: number; width: number; height: number }): ComponentBounds {
    const { id, x, y, width, height } = component;
    return {
      id,
      x,
      y,
      width,
      height,
      centerX: x + width / 2,
      centerY: y + height / 2,
      left: x,
      right: x + width,
      top: y,
      bottom: y + height,
    };
  }

  /**
   * Generate snap points from component bounds
   */
  generateSnapPoints(bounds: ComponentBounds): SnapPoint[] {
    const snapPoints: SnapPoint[] = [];

    // Edge snap points
    snapPoints.push(
      { x: bounds.left, type: 'edge', componentId: bounds.id, edge: 'left' },
      { x: bounds.right, type: 'edge', componentId: bounds.id, edge: 'right' },
      { y: bounds.top, type: 'edge', componentId: bounds.id, edge: 'top' },
      { y: bounds.bottom, type: 'edge', componentId: bounds.id, edge: 'bottom' }
    );

    // Center snap points
    snapPoints.push(
      { x: bounds.centerX, type: 'center', componentId: bounds.id, edge: 'center-x' },
      { y: bounds.centerY, type: 'center', componentId: bounds.id, edge: 'center-y' }
    );

    return snapPoints;
  }

  /**
   * Generate grid snap points
   */
  generateGridSnapPoints(canvasWidth: number, canvasHeight: number): SnapPoint[] {
    if (!this.config.gridSnapping) return [];

    const snapPoints: SnapPoint[] = [];
    const { gridSize } = this.config;

    // Vertical grid lines
    for (let x = 0; x <= canvasWidth; x += gridSize) {
      snapPoints.push({ x, type: 'grid' });
    }

    // Horizontal grid lines
    for (let y = 0; y <= canvasHeight; y += gridSize) {
      snapPoints.push({ y, type: 'grid' });
    }

    return snapPoints;
  }

  /**
   * Calculate snapping for a moving component
   */
  calculateSnap(
    movingComponent: { x: number; y: number; width: number; height: number },
    otherComponents: Array<{ id: string; x: number; y: number; width: number; height: number }>,
    canvasWidth: number = 1200,
    canvasHeight: number = 800
  ): SnapResult {
    if (!this.config.enabled) {
      return {
        x: movingComponent.x,
        y: movingComponent.y,
        snappedX: false,
        snappedY: false,
        snapPoints: [],
        alignmentGuides: [],
      };
    }

    const movingBounds = this.getComponentBounds({
      id: 'moving',
      ...movingComponent
    });

    // Generate all available snap points
    const allSnapPoints: SnapPoint[] = [];

    // Component snap points
    if (this.config.componentSnapping) {
      otherComponents.forEach(comp => {
        const bounds = this.getComponentBounds(comp);
        allSnapPoints.push(...this.generateSnapPoints(bounds));
      });
    }

    // Grid snap points
    if (this.config.gridSnapping) {
      allSnapPoints.push(...this.generateGridSnapPoints(canvasWidth, canvasHeight));
    }

    // Find best snap candidates
    const xSnapCandidates = allSnapPoints
      .filter(point => point.x !== undefined)
      .map(point => ({
        ...point,
        distance: Math.min(
          Math.abs(point.x! - movingBounds.left),
          Math.abs(point.x! - movingBounds.right),
          Math.abs(point.x! - movingBounds.centerX)
        )
      }))
      .filter(candidate => candidate.distance <= this.config.snapDistance)
      .sort((a, b) => a.distance - b.distance);

    const ySnapCandidates = allSnapPoints
      .filter(point => point.y !== undefined)
      .map(point => ({
        ...point,
        distance: Math.min(
          Math.abs(point.y! - movingBounds.top),
          Math.abs(point.y! - movingBounds.bottom),
          Math.abs(point.y! - movingBounds.centerY)
        )
      }))
      .filter(candidate => candidate.distance <= this.config.snapDistance)
      .sort((a, b) => a.distance - b.distance);

    // Apply snapping
    let snappedX = movingComponent.x;
    let snappedY = movingComponent.y;
    const appliedSnapPoints: SnapPoint[] = [];

    // Snap X position
    if (xSnapCandidates.length > 0) {
      const bestXSnap = xSnapCandidates[0];
      if (bestXSnap.x !== undefined) {
        // Determine which edge of the moving component should snap
        const leftDistance = Math.abs(bestXSnap.x - movingBounds.left);
        const rightDistance = Math.abs(bestXSnap.x - movingBounds.right);
        const centerDistance = Math.abs(bestXSnap.x - movingBounds.centerX);

        if (leftDistance <= rightDistance && leftDistance <= centerDistance) {
          // Snap left edge
          snappedX = bestXSnap.x;
        } else if (rightDistance <= centerDistance) {
          // Snap right edge
          snappedX = bestXSnap.x - movingComponent.width;
        } else {
          // Snap center
          snappedX = bestXSnap.x - movingComponent.width / 2;
        }

        appliedSnapPoints.push(bestXSnap);
      }
    }

    // Snap Y position
    if (ySnapCandidates.length > 0) {
      const bestYSnap = ySnapCandidates[0];
      if (bestYSnap.y !== undefined) {
        // Determine which edge of the moving component should snap
        const topDistance = Math.abs(bestYSnap.y - movingBounds.top);
        const bottomDistance = Math.abs(bestYSnap.y - movingBounds.bottom);
        const centerDistance = Math.abs(bestYSnap.y - movingBounds.centerY);

        if (topDistance <= bottomDistance && topDistance <= centerDistance) {
          // Snap top edge
          snappedY = bestYSnap.y;
        } else if (bottomDistance <= centerDistance) {
          // Snap bottom edge
          snappedY = bestYSnap.y - movingComponent.height;
        } else {
          // Snap center
          snappedY = bestYSnap.y - movingComponent.height / 2;
        }

        appliedSnapPoints.push(bestYSnap);
      }
    }

    // Generate alignment guides
    const alignmentGuides = this.generateAlignmentGuides(
      { ...movingComponent, x: snappedX, y: snappedY },
      otherComponents,
      appliedSnapPoints
    );

    return {
      x: snappedX,
      y: snappedY,
      snappedX: snappedX !== movingComponent.x,
      snappedY: snappedY !== movingComponent.y,
      snapPoints: appliedSnapPoints,
      alignmentGuides,
    };
  }

  /**
   * Generate alignment guides for visual feedback
   */
  private generateAlignmentGuides(
    snappedComponent: { x: number; y: number; width: number; height: number },
    otherComponents: Array<{ id: string; x: number; y: number; width: number; height: number }>,
    snapPoints: SnapPoint[]
  ): AlignmentGuide[] {
    if (!this.config.showGuides) return [];

    const guides: AlignmentGuide[] = [];
    const snappedBounds = this.getComponentBounds({ id: 'snapped', ...snappedComponent });

    // Find components that align with the snapped position
    otherComponents.forEach(comp => {
      const bounds = this.getComponentBounds(comp);

      // Vertical alignment (same X positions)
      if (Math.abs(bounds.left - snappedBounds.left) < 2) {
        guides.push({
          id: `v-left-${comp.id}`,
          type: 'vertical',
          position: bounds.left,
          start: Math.min(bounds.top, snappedBounds.top) - 20,
          end: Math.max(bounds.bottom, snappedBounds.bottom) + 20,
          componentIds: [comp.id, 'snapped'],
          strength: 'strong',
        });
      }

      if (Math.abs(bounds.right - snappedBounds.right) < 2) {
        guides.push({
          id: `v-right-${comp.id}`,
          type: 'vertical',
          position: bounds.right,
          start: Math.min(bounds.top, snappedBounds.top) - 20,
          end: Math.max(bounds.bottom, snappedBounds.bottom) + 20,
          componentIds: [comp.id, 'snapped'],
          strength: 'strong',
        });
      }

      if (Math.abs(bounds.centerX - snappedBounds.centerX) < 2) {
        guides.push({
          id: `v-center-${comp.id}`,
          type: 'vertical',
          position: bounds.centerX,
          start: Math.min(bounds.top, snappedBounds.top) - 20,
          end: Math.max(bounds.bottom, snappedBounds.bottom) + 20,
          componentIds: [comp.id, 'snapped'],
          strength: 'medium',
        });
      }

      // Horizontal alignment (same Y positions)
      if (Math.abs(bounds.top - snappedBounds.top) < 2) {
        guides.push({
          id: `h-top-${comp.id}`,
          type: 'horizontal',
          position: bounds.top,
          start: Math.min(bounds.left, snappedBounds.left) - 20,
          end: Math.max(bounds.right, snappedBounds.right) + 20,
          componentIds: [comp.id, 'snapped'],
          strength: 'strong',
        });
      }

      if (Math.abs(bounds.bottom - snappedBounds.bottom) < 2) {
        guides.push({
          id: `h-bottom-${comp.id}`,
          type: 'horizontal',
          position: bounds.bottom,
          start: Math.min(bounds.left, snappedBounds.left) - 20,
          end: Math.max(bounds.right, snappedBounds.right) + 20,
          componentIds: [comp.id, 'snapped'],
          strength: 'strong',
        });
      }

      if (Math.abs(bounds.centerY - snappedBounds.centerY) < 2) {
        guides.push({
          id: `h-center-${comp.id}`,
          type: 'horizontal',
          position: bounds.centerY,
          start: Math.min(bounds.left, snappedBounds.left) - 20,
          end: Math.max(bounds.right, snappedBounds.right) + 20,
          componentIds: [comp.id, 'snapped'],
          strength: 'medium',
        });
      }
    });

    return guides;
  }

  /**
   * Check if two components overlap
   */
  checkOverlap(
    comp1: { x: number; y: number; width: number; height: number },
    comp2: { x: number; y: number; width: number; height: number },
    tolerance: number = 0
  ): boolean {
    return !(
      comp1.x + comp1.width <= comp2.x - tolerance ||
      comp2.x + comp2.width <= comp1.x - tolerance ||
      comp1.y + comp1.height <= comp2.y - tolerance ||
      comp2.y + comp2.height <= comp1.y - tolerance
    );
  }

  /**
   * Get suggested spacing between components
   */
  getSuggestedSpacing(
    movingComponent: { x: number; y: number; width: number; height: number },
    nearbyComponent: { x: number; y: number; width: number; height: number },
    preferredSpacing: number = 16
  ): { x: number; y: number } | null {
    const moving = this.getComponentBounds({ id: 'moving', ...movingComponent });
    const nearby = this.getComponentBounds({ id: 'nearby', ...nearbyComponent });

    // Check which side the moving component should be positioned
    const leftSpace = nearby.left - moving.width - preferredSpacing;
    const rightSpace = nearby.right + preferredSpacing;
    const topSpace = nearby.top - moving.height - preferredSpacing;
    const bottomSpace = nearby.bottom + preferredSpacing;

    // Find the position with least overlap potential
    const candidates = [
      { x: leftSpace, y: moving.y }, // Left of nearby
      { x: rightSpace, y: moving.y }, // Right of nearby
      { x: moving.x, y: topSpace }, // Above nearby
      { x: moving.x, y: bottomSpace }, // Below nearby
    ].filter(pos => pos.x >= 0 && pos.y >= 0); // Must be within canvas

    return candidates.length > 0 ? candidates[0] : null;
  }
}

/**
 * Default instance for easy usage
 */
export const smartSnapping = new SmartSnapping();