/**
 * Grid - CSS Grid Layout Component
 *
 * A simple, predictable wrapper around CSS Grid that uses standard CSS properties.
 * No custom abstractions - just enhanced CSS Grid with convenient props.
 */

import React from 'react';
import {
  StandardComponentProps,
  separateSystemProps,
} from '@/lib/templates/core/standard-component-interface';
import { useCSSNativeStyles } from '@/lib/templates/styling/css-native-styling';

/**
 * Standard Grid props using CSS Grid property names
 */
export interface GridProps extends StandardComponentProps {
  // CSS Grid properties (familiar to web developers!)
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridTemplateAreas?: string;
  gridAutoColumns?: string;
  gridAutoRows?: string;
  gridAutoFlow?: 'row' | 'column' | 'row dense' | 'column dense';
  gap?: string;
  rowGap?: string;
  columnGap?: string;
  alignItems?: 'start' | 'end' | 'center' | 'stretch';
  justifyItems?: 'start' | 'end' | 'center' | 'stretch';
  alignContent?: 'start' | 'end' | 'center' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';
  justifyContent?: 'start' | 'end' | 'center' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';

  // Convenience props for common patterns
  columns?: number | string; // Shorthand for repeat(n, 1fr)
  rows?: number | string; // Shorthand for repeat(n, auto)
  areas?: string[]; // Array of grid area definitions

  // Responsive behavior
  responsive?: {
    mobile?: Partial<Pick<GridProps, 'gridTemplateColumns' | 'gridTemplateRows' | 'gap' | 'columns' | 'rows'>>;
    tablet?: Partial<Pick<GridProps, 'gridTemplateColumns' | 'gridTemplateRows' | 'gap' | 'columns' | 'rows'>>;
    desktop?: Partial<Pick<GridProps, 'gridTemplateColumns' | 'gridTemplateRows' | 'gap' | 'columns' | 'rows'>>;
  };
}

/**
 * Grid Item props for child components
 */
export interface GridItemProps extends StandardComponentProps {
  gridColumn?: string;
  gridRow?: string;
  gridArea?: string;
  justifySelf?: 'start' | 'end' | 'center' | 'stretch';
  alignSelf?: 'start' | 'end' | 'center' | 'stretch';

  // Convenience props
  column?: number | string; // Grid column position
  row?: number | string; // Grid row position
  colSpan?: number; // Column span
  rowSpan?: number; // Row span
}

/**
 * Convert convenience props to CSS Grid values
 */
function processGridProps(props: GridProps): Partial<StandardComponentProps> {
  const cssProps: Partial<StandardComponentProps> = {};

  // Handle columns shorthand
  if (props.columns) {
    if (typeof props.columns === 'number') {
      cssProps.gridTemplateColumns = `repeat(${props.columns}, 1fr)`;
    } else {
      cssProps.gridTemplateColumns = props.columns;
    }
  } else if (props.gridTemplateColumns) {
    cssProps.gridTemplateColumns = props.gridTemplateColumns;
  }

  // Handle rows shorthand
  if (props.rows) {
    if (typeof props.rows === 'number') {
      cssProps.gridTemplateRows = `repeat(${props.rows}, auto)`;
    } else {
      cssProps.gridTemplateRows = props.rows;
    }
  } else if (props.gridTemplateRows) {
    cssProps.gridTemplateRows = props.gridTemplateRows;
  }

  // Handle areas shorthand
  if (props.areas) {
    cssProps.gridTemplateAreas = props.areas.map(area => `"${area}"`).join(' ');
  } else if (props.gridTemplateAreas) {
    cssProps.gridTemplateAreas = props.gridTemplateAreas;
  }

  // Copy other grid properties directly
  const gridProperties: Array<keyof GridProps> = [
    'gridAutoColumns', 'gridAutoRows', 'gridAutoFlow', 'gap', 'rowGap', 'columnGap',
    'alignItems', 'justifyItems', 'alignContent', 'justifyContent'
  ];

  gridProperties.forEach(prop => {
    if (props[prop] !== undefined) {
      (cssProps as any)[prop] = props[prop];
    }
  });

  return cssProps;
}

/**
 * Convert GridItem convenience props to CSS Grid values
 */
function processGridItemProps(props: GridItemProps): Partial<StandardComponentProps> {
  const cssProps: Partial<StandardComponentProps> = {};

  // Handle column convenience prop
  if (props.column !== undefined) {
    if (props.colSpan) {
      cssProps.gridColumn = `${props.column} / span ${props.colSpan}`;
    } else {
      cssProps.gridColumn = String(props.column);
    }
  } else if (props.gridColumn) {
    cssProps.gridColumn = props.gridColumn;
  }

  // Handle row convenience prop
  if (props.row !== undefined) {
    if (props.rowSpan) {
      cssProps.gridRow = `${props.row} / span ${props.rowSpan}`;
    } else {
      cssProps.gridRow = String(props.row);
    }
  } else if (props.gridRow) {
    cssProps.gridRow = props.gridRow;
  }

  // Copy other properties directly
  if (props.gridArea) cssProps.gridArea = props.gridArea;
  if (props.justifySelf) cssProps.justifySelf = props.justifySelf;
  if (props.alignSelf) cssProps.alignSelf = props.alignSelf;

  return cssProps;
}

