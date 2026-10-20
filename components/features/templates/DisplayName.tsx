import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface DisplayNameProps extends UniversalCSSProps {
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div';
  showLabel?: boolean;
  className?: string;
}

export default function DisplayName(props: DisplayNameProps) {
  // Separate CSS properties from component-specific properties
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    as = 'h2',
    showLabel = false,
    className: customClassName
  } = componentProps;

  const { owner } = useResidentData();

  // Handle className being passed as array or string (fix parser issue)
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  // Build base classes - USER STYLING IS ALWAYS QUEEN
  const baseClasses = `ts-profile-display-name thread-headline text-3xl font-bold mb-1 text-thread-pine`;

  // Remove Tailwind classes that conflict with CSS props
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);

  const finalClassName = normalizedCustomClassName
    ? `${filteredClasses} ${normalizedCustomClassName}`
    : filteredClasses;

  // Apply CSS properties as inline styles
  const style = applyCSSProps(cssProps);

  const displayName = owner?.displayName || '';
  const content = showLabel ? `Display Name: ${displayName}` : displayName;
  
  const Element = as;
  
  return (
    <Element className={finalClassName} style={style}>
      {content}
    </Element>
  );
}