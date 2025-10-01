/**
 * CRT Monitor Component - Retro computer monitor with scanlines and phosphor glow
 */

import React from 'react';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';

export interface CRTMonitorProps extends UniversalCSSProps {
  content?: string;
  screenColor?: 'green' | 'amber' | 'blue' | 'white';
  intensity?: 'low' | 'medium' | 'high';
  scanlines?: boolean;
  phosphorGlow?: boolean;
  curvature?: boolean;
  textSize?: 'small' | 'medium' | 'large';
  textFont?: 'monospace' | 'terminal';
  className?: string;
  children?: React.ReactNode;
  _isInVisualBuilder?: boolean;
  _positioningMode?: 'absolute' | 'grid' | 'normal';
  _isInGrid?: boolean;
}

export default function CRTMonitor(props: CRTMonitorProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    content = 'System initialized...\n> Ready for input',
    screenColor = 'green',
    intensity = 'medium',
    scanlines = true,
    phosphorGlow = true,
    curvature = true,
    textSize = 'medium',
    textFont = 'monospace',
    className: customClassName,
    children,
    _isInVisualBuilder = false,
    _positioningMode = 'normal',
    _isInGrid = false
  } = componentProps;

  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  // Use prop-based grid detection instead of context hook
  const isInGrid = _isInGrid;

  const getScreenColorValues = (color: string, intensity: string) => {
    const intensityMap = {
      low: { opacity: 0.7, glow: 0.3 },
      medium: { opacity: 0.85, glow: 0.5 },
      high: { opacity: 1, glow: 0.8 }
    };

    const colorMap = {
      green: { primary: '#00ff41', secondary: '#008f11', shadow: '#00ff41' },
      amber: { primary: '#ffb000', secondary: '#cc8800', shadow: '#ffb000' },
      blue: { primary: '#00bfff', secondary: '#0080cc', shadow: '#00bfff' },
      white: { primary: '#ffffff', secondary: '#cccccc', shadow: '#ffffff' }
    };

    const { opacity, glow } = intensityMap[intensity as keyof typeof intensityMap];
    const colors = colorMap[color as keyof typeof colorMap];

    return { ...colors, opacity, glow };
  };

  const { primary, secondary, shadow, opacity, glow } = getScreenColorValues(screenColor, intensity);

  const fontSizeMap = {
    small: '12px',
    medium: '14px',
    large: '16px'
  };

  // Component default styles
  const componentStyle = {
    position: 'relative' as const,
    display: 'inline-block',
    padding: '40px',
    background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
    borderRadius: '20px',
    boxShadow: `
      0 0 0 8px #333,
      0 0 0 12px #222,
      0 20px 40px rgba(0,0,0,0.5),
      inset 0 0 20px rgba(255,255,255,0.05)
    `
  };

  // Merge component styles with CSS props (CSS props win)
  const mergedStyle = { ...componentStyle, ...applyCSSProps(cssProps) };

  const containerClassName = normalizedCustomClassName
    ? `crt-monitor-container ${normalizedCustomClassName}`
    : 'crt-monitor-container';

  return (
    <div
      className={containerClassName}
      style={mergedStyle}
    >
      {/* CRT Screen */}
      <div
        style={{
          position: 'relative', // Needed for effects positioning
          width: '400px',
          height: '300px',
          background: '#000000',
          borderRadius: curvature ? '15px' : '8px',
          overflow: 'visible', // Always visible to allow nested component positioning
          border: '4px solid #1a1a1a',
          boxShadow: `
            inset 0 0 50px rgba(0,0,0,0.8),
            inset 0 0 20px ${shadow}
          `
        }}
      >
        {/* Content Area - Only for text content, not nested components */}
        <div
          style={{
            // No position to avoid creating positioning context
            width: '100%',
            height: '100%',
            padding: '20px',
            fontFamily: textFont === 'terminal' ? '"Courier New", monospace' : 'monospace',
            fontSize: fontSizeMap[textSize],
            color: primary,
            opacity,
            textShadow: phosphorGlow ? `0 0 ${glow * 10}px ${shadow}` : 'none',
            whiteSpace: 'pre-wrap',
            overflow: 'visible', // Allow child components to be positioned
            backgroundImage: curvature ? 'radial-gradient(ellipse at center, transparent 70%, rgba(0,0,0,0.3) 100%)' : 'none',
            zIndex: 1 // Ensure content is above effects
          }}
        >
          {/* Only show content text if no children */}
          {!children && content}

          {/* Blinking Cursor */}
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '16px',
              backgroundColor: primary,
              marginLeft: '2px',
              animation: 'crt-cursor-blink 1s infinite'
            }}
          />
        </div>

        {/* Scanlines Effect */}
        {scanlines && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 1px,
                rgba(0,0,0,0.3) 1px,
                rgba(0,0,0,0.3) 2px
              )`,
              pointerEvents: 'none',
              opacity: 0.4,
              borderRadius: curvature ? '15px' : '8px',
              overflow: 'hidden',
              zIndex: 2 // Above content
            }}
          />
        )}

        {/* Screen Flicker Effect */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(180deg,
              rgba(255,255,255,0.02) 0%,
              transparent 50%,
              rgba(255,255,255,0.02) 100%
            )`,
            animation: 'crt-flicker 0.15s infinite linear alternate',
            pointerEvents: 'none',
            opacity: 0.8,
            borderRadius: curvature ? '15px' : '8px',
            overflow: 'hidden',
            zIndex: 2 // Above content
          }}
        />

        {/* Phosphor Glow Overlay */}
        {phosphorGlow && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(ellipse at center,
                rgba(${screenColor === 'green' ? '0,255,65' :
                      screenColor === 'amber' ? '255,176,0' :
                      screenColor === 'blue' ? '0,191,255' : '255,255,255'}, 0.1) 0%,
                transparent 50%
              )`,
              pointerEvents: 'none',
              mixBlendMode: 'screen',
              borderRadius: curvature ? '15px' : '8px',
              overflow: 'hidden',
              zIndex: 2 // Above content
            }}
          />
        )}
      </div>

      {/* Nested components positioned relative to main container */}
      {children && (
        <div style={{
          position: 'absolute',
          top: '40px', // Offset by container padding
          left: '40px', // Offset by container padding
          width: '400px', // Match screen width
          height: '300px', // Match screen height
          pointerEvents: 'auto',
          zIndex: 3 // Above effects
        }}>
          {children}
        </div>
      )}

      {/* CRT Base/Stand */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120px',
          height: '30px',
          background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
          borderRadius: '8px',
          border: '2px solid #333'
        }}
      />

      <style jsx>{`
        @keyframes crt-cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        @keyframes crt-flicker {
          0% { opacity: 0.8; }
          100% { opacity: 0.85; }
        }

        .crt-monitor-container:hover {
          transform: scale(1.02);
          transition: transform 0.3s ease;
        }
      `}</style>
    </div>
  );
}