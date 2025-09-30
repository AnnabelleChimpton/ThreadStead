/**
 * Smart Snapping and Alignment System for Visual Builder
 * Provides component-to-component snapping, grid snapping, and alignment guides
 */

export interface SnapPoint {
  x?: number;
  y?: number;
  type: 'edge' | 'center' | 'grid' | 'spacing' | 'css-grid';
  componentId?: string;
  edge?: 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y';

  // Enhanced properties for magnetic snapping
  priority?: number; // higher priority snaps first
  magneticPull?: number; // 0-1, strength of magnetic attraction
  spacing?: {
    value: number; // spacing distance
    direction: 'horizontal' | 'vertical';
    referenceComponent?: string; // component this spacing relates to
  };

  // PHASE 4.3: CSS Grid snapping properties
  cssGrid?: {
    gridId: string; // ID of the Grid component
    column?: number; // Grid column number (1-indexed)
    row?: number; // Grid row number (1-indexed)
    type: 'column-line' | 'row-line' | 'cell-start' | 'cell-end';
  };
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

  // Enhanced properties for magnetic snapping
  magneticPull: { x: number; y: number }; // actual magnetic adjustment applied
  suggestedSpacing?: {
    horizontal?: number[];
    vertical?: number[];
  };
}

export interface MultiComponentSnapResult {
  components: Array<{
    id: string;
    x: number;
    y: number;
    snappedX: boolean;
    snappedY: boolean;
  }>;
  alignmentGuides: AlignmentGuide[];
  snapPoints: SnapPoint[];
}

export interface SnapConfig {
  enabled: boolean;
  snapDistance: number; // pixels
  componentSnapping: boolean;
  gridSnapping: boolean;
  gridSize: number;
  showGuides: boolean;
  showSnapDistance: boolean;

  // Enhanced magnetic snapping
  magneticZoneEnabled: boolean;
  magneticZoneRadius: number; // radius for magnetic attraction
  magneticStrength: number; // 0-1, how strong the magnetic pull is

  // Smart spacing
  spacingDetection: boolean;
  commonSpacings: number[]; // common spacing values to suggest
  spacingTolerance: number; // tolerance for spacing detection
}

