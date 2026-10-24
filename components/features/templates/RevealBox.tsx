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
  const contentId = React.useId();

  // Blue dark enough for its text (blue-500 was 3.7:1 against white)
  const buttonClasses = {
    'button': 'px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition-colors',
    'link': 'text-blue-700 hover:text-blue-900 underline',
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
      {/* Says whether it's open, not only by its words changing */}
      <button
        type="button"
        aria-expanded={isRevealed}
        aria-controls={contentId}
        onClick={() => setIsRevealed(!isRevealed)}
        className={buttonClasses}
      >
        {isRevealed ? revealText : buttonText}
      </button>

      {isRevealed && (
        <div id={contentId} className={`mt-4 ${getRevealAnimation()}`}>
          {children}
        </div>
      )}
    </div>
  );
}