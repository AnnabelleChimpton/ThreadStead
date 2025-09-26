/**
 * Retro TV Component - Old television set container with authentic styling
 */

import React from 'react';
import { ComponentProps } from '@/lib/templates/types';

export interface RetroTVProps extends ComponentProps {
  screenColor?: 'green' | 'amber' | 'white' | 'blue' | 'red';
  tvStyle?: 'crt' | 'vintage' | 'portable' | 'console';
  channelNumber?: string;
  showStatic?: boolean;
  showScanlines?: boolean;
  curvature?: 'none' | 'slight' | 'medium' | 'heavy';
  brightness?: number;
  contrast?: number;
  _isInVisualBuilder?: boolean;
  _positioningMode?: 'absolute' | 'grid' | 'normal';
  _isInGrid?: boolean;
}

export default function RetroTV({
  screenColor = 'green',
  tvStyle = 'crt',
  channelNumber = '3',
  showStatic = false,
  showScanlines = true,
  curvature = 'medium',
  brightness = 100,
  contrast = 100,
  className: customClassName = '',
  style = {},
  children,
  _isInVisualBuilder = false,
  _positioningMode = 'normal',
  _isInGrid = false
}: RetroTVProps) {

  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  // Handle style being passed as array or object, and normalize array values
  const normalizedStyle = React.useMemo(() => {
    if (!style) return {};

    let mergedStyle = {};

    if (Array.isArray(style)) {
      // If style is an array, merge all objects
      mergedStyle = style.reduce((acc, styleObj) => ({ ...acc, ...styleObj }), {});
    } else {
      mergedStyle = style;
    }

    // Normalize any array values within the style object
    const normalizedEntries = Object.entries(mergedStyle).map(([key, value]) => {
      if (Array.isArray(value)) {
        // Convert array values to strings (join with space for multiple values)
        return [key, value.join(' ')];
      }
      return [key, value];
    });

    return Object.fromEntries(normalizedEntries);
  }, [style]);

  // Use prop-based grid detection instead of context hook
  const isInGrid = _isInGrid;

  // Screen color configurations
  const screenColors = {
    green: {
      primary: '#00ff00',
      secondary: '#008000',
      bg: '#001100',
      glow: 'rgba(0, 255, 0, 0.3)'
    },
    amber: {
      primary: '#ffb000',
      secondary: '#cc8800',
      bg: '#1a0f00',
      glow: 'rgba(255, 176, 0, 0.3)'
    },
    white: {
      primary: '#ffffff',
      secondary: '#cccccc',
      bg: '#1a1a1a',
      glow: 'rgba(255, 255, 255, 0.2)'
    },
    blue: {
      primary: '#00aaff',
      secondary: '#0088cc',
      bg: '#001122',
      glow: 'rgba(0, 170, 255, 0.3)'
    },
    red: {
      primary: '#ff4444',
      secondary: '#cc2222',
      bg: '#220000',
      glow: 'rgba(255, 68, 68, 0.3)'
    }
  };

  // TV style configurations
  const tvStyles = {
    crt: {
      shellColor: '#2a2a2a',
      accentColor: '#1a1a1a',
      bezelWidth: '40px',
      cornerRadius: '20px',
      hasControls: true,
      hasAntenna: false
    },
    vintage: {
      shellColor: '#8b4513',
      accentColor: '#654321',
      bezelWidth: '50px',
      cornerRadius: '10px',
      hasControls: true,
      hasAntenna: true
    },
    portable: {
      shellColor: '#4a4a4a',
      accentColor: '#333333',
      bezelWidth: '20px',
      cornerRadius: '15px',
      hasControls: false,
      hasAntenna: true
    },
    console: {
      shellColor: '#1a1a1a',
      accentColor: '#0a0a0a',
      bezelWidth: '60px',
      cornerRadius: '5px',
      hasControls: true,
      hasAntenna: false
    }
  };

  const currentScreenColor = screenColors[screenColor];
  const currentTVStyle = tvStyles[tvStyle];

  // Curvature settings
  const curvatureStyles = {
    none: '0',
    slight: '2px',
    medium: '5px',
    heavy: '10px'
  };

  return (
    <div
      className={`retro-tv-container ${normalizedCustomClassName}`}
      style={{
        ...normalizedStyle,
        display: 'inline-block',
        position: _positioningMode === 'absolute' ? 'relative' : 'static',
        ...(isInGrid && {
          width: '100%',
          height: '100%',
          minHeight: '300px'
        })
      }}
    >
      <style jsx>{`
        .retro-tv-shell {
          width: 400px;
          height: 320px;
          background: ${currentTVStyle.shellColor};
          border: 3px solid ${currentTVStyle.accentColor};
          border-radius: ${currentTVStyle.cornerRadius};
          position: relative;
          box-shadow:
            inset 0 4px 8px rgba(255,255,255,0.1),
            0 8px 16px rgba(0,0,0,0.4),
            0 4px 8px rgba(0,0,0,0.2);
          padding: ${currentTVStyle.bezelWidth};
          box-sizing: border-box;
        }

        .tv-screen {
          width: 100%;
          height: 100%;
          background: ${currentScreenColor.bg};
          border-radius: ${curvatureStyles[curvature]};
          border: 2px inset ${currentTVStyle.accentColor};
          position: relative;
          overflow: hidden;
          box-shadow:
            inset 0 2px 4px rgba(0,0,0,0.8),
            0 0 20px ${currentScreenColor.glow};
          filter: brightness(${brightness}%) contrast(${contrast}%);
        }

        .tv-content {
          width: 100%;
          height: 100%;
          position: relative;
          z-index: 3;
          padding: 20px;
          box-sizing: border-box;
          color: ${currentScreenColor.primary};
          font-family: 'Courier New', monospace;
        }

        .screen-scanlines {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.3) 2px,
            rgba(0,0,0,0.3) 4px
          );
          pointer-events: none;
          z-index: 4;
          opacity: ${showScanlines ? 0.5 : 0};
        }

        .screen-static {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(ellipse at center, transparent 40%, rgba(255,255,255,0.1) 70%),
            url("data:image/svg+xml,${encodeURIComponent(`
              <svg xmlns='http://www.w3.org/2000/svg' width='4' height='4'>
                <rect width='4' height='4' fill='${currentScreenColor.bg}'/>
                <circle cx='1' cy='1' r='0.3' fill='${currentScreenColor.primary}' opacity='0.3'/>
                <circle cx='3' cy='2' r='0.2' fill='${currentScreenColor.primary}' opacity='0.2'/>
                <circle cx='2' cy='3' r='0.1' fill='${currentScreenColor.primary}' opacity='0.4'/>
              </svg>
            `)}");
          background-size: 4px 4px;
          animation: ${showStatic ? 'tv-static 0.5s infinite' : 'none'};
          pointer-events: none;
          z-index: 2;
          opacity: ${showStatic ? 0.3 : 0};
        }

        @keyframes tv-static {
          0%, 100% { background-position: 0 0; }
          25% { background-position: 2px 1px; }
          50% { background-position: 1px 2px; }
          75% { background-position: 3px 0px; }
        }

        .screen-reflection {
          position: absolute;
          top: 10%;
          left: 10%;
          width: 30%;
          height: 60%;
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.1) 0%,
            transparent 70%
          );
          border-radius: ${curvatureStyles[curvature]};
          pointer-events: none;
          z-index: 5;
        }

        .tv-controls {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          display: ${currentTVStyle.hasControls ? 'flex' : 'none'};
          flex-direction: column;
          gap: 15px;
        }

        .tv-knob {
          width: 20px;
          height: 20px;
          background: radial-gradient(circle at 30% 30%, #666, #333, #111);
          border: 2px solid ${currentTVStyle.accentColor};
          border-radius: 50%;
          position: relative;
          cursor: pointer;
          transition: transform 0.1s ease;
        }

        .tv-knob:hover {
          transform: scale(1.1);
        }

        .tv-knob::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 50%;
          width: 2px;
          height: 6px;
          background: #999;
          transform: translateX(-50%);
        }

        .tv-antenna {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          display: ${currentTVStyle.hasAntenna ? 'block' : 'none'};
        }

        .antenna-left,
        .antenna-right {
          position: absolute;
          width: 2px;
          height: 40px;
          background: linear-gradient(to bottom, #ccc, #888);
          border-radius: 1px;
        }

        .antenna-left {
          transform: rotate(-20deg);
          left: -10px;
        }

        .antenna-right {
          transform: rotate(20deg);
          right: -10px;
        }

        .tv-channel-display {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: ${currentScreenColor.bg};
          color: ${currentScreenColor.primary};
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          font-weight: bold;
          border: 1px solid ${currentScreenColor.secondary};
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);
        }

        .tv-power-led {
          position: absolute;
          bottom: 15px;
          right: 15px;
          width: 8px;
          height: 8px;
          background: #ff0000;
          border-radius: 50%;
          box-shadow: 0 0 6px #ff0000;
          animation: power-pulse 2s infinite ease-in-out;
        }

        @keyframes power-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        @keyframes tv-warmup {
          0% {
            transform: scale(0.8) rotateX(5deg);
            opacity: 0;
            filter: brightness(0%) contrast(200%);
          }
          50% {
            filter: brightness(150%) contrast(150%);
          }
          100% {
            transform: scale(1) rotateX(0deg);
            opacity: 1;
            filter: brightness(${brightness}%) contrast(${contrast}%);
          }
        }

        .retro-tv-shell {
          animation: tv-warmup 1s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
      `}</style>

      <div className="retro-tv-shell">
        {/* TV Antenna */}
        <div className="tv-antenna">
          <div className="antenna-left"></div>
          <div className="antenna-right"></div>
        </div>

        {/* Main Screen */}
        <div className="tv-screen">
          {/* Static/Noise Effect */}
          <div className="screen-static"></div>

          {/* Content Area */}
          <div className="tv-content">
            {children || (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                fontSize: '18px'
              }}>
                📺 RETRO TV
              </div>
            )}
          </div>

          {/* Scanlines */}
          <div className="screen-scanlines"></div>

          {/* Screen Reflection */}
          <div className="screen-reflection"></div>
        </div>

        {/* TV Controls */}
        <div className="tv-controls">
          <div className="tv-knob" title="Volume"></div>
          <div className="tv-knob" title="Channel"></div>
          <div className="tv-knob" title="Brightness"></div>
        </div>

        {/* Channel Display */}
        <div className="tv-channel-display">
          CH {channelNumber}
        </div>

        {/* Power LED */}
        <div className="tv-power-led"></div>
      </div>
    </div>
  );
}