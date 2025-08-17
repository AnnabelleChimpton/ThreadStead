import React from "react";

interface NeonBorderProps {
  color?: 'blue' | 'pink' | 'green' | 'purple' | 'cyan' | 'yellow';
  intensity?: 'soft' | 'medium' | 'bright';
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: boolean;
  children: React.ReactNode;
}

export default function NeonBorder({ 
  color = 'blue',
  intensity = 'medium',
  padding = 'md',
  rounded = true,
  children 
}: NeonBorderProps) {
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

  const paddingClass = {
    'xs': 'p-2',
    'sm': 'p-4',
    'md': 'p-6',
    'lg': 'p-8',
    'xl': 'p-12'
  }[padding];

  const roundedClass = rounded ? 'rounded-lg' : '';
  const selectedColor = colorMap[color];

  const neonStyle = {
    border: `2px solid ${selectedColor}`,
    boxShadow: `${shadowIntensity} ${selectedColor}, inset ${shadowIntensity} ${selectedColor}`,
    animation: 'neonPulse 2s ease-in-out infinite alternate'
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
        className={`${paddingClass} ${roundedClass}`}
        style={neonStyle}
      >
        {children}
      </div>
    </>
  );
}