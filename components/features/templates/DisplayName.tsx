import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import { useGridCompatibilityContext } from './GridCompatibleWrapper';

interface DisplayNameProps {
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div';
  showLabel?: boolean;
  className?: string;
  // Text CSS properties (passed as flat props, will be merged into style)
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textColor?: string;
  lineHeight?: string | number;
  textDecoration?: string;
  fontStyle?: string;
  textTransform?: string;
  letterSpacing?: string;
  style?: React.CSSProperties;
}

export default function DisplayName({
  as = 'h2',
  showLabel = false,
  className: customClassName,
  // Destructure text CSS properties
  fontSize,
  fontFamily,
  fontWeight,
  textAlign,
  textColor,
  lineHeight,
  textDecoration,
  fontStyle,
  textTransform,
  letterSpacing,
  style: propStyle
}: DisplayNameProps) {
  const { owner } = useResidentData();
  const { isInGrid } = useGridCompatibilityContext();

  // Handle className being passed as array or string (fix parser issue)
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  // Adaptive text sizing: smaller in grid, normal size otherwise
  const adaptiveTextSize = isInGrid ? 'text-lg sm:text-xl' : 'text-3xl';
  const adaptiveMargin = isInGrid ? 'mb-0' : 'mb-1';

  // Always include base classes for targeting, add custom classes
  const baseClasses = `ts-profile-display-name thread-headline ${adaptiveTextSize} font-bold ${adaptiveMargin} text-thread-pine`;
  const finalClassName = normalizedCustomClassName
    ? `${baseClasses} ${normalizedCustomClassName}`
    : baseClasses;

  // Merge text CSS properties into inline styles
  const style: React.CSSProperties = {
    ...(fontSize ? { fontSize } : {}),
    ...(fontFamily ? { fontFamily } : {}),
    ...(fontWeight ? { fontWeight } : {}),
    ...(textAlign ? { textAlign: textAlign as React.CSSProperties['textAlign'] } : {}),
    ...(textColor ? { color: textColor } : {}),
    ...(lineHeight ? { lineHeight } : {}),
    ...(textDecoration ? { textDecoration: textDecoration as React.CSSProperties['textDecoration'] } : {}),
    ...(fontStyle ? { fontStyle: fontStyle as React.CSSProperties['fontStyle'] } : {}),
    ...(textTransform ? { textTransform: textTransform as React.CSSProperties['textTransform'] } : {}),
    ...(letterSpacing ? { letterSpacing } : {}),
    // User-provided style prop comes last (highest priority)
    ...propStyle
  };
  const displayName = owner?.displayName || '';
  const content = showLabel ? `Display Name: ${displayName}` : displayName;
  
  const Element = as;
  
  return (
    <Element className={finalClassName} style={style}>
      {content}
    </Element>
  );
}