import React from 'react';
import { useResidentData } from './ResidentDataProvider';

interface DisplayNameProps {
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div';
  showLabel?: boolean;
  className?: string;
}

export default function DisplayName({ as = 'h2', showLabel = false, className: customClassName }: DisplayNameProps) {
  const { owner } = useResidentData();
  
  // Handle className being passed as array or string (fix parser issue)
  const normalizedCustomClassName = Array.isArray(customClassName) 
    ? customClassName.join(' ')
    : customClassName;
  
  // Always include base classes for targeting, add custom classes
  const baseClasses = 'ts-profile-display-name thread-headline text-3xl font-bold mb-1 text-thread-pine';
  const finalClassName = normalizedCustomClassName 
    ? `${baseClasses} ${normalizedCustomClassName}` 
    : baseClasses;
  
  // Remove inline styles to avoid conflicts - let CSS handle everything
  const style = undefined;
  const displayName = owner?.displayName || '';
  const content = showLabel ? `Display Name: ${displayName}` : displayName;
  
  const Element = as;
  
  return (
    <Element className={finalClassName} style={style}>
      {content}
    </Element>
  );
}