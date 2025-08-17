import React from "react";

interface RetroTerminalProps {
  variant?: 'green' | 'amber' | 'blue' | 'white';
  showHeader?: boolean;
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export default function RetroTerminal({ 
  variant = 'green',
  showHeader = true,
  padding = 'md',
  children 
}: RetroTerminalProps) {
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
  }[variant];

  const paddingClass = {
    'xs': 'p-2',
    'sm': 'p-4',
    'md': 'p-6',
    'lg': 'p-8',
    'xl': 'p-12'
  }[padding];

  return (
    <div className={`${variantStyles.bg} ${variantStyles.border} border-2 rounded font-mono shadow-lg`}>
      {showHeader && (
        <div className={`${variantStyles.text} border-b ${variantStyles.border} px-4 py-2 text-sm flex items-center gap-2`}>
          <span className="inline-block w-3 h-3 bg-red-500 rounded-full"></span>
          <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
          <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
          <span className="ml-2">terminal</span>
        </div>
      )}
      <div className={`${variantStyles.text} ${paddingClass}`}>
        {children}
      </div>
    </div>
  );
}