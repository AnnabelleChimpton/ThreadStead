import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import { useGridCompatibilityContext } from './GridCompatibleWrapper';

interface BioProps {
  className?: string;
}

export default function Bio({ className: customClassName }: BioProps) {
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

  return (
    <div className={containerClass}>
      <h3 className={`ts-bio-heading thread-headline ${isInGrid ? 'text-base' : 'text-xl'} font-bold ${isInGrid ? 'mb-1' : 'mb-2'} text-thread-pine`}>
        About Me
      </h3>
      <p className={`ts-bio-text ts-profile-bio leading-relaxed text-thread-charcoal ${isInGrid ? 'text-sm' : ''}`}>
        {bio}
      </p>
    </div>
  );
}