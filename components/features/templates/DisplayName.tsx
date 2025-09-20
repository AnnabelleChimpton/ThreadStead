import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import { useGridCompatibilityContext } from './GridCompatibleWrapper';

interface DisplayNameProps {
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div';
  showLabel?: boolean;
  className?: string;
}

export default function DisplayName({ as = 'h2', showLabel = false, className: customClassName }: DisplayNameProps) {
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