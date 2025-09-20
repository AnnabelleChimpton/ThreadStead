/**
 * Grid Compatible Wrapper
 * Automatically adapts components for CSS Grid layouts
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  getComponentGridBehavior,
  getGridClassModifications,
  getGridStyles,
  isGridOverlay,
  type ComponentGridBehavior
} from '@/lib/templates/visual-builder/grid-compatibility';

interface GridCompatibleWrapperProps {
  componentType: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;

  // Grid-specific props
  gridPosition?: {
    column: number;
    row: number;
    columnSpan?: number;
    rowSpan?: number;
  };

  // Override grid behavior
  forceGridMode?: boolean;
  disableGridAdaptation?: boolean;
}

/**
 * Hook to detect if element is inside a CSS Grid container
 */
function useGridContext(elementRef: React.RefObject<HTMLElement | null>) {
  const [isInGrid, setIsInGrid] = useState(false);
  const [gridInfo, setGridInfo] = useState<{
    columns: number;
    rows: number;
    gap: string;
  } | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const checkGridContext = () => {
      let parent = element.parentElement;

      while (parent) {
        const computedStyle = window.getComputedStyle(parent);

        if (computedStyle.display === 'grid' || computedStyle.display === 'inline-grid') {
          setIsInGrid(true);

          // Extract grid information
          const gridTemplateColumns = computedStyle.gridTemplateColumns;
          const gridTemplateRows = computedStyle.gridTemplateRows;
          const gap = computedStyle.gap || computedStyle.gridGap;

          const columnCount = gridTemplateColumns.split(' ').length;
          const rowCount = gridTemplateRows !== 'none' ? gridTemplateRows.split(' ').length : 0;

          setGridInfo({
            columns: columnCount,
            rows: rowCount,
            gap: gap || '0px'
          });

          return;
        }

        parent = parent.parentElement;
      }

      setIsInGrid(false);
      setGridInfo(null);
    };

    // Check immediately and on window resize
    checkGridContext();
    window.addEventListener('resize', checkGridContext);

    // Use MutationObserver to detect DOM changes that might affect grid context
    const observer = new MutationObserver(checkGridContext);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => {
      window.removeEventListener('resize', checkGridContext);
      observer.disconnect();
    };
  }, []);

  return { isInGrid, gridInfo };
}

/**
 * Grid Compatible Wrapper Component
 */
export default function GridCompatibleWrapper({
  componentType,
  children,
  className = '',
  style = {},
  gridPosition,
  forceGridMode = false,
  disableGridAdaptation = false,
}: GridCompatibleWrapperProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { isInGrid, gridInfo } = useGridContext(wrapperRef);

  // Get component grid behavior
  const gridBehavior = useMemo(() => {
    return getComponentGridBehavior(componentType);
  }, [componentType]);

  // Determine if we should apply grid adaptations
  const shouldAdaptForGrid = useMemo(() => {
    if (disableGridAdaptation) return false;
    if (forceGridMode) return true;
    return isInGrid && gridBehavior !== null;
  }, [isInGrid, gridBehavior, forceGridMode, disableGridAdaptation]);

  // Calculate grid styles and classes
  const { adaptedClassName, adaptedStyle } = useMemo(() => {
    if (!shouldAdaptForGrid || !gridBehavior) {
      return {
        adaptedClassName: className,
        adaptedStyle: style
      };
    }

    // Get class modifications
    const { add: addClasses, remove: removeClasses } = getGridClassModifications(componentType);

    // Process className
    let classNames = className.split(' ').filter(cls => cls.length > 0);

    // Remove incompatible classes
    classNames = classNames.filter(cls => !removeClasses.includes(cls));

    // Add grid-specific classes
    classNames = [...classNames, ...addClasses];

    // Add grid positioning if specified
    if (gridPosition) {
      const { column, row, columnSpan = 1, rowSpan = 1 } = gridPosition;

      classNames.push('grid-item');

      const newStyle = {
        ...style,
        ...getGridStyles(componentType),
        gridColumn: `${column} / span ${columnSpan}`,
        gridRow: `${row} / span ${rowSpan}`,
      };

      return {
        adaptedClassName: classNames.join(' '),
        adaptedStyle: newStyle
      };
    }

    // Apply grid behavior styles
    const newStyle = {
      ...style,
      ...getGridStyles(componentType)
    };

    // Handle overlay positioning
    if (gridBehavior.positioning === 'absolute-overlay') {
      newStyle.position = 'absolute';
      newStyle.zIndex = 10;
    }

    // Handle responsive sizing
    if (gridBehavior.sizing === 'responsive') {
      if (!newStyle.width) newStyle.width = '100%';
      if (!newStyle.height && gridBehavior.constraints?.aspectRatio) {
        newStyle.aspectRatio = gridBehavior.constraints.aspectRatio.toString();
      }
    }

    return {
      adaptedClassName: classNames.join(' '),
      adaptedStyle: newStyle
    };
  }, [shouldAdaptForGrid, gridBehavior, componentType, className, style, gridPosition]);

  // Handle overlay components
  if (shouldAdaptForGrid && isGridOverlay(componentType)) {
    // Render overlay components in a portal or absolute positioning
    return (
      <div
        ref={wrapperRef}
        className={`grid-overlay-wrapper ${adaptedClassName}`}
        style={{
          position: 'relative',
          ...adaptedStyle
        }}
        data-grid-component={componentType}
        data-grid-mode="overlay"
      >
        {children}
      </div>
    );
  }

  // Standard grid item wrapper
  return (
    <div
      ref={wrapperRef}
      className={`grid-compatible-wrapper ${adaptedClassName}`}
      style={adaptedStyle}
      data-grid-component={componentType}
      data-grid-adapted={shouldAdaptForGrid}
      data-grid-info={gridInfo ? JSON.stringify(gridInfo) : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Higher-order component for adding grid compatibility
 */
export function withGridCompatibility<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentType: string,
  defaultGridBehavior?: Partial<ComponentGridBehavior>
) {
  const GridCompatibleComponent = React.forwardRef<any, P & GridCompatibleWrapperProps>(
    (props, ref) => {
      const { className, style, gridPosition, forceGridMode, disableGridAdaptation, ...otherProps } = props;

      return (
        <GridCompatibleWrapper
          componentType={componentType}
          className={className as string}
          style={style as React.CSSProperties}
          gridPosition={gridPosition}
          forceGridMode={forceGridMode}
          disableGridAdaptation={disableGridAdaptation}
        >
          <WrappedComponent ref={ref} {...(otherProps as P)} />
        </GridCompatibleWrapper>
      );
    }
  );

  GridCompatibleComponent.displayName = `GridCompatible(${WrappedComponent.displayName || WrappedComponent.name})`;

  return GridCompatibleComponent;
}

/**
 * Hook for getting grid context information
 */
export function useGridCompatibilityContext() {
  const elementRef = useRef<HTMLDivElement>(null);
  const { isInGrid, gridInfo } = useGridContext(elementRef);

  return {
    elementRef,
    isInGrid,
    gridInfo,
    isGridCompatible: true // Components using this hook are assumed to be grid-compatible
  };
}