import React from "react";
import { useGridCompatibilityContext } from './GridCompatibleWrapper';

interface PolaroidFrameProps {
  caption?: string;
  rotation?: number;
  shadow?: boolean;
  children: React.ReactNode;

  // Internal prop from visual builder
  _positioningMode?: 'grid' | 'absolute';
}

export default function PolaroidFrame({
  caption = "",
  rotation = 0,
  shadow = true,
  children,

  // Internal props
  _positioningMode
}: PolaroidFrameProps) {
  const { isInGrid } = useGridCompatibilityContext();

  // Override grid detection if component is in absolute positioning mode
  const shouldUseGridClasses = _positioningMode === 'absolute' ? false : isInGrid;

  const rotateClass = rotation !== 0 ? `rotate-[${rotation}deg]` : '';
  const shadowClass = shadow ? 'shadow-lg' : '';

  return (
    <div
      className={`${
        shouldUseGridClasses ? 'w-full h-full aspect-[5/6] flex flex-col' : 'inline-block'
      } ${
        _positioningMode === 'absolute' ? 'h-full flex flex-col' : ''
      } bg-white ${
        shouldUseGridClasses ? 'p-2 pb-8' : 'p-4 pb-12'
      } ${rotateClass} ${shadowClass} transition-transform hover:scale-105`}
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center'
      }}
    >
      <div className={`bg-gray-100 border border-gray-200 ${
        shouldUseGridClasses ? 'flex-1' : ''
      } ${
        _positioningMode === 'absolute' ? 'flex-1' : ''
      }`}>
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