import React from "react";
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface PolaroidFrameProps extends UniversalCSSProps {
  caption?: string;
  rotation?: number;
  shadow?: boolean;
  children: React.ReactNode;
}

export default function PolaroidFrame(props: PolaroidFrameProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    caption = "",
    rotation = 0,
    shadow = true,
    children
  } = componentProps;

  const rotateClass = rotation !== 0 ? `rotate-[${rotation}deg]` : '';
  const shadowClass = shadow ? 'shadow-lg' : '';

  const baseClasses = [
    'inline-block',
    'bg-white',
    'p-4 pb-12',
    rotateClass,
    shadowClass,
    'transition-transform hover:scale-105'
  ].filter(Boolean).join(' ');

  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const appliedStyles = applyCSSProps(cssProps);

  // Merge component styles with CSS props (CSS props win)
  const mergedStyles = {
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center',
    ...appliedStyles
  };

  return (
    <div
      className={filteredClasses}
      style={mergedStyles}
    >
      <div className="bg-gray-100 border border-gray-200  ">
        {children}
      </div>
      {caption && (
        <div className="mt-3 text-center text-sm text-gray-700 font-handwriting">
          {caption}
        </div>
      )}
    </div>
  );
}