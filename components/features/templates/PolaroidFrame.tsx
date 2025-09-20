import React from "react";
import { useGridCompatibilityContext } from './GridCompatibleWrapper';

interface PolaroidFrameProps {
  caption?: string;
  rotation?: number;
  shadow?: boolean;
  children: React.ReactNode;
}

export default function PolaroidFrame({ 
  caption = "",
  rotation = 0,
  shadow = true,
  children 
}: PolaroidFrameProps) {
  const { isInGrid } = useGridCompatibilityContext();

  const rotateClass = rotation !== 0 ? `rotate-[${rotation}deg]` : '';
  const shadowClass = shadow ? 'shadow-lg' : '';

  return (
    <div
      className={`${isInGrid ? 'w-full h-full aspect-[5/6] flex flex-col' : 'inline-block'} bg-white ${isInGrid ? 'p-2 pb-8' : 'p-4 pb-12'} ${rotateClass} ${shadowClass} transition-transform hover:scale-105`}
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center'
      }}
    >
      <div className={`bg-gray-100 border border-gray-200 ${isInGrid ? 'flex-1' : ''}`}>
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