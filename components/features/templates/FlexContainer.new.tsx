/**
 * FlexContainer - Web Standards Edition
 *
 * This is the new version of FlexContainer that follows web standards
 * and uses the CSS-native styling system. It demonstrates how components
 * should be built after the migration.
 */

import React from 'react';
import {
  StandardComponentProps,
  InteractiveProps,
  separateSystemProps,
  propsToCSS,
} from '@/lib/templates/core/standard-component-interface';
import { useCSSNativeStyles, responsive } from '@/lib/templates/styling/css-native-styling';
import { withMigrationSupport } from '@/lib/templates/core/migration-utilities';

/**
 * Standard FlexContainer props using CSS property names and values
 * No custom abstractions - everything maps directly to CSS!
 */
export interface FlexContainerProps extends StandardComponentProps, InteractiveProps {
  // Standard CSS Flexbox properties (predictable!)
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  alignContent?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: string; // CSS gap value: '1rem', '16px', etc.

  // Responsive behavior (optional convenience feature)
  responsive?: {
    mobile?: Pick<FlexContainerProps, 'flexDirection' | 'justifyContent' | 'alignItems' | 'gap'>;
    tablet?: Pick<FlexContainerProps, 'flexDirection' | 'justifyContent' | 'alignItems' | 'gap'>;
    desktop?: Pick<FlexContainerProps, 'flexDirection' | 'justifyContent' | 'alignItems' | 'gap'>;
  };
}

/**
 * New FlexContainer implementation using web standards
 */
function FlexContainerNew({
  // Flexbox props (with sensible defaults)
  flexDirection = 'row',
  justifyContent = 'flex-start',
  alignItems = 'stretch',
  alignContent,
  flexWrap = 'nowrap',
  gap = '0',

  // Responsive behavior
  responsive: responsiveStyles,

  // Standard props
  children,
  className = '',
  onClick,

  ...rest
}: FlexContainerProps) {
  // Separate system props from public props
  const { publicProps, systemProps } = separateSystemProps(rest);

  // Build base styles using CSS-native system
  const baseStyles = useCSSNativeStyles({
    display: 'flex',
    flexDirection,
    justifyContent,
    alignItems,
    alignContent,
    flexWrap,
    gap,
    ...publicProps,
  });

  // Add responsive styles if provided
  const responsiveCSS = responsiveStyles
    ? responsive({
        base: baseStyles,
        mobile: responsiveStyles.mobile ? {
          flexDirection: responsiveStyles.mobile.flexDirection,
          justifyContent: responsiveStyles.mobile.justifyContent,
          alignItems: responsiveStyles.mobile.alignItems,
          gap: responsiveStyles.mobile.gap,
        } : undefined,
        tablet: responsiveStyles.tablet ? {
          flexDirection: responsiveStyles.tablet.flexDirection,
          justifyContent: responsiveStyles.tablet.justifyContent,
          alignItems: responsiveStyles.tablet.alignItems,
          gap: responsiveStyles.tablet.gap,
        } : undefined,
        desktop: responsiveStyles.desktop ? {
          flexDirection: responsiveStyles.desktop.flexDirection,
          justifyContent: responsiveStyles.desktop.justifyContent,
          alignItems: responsiveStyles.desktop.alignItems,
          gap: responsiveStyles.desktop.gap,
        } : undefined,
      })
    : baseStyles;

  // Visual builder specific styles
  const visualBuilderStyles = systemProps?.isInVisualBuilder
    ? {
        minHeight: '2rem', // Minimum size for selection
        minWidth: '4rem',
        border: systemProps.isSelected ? '2px solid #3b82f6' : 'none',
        outline: systemProps.isHovered ? '1px dashed #6b7280' : 'none',
      }
    : {};

  const finalStyles = {
    ...responsiveCSS,
    ...visualBuilderStyles,
  };

  // Clean props for DOM (remove non-HTML attributes)
  const domProps = {
    className,
    style: finalStyles,
    onClick,
    // Only include valid HTML attributes
    id: publicProps.id,
    title: publicProps.title,
    role: publicProps.role,
    'aria-label': publicProps['aria-label'],
    'aria-labelledby': publicProps['aria-labelledby'],
    'aria-describedby': publicProps['aria-describedby'],
  };

  return <div {...domProps}>{children}</div>;
}

/**
 * Enhanced FlexContainer with backward compatibility
 * This wrapper provides migration support for the old prop format
 */
const FlexContainer = withMigrationSupport(FlexContainerNew, 'FlexContainer');

export default FlexContainer;

/**
 * Usage Examples:
 *
 * // Standard CSS approach (web developers will understand this immediately!)
 * <FlexContainer
 *   flexDirection="row"
 *   justifyContent="space-between"
 *   alignItems="center"
 *   gap="1rem"
 * >
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </FlexContainer>
 *
 * // With responsive behavior
 * <FlexContainer
 *   flexDirection="row"
 *   gap="2rem"
 *   responsive={{
 *     mobile: { flexDirection: 'column', gap: '1rem' },
 *     tablet: { gap: '1.5rem' }
 *   }}
 * >
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </FlexContainer>
 *
 * // With standard CSS styling
 * <FlexContainer
 *   justifyContent="center"
 *   alignItems="center"
 *   backgroundColor="#f3f4f6"
 *   padding="2rem"
 *   borderRadius="0.5rem"
 * >
 *   <div>Centered content</div>
 * </FlexContainer>
 *
 * // Advanced CSS override
 * <FlexContainer
 *   css={{
 *     background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
 *     '&:hover': { transform: 'scale(1.02)' }
 *   }}
 * >
 *   <div>Advanced styling</div>
 * </FlexContainer>
 */