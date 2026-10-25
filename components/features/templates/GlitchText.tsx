import React from "react";
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';

interface GlitchTextProps extends UniversalCSSProps {
  text: string;
  intensity?: 'low' | 'medium' | 'high';
  glitchColor?: string; // Renamed to avoid collision with UniversalCSSProps.color
  glitchColor1?: string;
  glitchColor2?: string;
  className?: string;
}

export default function GlitchText(props: GlitchTextProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    text,
    intensity = 'medium',
    glitchColor = 'currentColor',
    glitchColor1 = '#ff0000',
    glitchColor2 = '#00ffff',
    className: customClassName
  } = componentProps;
  const intensityValues = {
    'low': { duration: '3s', offset: '2px' },
    'medium': { duration: '2s', offset: '3px' },
    'high': { duration: '1s', offset: '5px' }
  }[intensity];

  // Its colours, speed and shake for the shared stylesheet
  // (styles/template-components.css), which shows the text from data-text;
  // then CSS props, which win
  const style = {
    '--ts-glitch-color': glitchColor,
    '--ts-glitch-color-1': glitchColor1,
    '--ts-glitch-color-2': glitchColor2,
    '--ts-glitch-duration': intensityValues.duration,
    '--ts-glitch-offset': intensityValues.offset,
    ...applyCSSProps(cssProps)
  } as React.CSSProperties;

  return (
    <span className={customClassName ? `ts-glitch glitch ${customClassName}` : 'ts-glitch glitch'} data-text={text} style={style}>
      {text}
    </span>
  );
}
