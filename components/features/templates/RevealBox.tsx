import React, { useState } from "react";
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface RevealBoxProps extends UniversalCSSProps {
  buttonText?: string;
  revealText?: string;
  variant?: 'slide' | 'fade' | 'grow';
  buttonStyle?: 'button' | 'link' | 'minimal';
  children: React.ReactNode;
}

export default function RevealBox(props: RevealBoxProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    buttonText = "Click to reveal",
    revealText = "Hide",
    variant = 'fade',
    buttonStyle = 'button',
    children
  } = componentProps;

  const [isRevealed, setIsRevealed] = useState(false);

  const buttonClasses = {
    'button': 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors',
    'link': 'text-blue-500 hover:text-blue-700 underline',
    'minimal': 'text-gray-600 hover:text-gray-800 border-b border-dashed border-gray-400'
  }[buttonStyle];

  const getRevealAnimation = () => {
    switch (variant) {
      case 'slide':
        return isRevealed
          ? 'transform translate-y-0 opacity-100 transition-all duration-300 ease-out'
          : 'transform -translate-y-2 opacity-0 transition-all duration-300 ease-out';
      case 'grow':
        return isRevealed
          ? 'transform scale-100 opacity-100 transition-all duration-300 ease-out'
          : 'transform scale-95 opacity-0 transition-all duration-300 ease-out';
      case 'fade':
      default:
        return isRevealed
          ? 'opacity-100 transition-opacity duration-300 ease-out'
          : 'opacity-0 transition-opacity duration-300 ease-out';
    }
  };

  const filteredClasses = removeTailwindConflicts('', cssProps);
  const appliedStyles = applyCSSProps(cssProps);

  return (
    <div className={filteredClasses} style={appliedStyles}>
      <button
        onClick={() => setIsRevealed(!isRevealed)}
        className={buttonClasses}
      >
        {isRevealed ? revealText : buttonText}
      </button>

      {isRevealed && (
        <div className={`mt-4 ${getRevealAnimation()}`}>
          {children}
        </div>
      )}
    </div>
  );
}