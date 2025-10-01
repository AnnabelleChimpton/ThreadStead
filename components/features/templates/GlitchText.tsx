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

  // Apply CSS props as inline styles
  const style = applyCSSProps(cssProps);

  return (
    <>
      <style jsx>{`
        .glitch {
          position: relative;
          color: ${glitchColor};
          font-weight: bold;
          animation: glitch ${intensityValues.duration} infinite;
        }
        
        .glitch::before,
        .glitch::after {
          content: '${text}';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        
        .glitch::before {
          animation: glitchBefore ${intensityValues.duration} infinite;
          color: ${glitchColor1};
          z-index: -1;
        }
        
        .glitch::after {
          animation: glitchAfter ${intensityValues.duration} infinite;
          color: ${glitchColor2};
          z-index: -2;
        }
        
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-${intensityValues.offset}, ${intensityValues.offset}); }
          40% { transform: translate(-${intensityValues.offset}, -${intensityValues.offset}); }
          60% { transform: translate(${intensityValues.offset}, ${intensityValues.offset}); }
          80% { transform: translate(${intensityValues.offset}, -${intensityValues.offset}); }
        }
        
        @keyframes glitchBefore {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(${intensityValues.offset}, ${intensityValues.offset}); }
          40% { transform: translate(${intensityValues.offset}, -${intensityValues.offset}); }
          60% { transform: translate(-${intensityValues.offset}, ${intensityValues.offset}); }
          80% { transform: translate(-${intensityValues.offset}, -${intensityValues.offset}); }
        }
        
        @keyframes glitchAfter {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-${intensityValues.offset}, -${intensityValues.offset}); }
          40% { transform: translate(${intensityValues.offset}, ${intensityValues.offset}); }
          60% { transform: translate(-${intensityValues.offset}, -${intensityValues.offset}); }
          80% { transform: translate(${intensityValues.offset}, ${intensityValues.offset}); }
        }
      `}</style>
      <span className={customClassName ? `glitch ${customClassName}` : 'glitch'} style={style}>
        {text}
      </span>
    </>
  );
}