export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  enabled: true,
  snapDistance: 8, // 8px snap distance
  componentSnapping: true,
  gridSnapping: false,
  gridSize: 20,
  showGuides: true,
  showSnapDistance: true,

  // Enhanced magnetic snapping
  magneticZoneEnabled: true,
  magneticZoneRadius: 24, // 24px magnetic zone
  magneticStrength: 0.6, // 60% magnetic pull strength

  // Smart spacing
  spacingDetection: true,
  commonSpacings: [8, 12, 16, 20, 24, 32, 48], // standard spacing values
  spacingTolerance: 4, // 4px tolerance for spacing detection
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
   * Generate snap points from component bounds with enhanced priority and magnetic properties
   */
  generateSnapPoints(bounds: ComponentBounds): SnapPoint[] {
    const snapPoints: SnapPoint[] = [];

    // Center snap points with high priority for intuitive alignment
    snapPoints.push(
      {
        x: bounds.centerX,
        type: 'center',
        componentId: bounds.id,
        edge: 'center-x',
        priority: 10,
        magneticPull: 0.8
      },
      {
        y: bounds.centerY,
        type: 'center',
        componentId: bounds.id,
        edge: 'center-y',
        priority: 10,
        magneticPull: 0.8
      }
    );

    // Edge snap points with medium priority for precise alignment when needed
    snapPoints.push(
      {
        x: bounds.left,
        type: 'edge',
        componentId: bounds.id,
        edge: 'left',
        priority: 7,
        magneticPull: 0.6
      },
      {
        x: bounds.right,
        type: 'edge',
        componentId: bounds.id,
        edge: 'right',
        priority: 7,
        magneticPull: 0.6
      },
      {
        y: bounds.top,
        type: 'edge',
        componentId: bounds.id,
        edge: 'top',
        priority: 7,
        magneticPull: 0.6
      },
      {
        y: bounds.bottom,
        type: 'edge',
        componentId: bounds.id,
        edge: 'bottom',
        priority: 7,
        magneticPull: 0.6
      }
    );

    return snapPoints;
  }

  /**
   * Generate enhanced grid snap points with proper breakpoint support
   */
  generateGridSnapPoints(canvasWidth: number, canvasHeight: number, currentBreakpoint?: any): SnapPoint[] {
    if (!this.config.gridSnapping) return [];

    const snapPoints: SnapPoint[] = [];

    // Enhanced grid snapping - use actual grid system if breakpoint provided
    if (currentBreakpoint) {
      // Use real grid column positions for precise snapping
      const columnWidth = (canvasWidth - (currentBreakpoint.columns + 1) * currentBreakpoint.gap) / currentBreakpoint.columns;

      // Vertical grid lines (column boundaries) with medium priority
      for (let col = 0; col <= currentBreakpoint.columns; col++) {
        const x = col * (columnWidth + currentBreakpoint.gap);
        snapPoints.push({
          x,
          type: 'grid',
          priority: 5, // Higher priority than before but lower than components
          magneticPull: 0.5
        });
      }

      // Horizontal grid lines (row boundaries) with medium priority
      for (let y = 0; y <= canvasHeight; y += currentBreakpoint.rowHeight) {
        snapPoints.push({
          y,
          type: 'grid',
          priority: 5,
          magneticPull: 0.5
        });
      }
    } else {
      // Fallback to simple grid size for basic grid snapping
      const { gridSize } = this.config;

      // Vertical grid lines with lower priority than components
      for (let x = 0; x <= canvasWidth; x += gridSize) {
        snapPoints.push({
          x,
          type: 'grid',
          priority: 3,
          magneticPull: 0.3
        });
      }

      // Horizontal grid lines with lower priority than components
      for (let y = 0; y <= canvasHeight; y += gridSize) {
        snapPoints.push({
          y,
          type: 'grid',
          priority: 3,
          magneticPull: 0.3
        });
      }
    }

    return snapPoints;
  }

  /**
   * PHASE 4.3: Generate CSS Grid snap points for Grid components
   * Parses CSS Grid template and generates snap points for grid lines and cells
   */
  generateCSSGridSnapPoints(gridComponents: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    props?: any;
  }>): SnapPoint[] {
    const snapPoints: SnapPoint[] = [];

    gridComponents.forEach(gridComponent => {
      const props = gridComponent.props || {};

      // Get grid template values
      const gridTemplateColumns = props.gridTemplateColumns ||
                                   (props.columns ? `repeat(${props.columns}, 1fr)` : 'repeat(3, 1fr)');
      const gridTemplateRows = props.gridTemplateRows || 'auto';
      const gap = parseInt(props.gap || '1rem', 10) || 16;

      // Parse grid tracks (simplified version of CSSGridOverlay parsing)
      const columnTracks = this.parseCSSGridTemplate(gridTemplateColumns);
      const rowTracks = this.parseCSSGridTemplate(gridTemplateRows);

      // Calculate track positions
      const columnPositions = this.calculateGridTrackPositions(
        columnTracks,
        gridComponent.width,
        gap
      );
      const rowPositions = this.calculateGridTrackPositions(
        rowTracks,
        gridComponent.height,
        gap
      );

      // Generate column line snap points
      columnPositions.forEach((pos, index) => {
        snapPoints.push({
          x: gridComponent.x + pos.position,
          type: 'css-grid',
          componentId: gridComponent.id,
          priority: 8, // High priority for CSS Grid lines
          magneticPull: 0.75,
          cssGrid: {
            gridId: gridComponent.id,
            column: pos.lineNumber,
            type: 'column-line'
          }
        });
      });

      // Generate row line snap points
      rowPositions.forEach((pos, index) => {
        snapPoints.push({
          y: gridComponent.y + pos.position,
          type: 'css-grid',
          componentId: gridComponent.id,
          priority: 8, // High priority for CSS Grid lines
          magneticPull: 0.75,
          cssGrid: {
            gridId: gridComponent.id,
            row: pos.lineNumber,
            type: 'row-line'
          }
        });
      });
    });

    return snapPoints;
  }

  /**
   * PHASE 4.3: Parse CSS Grid template into tracks (simplified)
   */
  private parseCSSGridTemplate(template: string): Array<{ size: number; type: string; value: string }> {
    if (!template) return [{ size: 1, type: 'fr', value: '1fr' }];

    // Handle repeat() syntax
    if (template.includes('repeat(')) {
      const repeatMatch = template.match(/repeat\((\d+),\s*([^)]+)\)/);
      if (repeatMatch) {
        const count = parseInt(repeatMatch[1], 10);
        const trackValue = repeatMatch[2].trim();
        const tracks = [];
        for (let i = 0; i < count; i++) {
          tracks.push(this.parseTrackValue(trackValue));
        }
        return tracks;
      }
    }

    // Split by spaces
    const parts = template.split(/\s+/);
    return parts.map(part => this.parseTrackValue(part));
  }

  /**
   * PHASE 4.3: Parse individual track value
   */
  private parseTrackValue(value: string): { size: number; type: string; value: string } {
    if (value.endsWith('fr')) {
      return { size: parseFloat(value), type: 'fr', value };
    }
    if (value.endsWith('px')) {
      return { size: parseInt(value, 10), type: 'px', value };
    }
    if (value.endsWith('%')) {
      return { size: parseInt(value, 10), type: '%', value };
    }
    if (value === 'auto') {
      return { size: 100, type: 'auto', value };
    }
    return { size: 1, type: 'fr', value: '1fr' };
  }

  /**
   * PHASE 4.3: Calculate pixel positions for grid tracks
   */
  private calculateGridTrackPositions(
    tracks: Array<{ size: number; type: string; value: string }>,
    containerSize: number,
    gap: number
  ): Array<{ position: number; lineNumber: number }> {
    const positions = [{ position: 0, lineNumber: 1 }];

    // Calculate total fr units
    const totalFr = tracks
      .filter(t => t.type === 'fr')
      .reduce((sum, t) => sum + t.size, 0);

    // Calculate fixed space
    const totalGaps = (tracks.length - 1) * gap;
    let fixedSpace = totalGaps;

    tracks.forEach(track => {
      if (track.type === 'px') {
        fixedSpace += track.size;
      } else if (track.type === '%') {
        fixedSpace += (track.size / 100) * containerSize;
      } else if (track.type === 'auto') {
        fixedSpace += 100; // Estimated
      }
    });

    // Remaining space for fr units
    const frSpace = Math.max(0, containerSize - fixedSpace);
    const frUnitSize = totalFr > 0 ? frSpace / totalFr : 0;

    // Calculate each track position
    let currentPosition = 0;

    tracks.forEach((track, index) => {
      let trackSize = 0;

      switch (track.type) {
        case 'fr':
          trackSize = track.size * frUnitSize;
          break;
        case 'px':
          trackSize = track.size;
          break;
        case '%':
          trackSize = (track.size / 100) * containerSize;
          break;
        case 'auto':
          trackSize = 100; // Estimated
          break;
      }

      currentPosition += trackSize;
      if (index < tracks.length - 1) {
        currentPosition += gap;
      }

      positions.push({
        position: currentPosition,
        lineNumber: index + 2
      });
    });

    return positions;
  }

  /**
   * Calculate enhanced magnetic pull strength with adaptive sensitivity
   */
  private calculateMagneticPull(distance: number, snapPoint: SnapPoint): number {
    if (!this.config.magneticZoneEnabled || distance > this.config.magneticZoneRadius) {
      return 0;
    }

    const basePull = snapPoint.magneticPull || 0.5;
    const normalizedDistance = distance / this.config.magneticZoneRadius;

    // Enhanced magnetic pull calculation with adaptive sensitivity
    let distanceFactor: number;

    if (normalizedDistance < 0.3) {
      // Very close: Strong exponential pull for precise positioning
      distanceFactor = 1 - Math.pow(normalizedDistance / 0.3, 0.5);
    } else if (normalizedDistance < 0.7) {
      // Medium distance: Smooth quadratic transition
      const adjustedDistance = (normalizedDistance - 0.3) / 0.4;
      distanceFactor = 0.8 * (1 - Math.pow(adjustedDistance, 2));
    } else {
      // Far distance: Gentle linear pull to start attraction
      const adjustedDistance = (normalizedDistance - 0.7) / 0.3;
      distanceFactor = 0.3 * (1 - adjustedDistance);
    }

    // Priority-based magnetic strength adjustment
    let priorityMultiplier = 1.0;
    if (snapPoint.priority && snapPoint.priority >= 9) {
      priorityMultiplier = 1.3; // Stronger pull for high-priority snap points
    } else if (snapPoint.priority && snapPoint.priority <= 5) {
      priorityMultiplier = 0.7; // Weaker pull for low-priority snap points
    }

    // Type-specific sensitivity adjustments
    let typeMultiplier = 1.0;
    if (snapPoint.type === 'center') {
      typeMultiplier = 1.2; // Centers are more magnetic
    } else if (snapPoint.type === 'spacing' && snapPoint.spacing) {
      // Spacing points are more magnetic for common spacings
      const spacing = snapPoint.spacing.value;
      if (spacing === 16 || spacing === 24) {
        typeMultiplier = 1.15;
      } else if (spacing === 8 || spacing === 12 || spacing === 20 || spacing === 32) {
        typeMultiplier = 1.05;
      }
    }

    return basePull * distanceFactor * this.config.magneticStrength * priorityMultiplier * typeMultiplier;
  }

  /**
   * Apply magnetic pull to position
   */
  private applyMagneticPull(
    currentPosition: number,
    targetPosition: number,
    pullStrength: number
  ): number {
    if (pullStrength === 0) return currentPosition;

    const delta = targetPosition - currentPosition;
    return currentPosition + (delta * pullStrength);
  }

  /**
   * Generate spacing-based snap points with enhanced priority logic
   */
  generateSpacingSnapPoints(
    movingComponent: { x: number; y: number; width: number; height: number },
    otherComponents: Array<{ id: string; x: number; y: number; width: number; height: number }>
  ): SnapPoint[] {
    if (!this.config.spacingDetection) return [];

    const spacingPoints: SnapPoint[] = [];
    const movingBounds = this.getComponentBounds({ id: 'moving', ...movingComponent });

    // Detect existing spacing patterns for priority boost
    const existingSpacings = this.detectSpacingPatterns(otherComponents);
    const commonHorizontalSpacings = new Set(existingSpacings.horizontal);
    const commonVerticalSpacings = new Set(existingSpacings.vertical);

    otherComponents.forEach(comp => {
      const compBounds = this.getComponentBounds(comp);

      // Calculate distance for proximity-based priority
      const proximityDistance = Math.min(
        Math.abs(compBounds.right - movingBounds.left),
        Math.abs(compBounds.left - movingBounds.right),
        Math.abs(compBounds.bottom - movingBounds.top),
        Math.abs(compBounds.top - movingBounds.bottom)
      );

      // Generate spacing suggestions for each common spacing value
      this.config.commonSpacings.forEach(spacing => {
        // Calculate enhanced priority based on multiple factors
        const basePriority = this.calculateSpacingPriority(spacing, proximityDistance, commonHorizontalSpacings, commonVerticalSpacings);

        // Horizontal spacing (component to the right)
        if (compBounds.right < movingBounds.left) {
          const suggestedX = compBounds.right + spacing;
          const distance = Math.abs(suggestedX - movingBounds.left);
          const priority = basePriority + (distance < 50 ? 1 : 0); // Proximity bonus

          spacingPoints.push({
            x: suggestedX,
            type: 'spacing',
            componentId: comp.id,
            priority,
            magneticPull: this.calculateSpacingMagneticPull(spacing, commonHorizontalSpacings),
            spacing: {
              value: spacing,
              direction: 'horizontal',
              referenceComponent: comp.id
            }
          });
        }

        // Horizontal spacing (component to the left)
        if (compBounds.left > movingBounds.right) {
          const suggestedX = compBounds.left - spacing - movingComponent.width;
          const distance = Math.abs(movingBounds.right - suggestedX);
          const priority = basePriority + (distance < 50 ? 1 : 0); // Proximity bonus

          spacingPoints.push({
            x: suggestedX,
            type: 'spacing',
            componentId: comp.id,
            priority,
            magneticPull: this.calculateSpacingMagneticPull(spacing, commonHorizontalSpacings),
            spacing: {
              value: spacing,
              direction: 'horizontal',
              referenceComponent: comp.id
            }
          });
        }

        // Vertical spacing (component below)
        if (compBounds.top > movingBounds.bottom) {
          const suggestedY = compBounds.top - spacing - movingComponent.height;
          const distance = Math.abs(movingBounds.bottom - suggestedY);
          const priority = basePriority + (distance < 50 ? 1 : 0); // Proximity bonus

          spacingPoints.push({
            y: suggestedY,
            type: 'spacing',
            componentId: comp.id,
            priority,
            magneticPull: this.calculateSpacingMagneticPull(spacing, commonVerticalSpacings),
            spacing: {
              value: spacing,
              direction: 'vertical',
              referenceComponent: comp.id
            }
          });
        }

        // Vertical spacing (component above)
        if (compBounds.bottom < movingBounds.top) {
          const suggestedY = compBounds.bottom + spacing;
          const distance = Math.abs(suggestedY - movingBounds.top);
          const priority = basePriority + (distance < 50 ? 1 : 0); // Proximity bonus

          spacingPoints.push({
            y: suggestedY,
            type: 'spacing',
            componentId: comp.id,
            priority,
            magneticPull: this.calculateSpacingMagneticPull(spacing, commonVerticalSpacings),
            spacing: {
              value: spacing,
              direction: 'vertical',
              referenceComponent: comp.id
            }
          });
        }
      });
    });

    return spacingPoints;
  }

  /**
   * Calculate spacing priority based on multiple factors
   */
  private calculateSpacingPriority(
    spacing: number,
    proximityDistance: number,
    commonHorizontalSpacings: Set<number>,
    commonVerticalSpacings: Set<number>
  ): number {
    let priority = 5; // Base priority for spacing snap points

    // Boost priority for very common spacings (16px, 24px are design system favorites)
    if (spacing === 16 || spacing === 24) {
      priority += 2; // Priority 7
    } else if (spacing === 8 || spacing === 12 || spacing === 20 || spacing === 32) {
      priority += 1; // Priority 6
    }

    // Boost priority if this spacing already exists in the layout
    if (commonHorizontalSpacings.has(spacing) || commonVerticalSpacings.has(spacing)) {
      priority += 2; // Consistency bonus
    }

    // Boost priority for closer components (stronger spacing suggestions)
    if (proximityDistance < 100) {
      priority += 1; // Close components get priority boost
    }

    return Math.min(priority, 9); // Cap at 9 to stay below center/edge priorities
  }

  /**
   * Calculate magnetic pull strength for spacing based on consistency
   */
  private calculateSpacingMagneticPull(
    spacing: number,
    existingSpacings: Set<number>
  ): number {
    let magneticPull = 0.4; // Base magnetic pull for spacing

    // Stronger pull for common design system spacings
    if (spacing === 16 || spacing === 24) {
      magneticPull = 0.6;
    } else if (spacing === 8 || spacing === 12 || spacing === 20 || spacing === 32) {
      magneticPull = 0.5;
    }

    // Much stronger pull if this spacing already exists in the layout
    if (existingSpacings.has(spacing)) {
      magneticPull += 0.3; // Consistency boost
    }

    return Math.min(magneticPull, 0.8); // Cap magnetic pull
  }

  /**
   * Detect current spacing patterns and suggest improvements
   */
  private detectSpacingPatterns(
    otherComponents: Array<{ id: string; x: number; y: number; width: number; height: number }>
  ): { horizontal: number[]; vertical: number[] } {
    const horizontalSpacings: number[] = [];
    const verticalSpacings: number[] = [];

    // Analyze spacing between existing components
    for (let i = 0; i < otherComponents.length; i++) {
      for (let j = i + 1; j < otherComponents.length; j++) {
        const comp1 = this.getComponentBounds(otherComponents[i]);
        const comp2 = this.getComponentBounds(otherComponents[j]);

        // Check horizontal spacing
        if (Math.abs(comp1.top - comp2.top) < this.config.spacingTolerance) {
          if (comp1.right < comp2.left) {
            horizontalSpacings.push(comp2.left - comp1.right);
          } else if (comp2.right < comp1.left) {
            horizontalSpacings.push(comp1.left - comp2.right);
          }
        }

        // Check vertical spacing
        if (Math.abs(comp1.left - comp2.left) < this.config.spacingTolerance) {
          if (comp1.bottom < comp2.top) {
            verticalSpacings.push(comp2.top - comp1.bottom);
          } else if (comp2.bottom < comp1.top) {
            verticalSpacings.push(comp1.top - comp2.bottom);
          }
        }
      }
    }

    // Filter to most common spacings
    const uniqueHorizontal = [...new Set(horizontalSpacings.filter(s => s > 0))];
    const uniqueVertical = [...new Set(verticalSpacings.filter(s => s > 0))];

    return {
      horizontal: uniqueHorizontal.slice(0, 3), // Top 3 horizontal spacings
      vertical: uniqueVertical.slice(0, 3) // Top 3 vertical spacings
    };
  }

  /**
   * Enhanced calculate snapping with magnetic zones and spacing detection
   * PHASE 4.3: Added gridComponents parameter for CSS Grid snapping
   */
  calculateSnap(
    movingComponent: { x: number; y: number; width: number; height: number },
    otherComponents: Array<{ id: string; x: number; y: number; width: number; height: number }>,
    canvasWidth: number = 1200,
    canvasHeight: number = 800,
    currentBreakpoint?: any,
    gridComponents?: Array<{ id: string; x: number; y: number; width: number; height: number; props?: any }>
  ): SnapResult {
    // Input validation
    if (!this.config.enabled || !movingComponent || !otherComponents) {
      return {
        x: movingComponent?.x || 0,
        y: movingComponent?.y || 0,
        snappedX: false,
        snappedY: false,
        snapPoints: [],
        alignmentGuides: [],
        magneticPull: { x: 0, y: 0 },
      };
    }

    // Ensure otherComponents is an array and filter out invalid components
    const validComponents = Array.isArray(otherComponents)
      ? otherComponents.filter(comp =>
          comp &&
          typeof comp.x === 'number' &&
          typeof comp.y === 'number' &&
          typeof comp.width === 'number' &&
          typeof comp.height === 'number'
        )
      : [];

    const movingBounds = this.getComponentBounds({
      id: 'moving',
      ...movingComponent
    });

    // Generate all available snap points with priorities
    const allSnapPoints: SnapPoint[] = [];

    // Component snap points
    if (this.config.componentSnapping && validComponents.length > 0) {
      validComponents.forEach(comp => {
        const bounds = this.getComponentBounds(comp);
        allSnapPoints.push(...this.generateSnapPoints(bounds));
      });
    }

    // Grid snap points (enhanced with breakpoint support)
    if (this.config.gridSnapping) {
      allSnapPoints.push(...this.generateGridSnapPoints(canvasWidth, canvasHeight, currentBreakpoint));
    }

    // Spacing snap points
    if (this.config.spacingDetection && validComponents.length > 0) {
      allSnapPoints.push(...this.generateSpacingSnapPoints(movingComponent, validComponents));
    }

    // PHASE 4.3: CSS Grid snap points
    if (gridComponents && gridComponents.length > 0) {
      allSnapPoints.push(...this.generateCSSGridSnapPoints(gridComponents));
    }

    // Enhanced snap candidate processing with magnetic zones and priority
    const xSnapCandidates = allSnapPoints
      .filter(point => point.x !== undefined)
      .map(point => {
        const distances = [
          Math.abs(point.x! - movingBounds.left),
          Math.abs(point.x! - movingBounds.right),
          Math.abs(point.x! - movingBounds.centerX)
        ];
        const minDistance = Math.min(...distances);
        const magneticPull = this.calculateMagneticPull(minDistance, point);

        return {
          ...point,
          distance: minDistance,
          magneticPull: magneticPull,
          priority: point.priority || 5
        };
      })
      .filter(candidate =>
        candidate.distance <= this.config.snapDistance ||
        candidate.distance <= this.config.magneticZoneRadius
      )
      .sort((a, b) => {
        // Sort by priority first, then by distance
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.distance - b.distance;
      });

    const ySnapCandidates = allSnapPoints
      .filter(point => point.y !== undefined)
      .map(point => {
        const distances = [
          Math.abs(point.y! - movingBounds.top),
          Math.abs(point.y! - movingBounds.bottom),
          Math.abs(point.y! - movingBounds.centerY)
        ];
        const minDistance = Math.min(...distances);
        const magneticPull = this.calculateMagneticPull(minDistance, point);

        return {
          ...point,
          distance: minDistance,
          magneticPull: magneticPull,
          priority: point.priority || 5
        };
      })
      .filter(candidate =>
        candidate.distance <= this.config.snapDistance ||
        candidate.distance <= this.config.magneticZoneRadius
      )
      .sort((a, b) => {
        // Sort by priority first, then by distance
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.distance - b.distance;
      });

    // Apply enhanced snapping with magnetic pull
    let snappedX = movingComponent.x;
    let snappedY = movingComponent.y;
    let magneticPullX = 0;
    let magneticPullY = 0;
    const appliedSnapPoints: SnapPoint[] = [];

    // Enhanced X position snapping
    if (xSnapCandidates.length > 0) {
      const bestXSnap = xSnapCandidates[0];
      if (bestXSnap.x !== undefined) {
        const leftDistance = Math.abs(bestXSnap.x - movingBounds.left);
        const rightDistance = Math.abs(bestXSnap.x - movingBounds.right);
        const centerDistance = Math.abs(bestXSnap.x - movingBounds.centerX);

        let targetX: number;

        // Enhanced logic: Use snap point type to determine alignment intention
        if (bestXSnap.edge === 'center-x' || bestXSnap.type === 'center') {
          // Explicitly center-align when snap point is a center point
          targetX = bestXSnap.x - movingComponent.width / 2;
        } else if (bestXSnap.edge === 'left') {
          // Align left edges
          targetX = bestXSnap.x;
        } else if (bestXSnap.edge === 'right') {
          // Align right edges (right edge of moving component to snap point)
          targetX = bestXSnap.x - movingComponent.width;
        } else {
          // Fallback to distance-based logic for edge/spacing points
          if (leftDistance <= rightDistance && leftDistance <= centerDistance) {
            targetX = bestXSnap.x; // Snap left edge
          } else if (rightDistance <= centerDistance) {
            targetX = bestXSnap.x - movingComponent.width; // Snap right edge
          } else {
            targetX = bestXSnap.x - movingComponent.width / 2; // Snap center
          }
        }

        // Apply magnetic pull or direct snap
        if (bestXSnap.distance <= this.config.snapDistance) {
          snappedX = targetX; // Direct snap
          appliedSnapPoints.push(bestXSnap);
        } else if (bestXSnap.magneticPull > 0) {
          snappedX = this.applyMagneticPull(movingComponent.x, targetX, bestXSnap.magneticPull);
          magneticPullX = snappedX - movingComponent.x;
        }
      }
    }

    // Enhanced Y position snapping
    if (ySnapCandidates.length > 0) {
      const bestYSnap = ySnapCandidates[0];
      if (bestYSnap.y !== undefined) {
        const topDistance = Math.abs(bestYSnap.y - movingBounds.top);
        const bottomDistance = Math.abs(bestYSnap.y - movingBounds.bottom);
        const centerDistance = Math.abs(bestYSnap.y - movingBounds.centerY);

        let targetY: number;

        // Enhanced logic: Use snap point type to determine alignment intention
        if (bestYSnap.edge === 'center-y' || bestYSnap.type === 'center') {
          // Explicitly center-align when snap point is a center point
          targetY = bestYSnap.y - movingComponent.height / 2;
        } else if (bestYSnap.edge === 'top') {
          // Align top edges
          targetY = bestYSnap.y;
        } else if (bestYSnap.edge === 'bottom') {
          // Align bottom edges (bottom edge of moving component to snap point)
          targetY = bestYSnap.y - movingComponent.height;
        } else {
          // Fallback to distance-based logic for edge/spacing points
          if (topDistance <= bottomDistance && topDistance <= centerDistance) {
            targetY = bestYSnap.y; // Snap top edge
          } else if (bottomDistance <= centerDistance) {
            targetY = bestYSnap.y - movingComponent.height; // Snap bottom edge
          } else {
            targetY = bestYSnap.y - movingComponent.height / 2; // Snap center
          }
        }

        // Apply magnetic pull or direct snap
        if (bestYSnap.distance <= this.config.snapDistance) {
          snappedY = targetY; // Direct snap
          appliedSnapPoints.push(bestYSnap);
        } else if (bestYSnap.magneticPull > 0) {
          snappedY = this.applyMagneticPull(movingComponent.y, targetY, bestYSnap.magneticPull);
          magneticPullY = snappedY - movingComponent.y;
        }
      }
    }

    // Generate alignment guides
    const alignmentGuides = this.generateAlignmentGuides(
      { ...movingComponent, x: snappedX, y: snappedY },
      validComponents,
      appliedSnapPoints
    );

    // Detect spacing patterns for suggestions
    const suggestedSpacing = this.detectSpacingPatterns(validComponents);

    return {
      x: snappedX,
      y: snappedY,
      snappedX: snappedX !== movingComponent.x,
      snappedY: snappedY !== movingComponent.y,
      snapPoints: appliedSnapPoints,
      alignmentGuides,
      magneticPull: { x: magneticPullX, y: magneticPullY },
      suggestedSpacing,
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

  /**
   * Calculate snapping for multiple selected components moving together
   */
  calculateMultiComponentSnap(
    movingComponents: Array<{ id: string; x: number; y: number; width: number; height: number }>,
    otherComponents: Array<{ id: string; x: number; y: number; width: number; height: number }>,
    canvasWidth: number = 1200,
    canvasHeight: number = 800,
    currentBreakpoint?: any
  ): MultiComponentSnapResult {
    if (!this.config.enabled || movingComponents.length === 0) {
      return {
        components: movingComponents.map(comp => ({
          id: comp.id,
          x: comp.x,
          y: comp.y,
          snappedX: false,
          snappedY: false
        })),
        alignmentGuides: [],
        snapPoints: []
      };
    }

    // Calculate bounding box of all moving components
    const groupBounds = this.calculateGroupBounds(movingComponents);

    // Use the group as a single component for snapping calculations
    const groupSnapResult = this.calculateSnap(
      { x: groupBounds.left, y: groupBounds.top, width: groupBounds.width, height: groupBounds.height },
      otherComponents,
      canvasWidth,
      canvasHeight,
      currentBreakpoint
    );

    // Calculate offset from group snap
    const deltaX = groupSnapResult.x - groupBounds.left;
    const deltaY = groupSnapResult.y - groupBounds.top;

    // Apply offset to all moving components
    const snappedComponents = movingComponents.map(comp => ({
      id: comp.id,
      x: comp.x + deltaX,
      y: comp.y + deltaY,
      snappedX: groupSnapResult.snappedX,
      snappedY: groupSnapResult.snappedY
    }));

    return {
      components: snappedComponents,
      alignmentGuides: groupSnapResult.alignmentGuides,
      snapPoints: groupSnapResult.snapPoints
    };
  }

  /**
   * Calculate bounding box for a group of components
   */
  private calculateGroupBounds(components: Array<{ x: number; y: number; width: number; height: number }>): {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } {
    if (components.length === 0) {
      return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    }

    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;

    components.forEach(comp => {
      left = Math.min(left, comp.x);
      top = Math.min(top, comp.y);
      right = Math.max(right, comp.x + comp.width);
      bottom = Math.max(bottom, comp.y + comp.height);
    });

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top
    };
  }

  /**
   * Align multiple components to each other
   */
  alignComponents(
    selectedComponents: Array<{ id: string; x: number; y: number; width: number; height: number }>,
    alignmentType: 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y' | 'distribute-horizontal' | 'distribute-vertical'
  ): Array<{ id: string; x: number; y: number }> {
    if (selectedComponents.length < 2) {
      return selectedComponents.map(comp => ({ id: comp.id, x: comp.x, y: comp.y }));
    }

    const components = selectedComponents.map(comp => this.getComponentBounds(comp));
    const result: Array<{ id: string; x: number; y: number }> = [];

    switch (alignmentType) {
      case 'left': {
        const leftMost = Math.min(...components.map(c => c.left));
        components.forEach(comp => {
          result.push({
            id: comp.id,
            x: leftMost,
            y: selectedComponents.find(sc => sc.id === comp.id)!.y
          });
        });
        break;
      }

      case 'right': {
        const rightMost = Math.max(...components.map(c => c.right));
        components.forEach(comp => {
          const originalComp = selectedComponents.find(sc => sc.id === comp.id)!;
          result.push({
            id: comp.id,
            x: rightMost - originalComp.width,
            y: originalComp.y
          });
        });
        break;
      }

      case 'top': {
        const topMost = Math.min(...components.map(c => c.top));
        components.forEach(comp => {
          result.push({
            id: comp.id,
            x: selectedComponents.find(sc => sc.id === comp.id)!.x,
            y: topMost
          });
        });
        break;
      }

      case 'bottom': {
        const bottomMost = Math.max(...components.map(c => c.bottom));
        components.forEach(comp => {
          const originalComp = selectedComponents.find(sc => sc.id === comp.id)!;
          result.push({
            id: comp.id,
            x: originalComp.x,
            y: bottomMost - originalComp.height
          });
        });
        break;
      }

      case 'center-x': {
        const centerX = (Math.min(...components.map(c => c.left)) + Math.max(...components.map(c => c.right))) / 2;
        components.forEach(comp => {
          const originalComp = selectedComponents.find(sc => sc.id === comp.id)!;
          result.push({
            id: comp.id,
            x: centerX - originalComp.width / 2,
            y: originalComp.y
          });
        });
        break;
      }

      case 'center-y': {
        const centerY = (Math.min(...components.map(c => c.top)) + Math.max(...components.map(c => c.bottom))) / 2;
        components.forEach(comp => {
          const originalComp = selectedComponents.find(sc => sc.id === comp.id)!;
          result.push({
            id: comp.id,
            x: originalComp.x,
            y: centerY - originalComp.height / 2
          });
        });
        break;
      }

      case 'distribute-horizontal': {
        const sorted = components.sort((a, b) => a.left - b.left);
        const leftMost = sorted[0].left;
        const rightMost = sorted[sorted.length - 1].right;
        const totalWidth = rightMost - leftMost;
        const componentWidth = sorted.reduce((sum, comp) => sum + comp.width, 0);
        const totalGap = totalWidth - componentWidth;
        const gapBetween = totalGap / (sorted.length - 1);

        let currentX = leftMost;
        sorted.forEach((comp, index) => {
          const originalComp = selectedComponents.find(sc => sc.id === comp.id)!;
          result.push({
            id: comp.id,
            x: currentX,
            y: originalComp.y
          });
          currentX += comp.width + gapBetween;
        });
        break;
      }

      case 'distribute-vertical': {
        const sorted = components.sort((a, b) => a.top - b.top);
        const topMost = sorted[0].top;
        const bottomMost = sorted[sorted.length - 1].bottom;
        const totalHeight = bottomMost - topMost;
        const componentHeight = sorted.reduce((sum, comp) => sum + comp.height, 0);
        const totalGap = totalHeight - componentHeight;
        const gapBetween = totalGap / (sorted.length - 1);

        let currentY = topMost;
        sorted.forEach((comp, index) => {
          const originalComp = selectedComponents.find(sc => sc.id === comp.id)!;
          result.push({
            id: comp.id,
            x: originalComp.x,
            y: currentY
          });
          currentY += comp.height + gapBetween;
        });
        break;
      }
    }

    return result;
  }
}

/**
 * Default instance for easy usage
 */
export const smartSnapping = new SmartSnapping();