/**
 * Grid Component
 */
export function Grid({
  children,
  className = '',
  responsive,
  ...rest
}: GridProps) {
  // Separate system props from public props
  const { publicProps, systemProps } = separateSystemProps(rest);

  // Process grid-specific props
  const gridProps = processGridProps(rest);

  // Build styles using CSS-native system
  const baseStyles = useCSSNativeStyles({
    display: 'grid',
    ...gridProps,
    ...publicProps,
  });

  // Add responsive styles if provided
  const responsiveStyles = responsive ? {
    '@media (max-width: 767px)': responsive.mobile ? processGridProps(responsive.mobile) : {},
    '@media (min-width: 768px) and (max-width: 1023px)': responsive.tablet ? processGridProps(responsive.tablet) : {},
    '@media (min-width: 1024px)': responsive.desktop ? processGridProps(responsive.desktop) : {},
  } : {};

  // Visual builder specific styles
  const visualBuilderStyles = systemProps?.isInVisualBuilder ? {
    minHeight: '4rem',
    minWidth: '8rem',
    // Use outline instead of border to avoid affecting layout
    outline: systemProps.isSelected ? '2px solid #3b82f6' : '1px dashed #d1d5db',
    outlineOffset: '-1px', // Keep outline inside the element
    position: 'relative' as const,
  } : {};

  const finalStyles = {
    ...baseStyles,
    ...responsiveStyles,
    ...visualBuilderStyles,
  };

  return (
    <div
      className={className}
      style={finalStyles}
    >
      {children}
    </div>
  );
}

/**
 * Grid Item Component
 */
export function GridItem({
  children,
  className = '',
  ...rest
}: GridItemProps) {
  // Separate system props from public props
  const { publicProps, systemProps } = separateSystemProps(rest);

  // Process grid item specific props
  const gridItemProps = processGridItemProps(rest);

  // Build styles using CSS-native system
  const styles = useCSSNativeStyles({
    ...gridItemProps,
    ...publicProps,
  });

  // Visual builder specific styles
  const visualBuilderStyles = systemProps?.isInVisualBuilder ? {
    // Remove minHeight to avoid forcing row heights - let content dictate size
    minWidth: '2rem', // Reduced minimum width
    outline: systemProps.isSelected ? '2px solid #3b82f6' : 'none',
    backgroundColor: systemProps.isHovered ? '#f8fafc' : undefined,
  } : {};

  const finalStyles = {
    ...styles,
    ...visualBuilderStyles,
  };

  return (
    <div
      className={className}
      style={finalStyles}
    >
      {children}
    </div>
  );
}

export default Grid;

/**
 * Usage Examples:
 *
 * // Simple 12-column grid (familiar to Bootstrap developers!)
 * <Grid columns={12} gap="1rem">
 *   <GridItem column={1} colSpan={6}>Left half</GridItem>
 *   <GridItem column={7} colSpan={6}>Right half</GridItem>
 * </Grid>
 *
 * // CSS Grid template areas (familiar to CSS Grid developers!)
 * <Grid
 *   gridTemplateColumns="200px 1fr 100px"
 *   gridTemplateRows="auto 1fr auto"
 *   areas={[
 *     "header header header",
 *     "sidebar content ads",
 *     "footer footer footer"
 *   ]}
 *   gap="1rem"
 * >
 *   <GridItem gridArea="header">Header</GridItem>
 *   <GridItem gridArea="sidebar">Sidebar</GridItem>
 *   <GridItem gridArea="content">Main Content</GridItem>
 *   <GridItem gridArea="ads">Ads</GridItem>
 *   <GridItem gridArea="footer">Footer</GridItem>
 * </Grid>
 *
 * // Responsive grid
 * <Grid
 *   columns={4}
 *   gap="2rem"
 *   responsive={{
 *     mobile: { columns: 1, gap: "1rem" },
 *     tablet: { columns: 2 },
 *     desktop: { columns: 4 }
 *   }}
 * >
 *   <GridItem>Item 1</GridItem>
 *   <GridItem>Item 2</GridItem>
 *   <GridItem>Item 3</GridItem>
 *   <GridItem>Item 4</GridItem>
 * </Grid>
 *
 * // Advanced CSS Grid (full CSS power available!)
 * <Grid
 *   gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))"
 *   gap="1rem"
 *   alignItems="start"
 * >
 *   <GridItem>Auto-fitting item 1</GridItem>
 *   <GridItem>Auto-fitting item 2</GridItem>
 *   <GridItem>Auto-fitting item 3</GridItem>
 * </Grid>
 */