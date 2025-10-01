import React from "react";
import { useGridCompatibilityContext } from './GridCompatibleWrapper';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface NeonBorderProps extends UniversalCSSProps {
  neonColor?: 'blue' | 'pink' | 'green' | 'purple' | 'cyan' | 'yellow';
  intensity?: 'soft' | 'medium' | 'bright';
  containerPadding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: boolean;
  children: React.ReactNode;

  // Internal prop from visual builder
  _positioningMode?: 'grid' | 'absolute';
}

export default function NeonBorder(props: NeonBorderProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    neonColor = 'blue',
    intensity = 'medium',
    containerPadding = 'md',
    rounded = true,
    children,
    _positioningMode
  } = componentProps;

  const { isInGrid } = useGridCompatibilityContext();

  // Override grid detection if component is in absolute positioning mode
  const shouldUseGridClasses = _positioningMode === 'absolute' ? false : isInGrid;

  const colorMap = {
    'blue': '#00f',
    'pink': '#f0f',
    'green': '#0f0',
    'purple': '#80f',
    'cyan': '#0ff',
    'yellow': '#ff0'
  };

  const shadowIntensity = {
    'soft': '0 0 5px',
    'medium': '0 0 10px',
    'bright': '0 0 15px'
  }[intensity];

  // Adaptive padding: smaller in grid, normal otherwise
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

  const roundedClass = rounded ? 'rounded-lg' : '';
  const selectedColor = colorMap[neonColor];

  const neonStyle = {
    border: `2px solid ${selectedColor}`,
    boxShadow: `${shadowIntensity} ${selectedColor}, inset ${shadowIntensity} ${selectedColor}`,
    animation: 'neonPulse 2s ease-in-out infinite alternate'
  };

  // Build base classes and apply CSS prop conflict removal
  const baseClasses = [
    paddingClass,
    roundedClass,
    shouldUseGridClasses ? 'w-full h-full' : '',
    _positioningMode === 'absolute' ? 'h-full' : ''
  ].filter(Boolean).join(' ');

  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const appliedStyles = applyCSSProps(cssProps);

  // Merge component styles with CSS props (CSS props win)
  const mergedStyles = {
    ...neonStyle,
    ...appliedStyles
  };

  return (
    <>
      <style jsx>{`
        @keyframes neonPulse {
          from {
            box-shadow: ${shadowIntensity} ${selectedColor}, inset ${shadowIntensity} ${selectedColor};
          }
          to {
            box-shadow: ${shadowIntensity} ${selectedColor}, ${shadowIntensity} ${selectedColor}, inset ${shadowIntensity} ${selectedColor};
          }
        }
      `}</style>
      <div
        className={filteredClasses}
        style={mergedStyles}
      >
        {children}
      </div>
    </>
  );
}