import React from "react";

interface WaveTextProps {
  text: string;
  speed?: 'slow' | 'medium' | 'fast';
  amplitude?: 'small' | 'medium' | 'large';
  color?: string;
}

export default function WaveText({ 
  text,
  speed = 'medium',
  amplitude = 'medium',
  color = 'currentColor'
}: WaveTextProps) {
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
      <span style={{ color }}>
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