import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import { useGridCompatibilityContext } from './GridCompatibleWrapper';

interface BioProps {
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

export default function Bio({
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
}: BioProps) {
  const { capabilities } = useResidentData();
  const { isInGrid } = useGridCompatibilityContext();

  // Handle className being passed as array or string (fix parser issue)
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  // Get bio from capabilities or use a default
  const bio = capabilities?.bio || "Welcome to my profile!";

  // Grid-adaptive styling
  const gridAdaptiveClasses = isInGrid ? 'w-full h-full overflow-y-auto' : '';
  const adaptiveMargin = isInGrid ? 'mb-2' : 'mb-4';

  // Always include base classes for targeting, add custom classes
  const containerClass = [
    'ts-profile-bio-section',
    adaptiveMargin,
    gridAdaptiveClasses,
    normalizedCustomClassName
  ].filter(Boolean).join(' ');

  // Merge text CSS properties into inline styles for the bio text
  const bioTextStyle: React.CSSProperties = {
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

  return (
    <div className={containerClass}>
      <h3 className={`ts-bio-heading thread-headline ${isInGrid ? 'text-base' : 'text-xl'} font-bold ${isInGrid ? 'mb-1' : 'mb-2'} text-thread-pine`}>
        About Me
      </h3>
      <p className={`ts-bio-text ts-profile-bio leading-relaxed text-thread-charcoal ${isInGrid ? 'text-sm' : ''}`} style={bioTextStyle}>
        {bio}
      </p>
    </div>
  );
}