/**
 * Standard Component Interface for Template Components
 *
 * This defines the canonical interface that all template components should follow
 * to ensure predictable, web-standard behavior for developers.
 */

import { CSSProperties, ReactNode } from 'react';

/**
 * Internal system context passed by the visual builder
 * These props are NOT part of the public API and should not be documented
 */
export interface VisualBuilderContext {
  isInVisualBuilder: boolean;
  onContentChange?: (content: string) => void;
  onPropsChange?: (props: Record<string, any>) => void;
  positioningMode?: 'normal' | 'absolute' | 'grid';
  size?: { width: string; height: string };
  isSelected?: boolean;
  isHovered?: boolean;
}

/**
 * Standard props that every template component should accept
 * Based on HTML/CSS standards for maximum predictability
 */
export interface StandardComponentProps {
  // Standard HTML/React props (always available)
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  id?: string;

  // Standard HTML attributes that make sense for template components
  title?: string;
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;

  // Standard CSS properties as first-class props for common styling
  // These map directly to CSS properties, making them predictable
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  lineHeight?: string | number;
  textAlign?: 'left' | 'center' | 'right' | 'justify' | 'start' | 'end';
  textIndent?: string;
  whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-line' | 'pre-wrap';
  wordBreak?: 'normal' | 'break-all' | 'keep-all' | 'break-word';
  overflowWrap?: 'normal' | 'break-word' | 'anywhere';
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  border?: string;
  borderRadius?: string;
  borderColor?: string;
  borderWidth?: number | string;
  boxShadow?: string;
  opacity?: string | number;
  blur?: number;

  // Standard CSS positioning (when component supports positioning)
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;
  zIndex?: number;

  // Standard CSS layout properties
  display?: string;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'start' | 'end' | 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch';
  alignItems?: 'start' | 'end' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  alignContent?: 'start' | 'end' | 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridTemplateAreas?: string;
  gridAutoColumns?: string;
  gridAutoRows?: string;
  gridAutoFlow?: string;
  gridColumn?: string;
  gridRow?: string;
  gridArea?: string;
  rowGap?: string;
  columnGap?: string;
  justifyItems?: 'start' | 'end' | 'center' | 'stretch';
  justifySelf?: 'start' | 'end' | 'center' | 'stretch';
  alignSelf?: 'start' | 'end' | 'center' | 'stretch';

  // Content and HTML element properties
  content?: string;
  tagName?: string;
  as?: string; // Polymorphic component - what HTML element to render as

  // Component size and appearance properties
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | string;
  shape?: 'circle' | 'square' | 'rounded' | string;
  colors?: string[]; // For gradient components
  direction?: number; // Gradient direction in degrees

  // Advanced CSS override for complex styling
  css?: CSSProperties;
  cssRenderMode?: string;

  // Internal system props (prefixed with __ to indicate they're not public API)
  __visualBuilder?: VisualBuilderContext;
}

/**
 * Props for components that contain editable text content
 */
export interface TextContentProps extends StandardComponentProps {
  content?: string;
  placeholder?: string;
  contentEditable?: boolean;
}

/**
 * Props for container components that manage child layouts
 */
export interface ContainerProps extends StandardComponentProps {
  // Standard CSS container properties
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowX?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowY?: 'visible' | 'hidden' | 'scroll' | 'auto';
}

/**
 * Props for media components (images, videos, etc.)
 */
export interface MediaProps extends StandardComponentProps {
  src?: string;
  alt?: string;
  loading?: 'lazy' | 'eager';
  objectFit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
  objectPosition?: string;
}

/**
 * Props for interactive components (buttons, forms, etc.)
 */
export interface InteractiveProps extends StandardComponentProps {
  disabled?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void;
  tabIndex?: number;
}

/**
 * Utility type to extract public props (excludes internal __ prefixed props)
 */
export type PublicProps<T> = Omit<T, keyof { [K in keyof T as K extends `__${string}` ? K : never]: T[K] }>;

/**
 * Utility to separate internal system props from public props
 */
export function separateSystemProps<T extends Record<string, any>>(
  props: T
): {
  publicProps: PublicProps<T>;
  systemProps: VisualBuilderContext | undefined;
} {
  const { __visualBuilder, ...publicProps } = props;

  return {
    publicProps: publicProps as unknown as PublicProps<T>,
    systemProps: __visualBuilder
  };
}

/**
 * Utility to convert CSS properties to inline styles
 * Handles unit conversion and validation
 */
export function propsToCSS(props: StandardComponentProps): CSSProperties {
  const style: CSSProperties = { ...props.style };

  // Map standard props to CSS properties
  if (props.backgroundColor) style.backgroundColor = props.backgroundColor;
  if (props.color) style.color = props.color;
  if (props.fontSize) style.fontSize = props.fontSize;
  if (props.fontFamily) style.fontFamily = props.fontFamily;
  if (props.fontWeight) style.fontWeight = props.fontWeight;
  if (props.textAlign) style.textAlign = props.textAlign;
  if (props.padding) style.padding = props.padding;
  if (props.margin) style.margin = props.margin;
  if (props.border) style.border = props.border;
  if (props.borderRadius) style.borderRadius = props.borderRadius;
  if (props.boxShadow) style.boxShadow = props.boxShadow;
  if (props.opacity !== undefined) style.opacity = props.opacity;

  // Positioning
  if (props.position) style.position = props.position;
  if (props.top) style.top = props.top;
  if (props.right) style.right = props.right;
  if (props.bottom) style.bottom = props.bottom;
  if (props.left) style.left = props.left;
  if (props.width) style.width = props.width;
  if (props.height) style.height = props.height;
  if (props.minWidth) style.minWidth = props.minWidth;
  if (props.minHeight) style.minHeight = props.minHeight;
  if (props.maxWidth) style.maxWidth = props.maxWidth;
  if (props.maxHeight) style.maxHeight = props.maxHeight;
  if (props.zIndex !== undefined) style.zIndex = props.zIndex;

  // Layout
  if (props.display) style.display = props.display;
  if (props.flexDirection) style.flexDirection = props.flexDirection;
  if (props.justifyContent) style.justifyContent = props.justifyContent;
  if (props.alignItems) style.alignItems = props.alignItems;
  if (props.gap) style.gap = props.gap;
  if (props.gridTemplateColumns) style.gridTemplateColumns = props.gridTemplateColumns;
  if (props.gridTemplateRows) style.gridTemplateRows = props.gridTemplateRows;
  if (props.gridColumn) style.gridColumn = props.gridColumn;
  if (props.gridRow) style.gridRow = props.gridRow;

  // Advanced CSS override
  if (props.css) {
    Object.assign(style, props.css);
  }

  return style;
}

/**
 * Standard component wrapper that handles system props and applies standard styling
 * NOTE: This function has been temporarily removed due to JSX in .ts file
 * TODO: Move to separate .tsx file if needed for component creation utilities
 */
// export function withStandardProps<T extends StandardComponentProps>(
//   Component: React.ComponentType<T>,
//   defaultElement: keyof JSX.IntrinsicElements = 'div'
// ) {
//   return function StandardizedComponent(props: T) {
//     const { publicProps, systemProps } = separateSystemProps(props);
//     const style = propsToCSS(publicProps);
//     // ... implementation
//   };
// }