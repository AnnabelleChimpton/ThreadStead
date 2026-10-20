import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface BioProps extends UniversalCSSProps {
  className?: string;
}

export default function Bio(props: BioProps) {
  // Separate CSS properties from component-specific properties
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className: customClassName } = componentProps;

  const { capabilities } = useResidentData();

  // Handle className being passed as array or string (fix parser issue)
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  const bio = capabilities?.bio;
  if (!bio) return null;

  // Always include base classes for targeting, add custom classes
  const containerClass = [
    'ts-profile-bio-section',
    'mb-4',
    normalizedCustomClassName
  ].filter(Boolean).join(' ');

  // Apply CSS properties as inline styles for the bio text
  const bioTextStyle = applyCSSProps(cssProps);

  // Build bio text classes - USER STYLING IS ALWAYS QUEEN
  const bioTextClasses = `ts-bio-text ts-profile-bio leading-relaxed text-thread-charcoal`;
  const filteredBioTextClasses = removeTailwindConflicts(bioTextClasses, cssProps);

  return (
    <div className={containerClass}>
      <h3 className="ts-bio-heading thread-headline text-xl font-bold mb-2 text-thread-pine">
        About Me
      </h3>
      <p className={filteredBioTextClasses} style={bioTextStyle}>
        {bio}
      </p>
    </div>
  );
}