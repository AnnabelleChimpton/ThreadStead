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

  // Its speed and height for the shared stylesheet (styles/template-components.css),
  // then CSS props, which win
  const mergedStyle = {
    color: waveColor,
    '--ts-wave-speed': speedValues,
    '--ts-wave-amplitude': amplitudeValues,
    ...applyCSSProps(cssProps)
  } as React.CSSProperties;

  return (
    <span className={customClassName ? `ts-wave ${customClassName}` : 'ts-wave'} style={mergedStyle}>
      {/* The words once, for screen readers, which spelled the letter
          spans out one by one */}
      <span className="sr-only">{text}</span>
      {/* Array.from splits by code point; split('') broke emoji into halves */}
      {Array.from(text).map((letter, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="wave-letter"
          style={{
            animationDelay: `${index * 0.1}s`
          }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </span>
      ))}
    </span>
  );
}