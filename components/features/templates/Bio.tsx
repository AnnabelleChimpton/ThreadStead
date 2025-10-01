import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import { useGridCompatibilityContext } from './GridCompatibleWrapper';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface BioProps extends UniversalCSSProps {
  className?: string;
}

export default function Bio(props: BioProps) {
  // Separate CSS properties from component-specific properties
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className: customClassName } = componentProps;

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

  // Apply CSS properties as inline styles for the bio text
  const bioTextStyle = applyCSSProps(cssProps);

  // Build bio text classes - USER STYLING IS ALWAYS QUEEN
  const bioTextClasses = `ts-bio-text ts-profile-bio leading-relaxed text-thread-charcoal ${isInGrid ? 'text-sm' : ''}`;
  const filteredBioTextClasses = removeTailwindConflicts(bioTextClasses, cssProps);

  return (
    <div className={containerClass}>
      <h3 className={`ts-bio-heading thread-headline ${isInGrid ? 'text-base' : 'text-xl'} font-bold ${isInGrid ? 'mb-1' : 'mb-2'} text-thread-pine`}>
        About Me
      </h3>
      <p className={filteredBioTextClasses} style={bioTextStyle}>
        {bio}
      </p>
    </div>
  );
}