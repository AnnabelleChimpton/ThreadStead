import React from 'react';
import { useResidentData } from './ResidentDataProvider';

interface BioProps {
  className?: string;
}

export default function Bio({ className: customClassName }: BioProps) {
  const { capabilities } = useResidentData();
  
  // Handle className being passed as array or string (fix parser issue)
  const normalizedCustomClassName = Array.isArray(customClassName) 
    ? customClassName.join(' ')
    : customClassName;
  
  // Get bio from capabilities or use a default
  const bio = capabilities?.bio || "Welcome to my profile!";

  // Always include base classes for targeting, add custom classes
  const containerClass = normalizedCustomClassName 
    ? `ts-profile-bio-section mb-4 ${normalizedCustomClassName}` 
    : "ts-profile-bio-section mb-4";

  return (
    <div className={containerClass}>
      <h3 className="ts-bio-heading thread-headline text-xl font-bold mb-2 text-thread-pine">
        About Me
      </h3>
      <p className="ts-bio-text ts-profile-bio leading-relaxed text-thread-charcoal">
        {bio}
      </p>
    </div>
  );
}