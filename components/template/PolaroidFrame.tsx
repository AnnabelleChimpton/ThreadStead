import React from "react";

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
  const rotateClass = rotation !== 0 ? `rotate-[${rotation}deg]` : '';
  const shadowClass = shadow ? 'shadow-lg' : '';

  return (
    <div 
      className={`inline-block bg-white p-4 pb-12 ${rotateClass} ${shadowClass} transition-transform hover:scale-105`}
      style={{ 
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center'
      }}
    >
      <div className="bg-gray-100 border border-gray-200">
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