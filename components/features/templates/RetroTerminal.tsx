import React from "react";
import { useGridCompatibilityContext } from './GridCompatibleWrapper';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface RetroTerminalProps extends UniversalCSSProps {
  variant?: 'green' | 'amber' | 'blue' | 'white';
  showHeader?: boolean | string;
  containerPadding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;

  // Internal prop from visual builder
  _positioningMode?: 'grid' | 'absolute';
}

export default function RetroTerminal(props: RetroTerminalProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    variant = 'green',
    showHeader = true,
    containerPadding = 'md',
    children,
    _positioningMode
  } = componentProps;

  const { isInGrid } = useGridCompatibilityContext();

  // Override grid detection if component is in absolute positioning mode
  const shouldUseGridClasses = _positioningMode === 'absolute' ? false : isInGrid;

  // Convert string values to boolean (HTML attributes come as strings)
  const shouldShowHeader = showHeader === true || showHeader === 'true';
  const variantStyles = {
    'green': {
      bg: 'bg-black',
      text: 'text-green-400',
      border: 'border-green-400'
    },
    'amber': {
      bg: 'bg-black',
      text: 'text-amber-400',
      border: 'border-amber-400'
    },
    'blue': {
      bg: 'bg-black',
      text: 'text-blue-400',
      border: 'border-blue-400'
    },
    'white': {
      bg: 'bg-black',
      text: 'text-white',
      border: 'border-white'
    }
  }[variant] || {
    bg: 'bg-black',
    text: 'text-green-400',
    border: 'border-green-400'
  };

  // Grid-aware padding
  const paddingClass = shouldUseGridClasses ? {
    'xs': 'p-1',
    'sm': 'p-2',
    'md': 'p-3',
    'lg': 'p-4',
    'xl': 'p-6'
  }[containerPadding] : {
    'xs': 'p-2',
    'sm': 'p-4',
    'md': 'p-6',
    'lg': 'p-8',
    'xl': 'p-12'
  }[containerPadding];

  const baseContainerClasses = [
    variantStyles.bg,
    variantStyles.border,
    'border-2',
    'rounded',
    'font-mono',
    'shadow-lg',
    shouldUseGridClasses ? 'w-full h-full' : '',
    _positioningMode === 'absolute' ? 'h-full flex flex-col' : ''
  ].filter(Boolean).join(' ');

  const filteredClasses = removeTailwindConflicts(baseContainerClasses, cssProps);
  const appliedStyles = applyCSSProps(cssProps);

  return (
    <div className={filteredClasses} style={appliedStyles}>
      {shouldShowHeader && (
        <div className={`${variantStyles.text} border-b ${variantStyles.border} px-4 py-2 text-sm flex items-center gap-2`}>
          <span className="inline-block w-3 h-3 bg-red-500 rounded-full"></span>
          <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
          <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
          <span className="ml-2">terminal</span>
        </div>
      )}
      <div className={`${variantStyles.text} ${paddingClass} ${
        _positioningMode === 'absolute' ? 'flex-1' : ''
      }`}>
        {children}
      </div>
    </div>
  );
}