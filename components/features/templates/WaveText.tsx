import React from "react";
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';

interface WaveTextProps extends UniversalCSSProps {
  text: string;
  speed?: 'slow' | 'medium' | 'fast';
  amplitude?: 'small' | 'medium' | 'large';
  waveColor?: string; // Renamed to avoid collision with UniversalCSSProps.color
  className?: string;
}

export default function WaveText(props: WaveTextProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    text,
    speed = 'medium',
    amplitude = 'medium',
    waveColor = 'currentColor',
    className: customClassName
  } = componentProps;
  const speedValues = {
    'slow': '3s',
    'medium': '2s',
    'fast': '1s'
  }[speed];

  const amplitudeValues = {
    'small': '5px',
    'medium': '10px',
    'large': '15px'
  }[amplitude];

  // Component-specific styles
  const componentStyle = { color: waveColor };

  // Merge with CSS props (CSS props win)
  const mergedStyle = {
    ...componentStyle,
    ...applyCSSProps(cssProps)
  };

  return (
    <>
      <style jsx>{`
        @keyframes wave {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-${amplitudeValues}); }
        }
        .wave-letter {
          display: inline-block;
          animation: wave ${speedValues} ease-in-out infinite;
        }
      `}</style>
      <span className={customClassName} style={mergedStyle}>
        {text.split('').map((letter, index) => (
          <span
            key={index}
            className="wave-letter"
            style={{
              animationDelay: `${index * 0.1}s`
            }}
          >
            {letter === ' ' ? '\u00A0' : letter}
          </span>
        ))}
      </span>
    </>
  );
}