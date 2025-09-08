import React from "react";

interface GlitchTextProps {
  text: string;
  intensity?: 'low' | 'medium' | 'high';
  color?: string;
  glitchColor1?: string;
  glitchColor2?: string;
}

export default function GlitchText({ 
  text,
  intensity = 'medium',
  color = 'currentColor',
  glitchColor1 = '#ff0000',
  glitchColor2 = '#00ffff'
}: GlitchTextProps) {
  const intensityValues = {
    'low': { duration: '3s', offset: '2px' },
    'medium': { duration: '2s', offset: '3px' },
    'high': { duration: '1s', offset: '5px' }
  }[intensity];

  return (
    <>
      <style jsx>{`
        .glitch {
          position: relative;
          color: ${color};
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
      <span className="glitch">
        {text}
      </span>
    </>
  );
}