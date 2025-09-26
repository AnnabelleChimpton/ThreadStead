/**
 * Boombox Component - 80s-style music player UI with authentic styling
 */

import React from 'react';
import { ComponentProps } from '@/lib/templates/types';

export interface BoomboxProps extends ComponentProps {
  boomboxStyle?: 'classic' | 'modern' | 'portable' | 'monster';
  color?: 'black' | 'silver' | 'red' | 'blue' | 'white';
  showEqualizer?: boolean;
  showCassetteDeck?: boolean;
  showRadio?: boolean;
  isPlaying?: boolean;
  currentTrack?: string;
  volume?: number;
  _isInVisualBuilder?: boolean;
  _positioningMode?: 'absolute' | 'grid' | 'normal';
  _isInGrid?: boolean;
}

export default function Boombox({
  boomboxStyle = 'classic',
  color = 'black',
  showEqualizer = true,
  showCassetteDeck = true,
  showRadio = true,
  isPlaying = false,
  currentTrack = 'Track 01',
  volume = 75,
  className: customClassName = '',
  style = {},
  children,
  _isInVisualBuilder = false,
  _positioningMode = 'normal',
  _isInGrid = false
}: BoomboxProps) {

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

  // Normalize numeric props that could be passed as arrays
  const normalizedVolume = React.useMemo(() => {
    if (Array.isArray(volume)) {
      return Number(volume[0]) || 75;
    }
    return Number(volume) || 75;
  }, [volume]);

  // Normalize boolean props that could be passed as arrays
  const normalizedIsPlaying = React.useMemo(() => {
    if (Array.isArray(isPlaying)) {
      return Boolean(isPlaying[0]);
    }
    return Boolean(isPlaying);
  }, [isPlaying]);

  const normalizedShowEqualizer = React.useMemo(() => {
    if (Array.isArray(showEqualizer)) {
      return Boolean(showEqualizer[0]);
    }
    return Boolean(showEqualizer);
  }, [showEqualizer]);

  const normalizedShowCassetteDeck = React.useMemo(() => {
    if (Array.isArray(showCassetteDeck)) {
      return Boolean(showCassetteDeck[0]);
    }
    return Boolean(showCassetteDeck);
  }, [showCassetteDeck]);

  const normalizedShowRadio = React.useMemo(() => {
    if (Array.isArray(showRadio)) {
      return Boolean(showRadio[0]);
    }
    return Boolean(showRadio);
  }, [showRadio]);

  // Normalize string/enum props that could be passed as arrays
  const normalizedBoomboxStyle = React.useMemo(() => {
    if (Array.isArray(boomboxStyle)) {
      return boomboxStyle[0] || 'classic';
    }
    return boomboxStyle || 'classic';
  }, [boomboxStyle]);

  const normalizedColor = React.useMemo(() => {
    if (Array.isArray(color)) {
      return color[0] || 'black';
    }
    return color || 'black';
  }, [color]);

  const normalizedCurrentTrack = React.useMemo(() => {
    if (Array.isArray(currentTrack)) {
      return currentTrack.join(' ') || 'Track 01';
    }
    return currentTrack || 'Track 01';
  }, [currentTrack]);

  // Color configurations
  const colorThemes = {
    black: {
      primary: '#1a1a1a',
      secondary: '#333333',
      accent: '#666666',
      highlight: '#ff6600',
      text: '#ffffff'
    },
    silver: {
      primary: '#c0c0c0',
      secondary: '#a0a0a0',
      accent: '#808080',
      highlight: '#0066ff',
      text: '#000000'
    },
    red: {
      primary: '#cc0000',
      secondary: '#aa0000',
      accent: '#880000',
      highlight: '#ffff00',
      text: '#ffffff'
    },
    blue: {
      primary: '#003366',
      secondary: '#002244',
      accent: '#001122',
      highlight: '#00ccff',
      text: '#ffffff'
    },
    white: {
      primary: '#f0f0f0',
      secondary: '#d0d0d0',
      accent: '#b0b0b0',
      highlight: '#ff3300',
      text: '#000000'
    }
  };

  // Style configurations
  const boomboxStyles = {
    classic: {
      width: '500px',
      height: '200px',
      borderRadius: '15px',
      speakerSize: '80px',
      hasHandle: true
    },
    modern: {
      width: '450px',
      height: '180px',
      borderRadius: '10px',
      speakerSize: '70px',
      hasHandle: false
    },
    portable: {
      width: '350px',
      height: '120px',
      borderRadius: '20px',
      speakerSize: '50px',
      hasHandle: true
    },
    monster: {
      width: '600px',
      height: '250px',
      borderRadius: '25px',
      speakerSize: '100px',
      hasHandle: true
    }
  };

  const currentColor = colorThemes[normalizedColor as keyof typeof colorThemes] || colorThemes['black'];
  const currentStyle = boomboxStyles[normalizedBoomboxStyle as keyof typeof boomboxStyles] || boomboxStyles['classic'];

  // Generate equalizer bars
  const generateEqualizerBars = () => {
    const bars = [];
    for (let i = 0; i < 10; i++) {
      const height = normalizedIsPlaying ? Math.random() * 80 + 20 : 20;
      bars.push(
        <div
          key={i}
          className="equalizer-bar"
          style={{
            height: `${height}%`,
            animationDelay: `${i * 0.1}s`
          }}
        />
      );
    }
    return bars;
  };

  return (
    <div
      className={`boombox-container ${normalizedCustomClassName}`}
      style={{
        ...normalizedStyle,
        display: 'inline-block',
        position: _positioningMode === 'absolute' ? 'relative' : 'static',
        ...(isInGrid && {
          width: '100%',
          height: '100%',
          minHeight: '200px'
        })
      }}
    >
      <style jsx>{`
        .boombox-shell {
          width: ${currentStyle.width};
          height: ${currentStyle.height};
          background: linear-gradient(145deg, ${currentColor.primary} 0%, ${currentColor.secondary} 100%);
          border: 2px solid ${currentColor.accent};
          border-radius: ${currentStyle.borderRadius};
          position: relative;
          box-shadow:
            inset 0 4px 8px rgba(255,255,255,0.1),
            0 8px 16px rgba(0,0,0,0.4),
            0 4px 8px rgba(0,0,0,0.2);
          padding: 20px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .boombox-handle {
          position: absolute;
          top: -15px;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          height: 20px;
          background: linear-gradient(145deg, ${currentColor.secondary}, ${currentColor.accent});
          border: 2px solid ${currentColor.accent};
          border-radius: 15px 15px 5px 5px;
          display: ${currentStyle.hasHandle ? 'block' : 'none'};
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
        }

        .boombox-handle::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 8px;
          background: ${currentColor.primary};
          border-radius: 4px;
        }

        .speaker {
          width: ${currentStyle.speakerSize};
          height: ${currentStyle.speakerSize};
          background: radial-gradient(circle, ${currentColor.accent} 0%, ${currentColor.primary} 70%);
          border: 3px solid ${currentColor.secondary};
          border-radius: 50%;
          position: relative;
          flex-shrink: 0;
          box-shadow:
            inset 0 4px 8px rgba(0,0,0,0.4),
            0 2px 4px rgba(0,0,0,0.3);
        }

        .speaker::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60%;
          height: 60%;
          border: 2px solid ${currentColor.accent};
          border-radius: 50%;
        }

        .speaker::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 30%;
          height: 30%;
          background: ${currentColor.primary};
          border-radius: 50%;
        }

        .speaker-cone {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          height: 80%;
          background: radial-gradient(circle, ${currentColor.primary} 30%, ${currentColor.secondary} 70%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .speaker-center {
          width: 25%;
          height: 25%;
          background: ${currentColor.accent};
          border-radius: 50%;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
        }

        .center-panel {
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 15px;
          align-items: center;
          justify-content: center;
        }

        .cassette-deck {
          width: 100%;
          height: 60px;
          background: linear-gradient(145deg, ${currentColor.secondary}, ${currentColor.primary});
          border: 2px solid ${currentColor.accent};
          border-radius: 8px;
          position: relative;
          display: ${normalizedShowCassetteDeck ? 'block' : 'none'};
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);
        }

        .cassette-window {
          position: absolute;
          top: 8px;
          left: 20px;
          right: 20px;
          height: 20px;
          background: rgba(0,0,0,0.6);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cassette-spokes {
          display: flex;
          gap: 40px;
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
        }

        .cassette-spoke {
          width: 15px;
          height: 15px;
          border: 1px solid ${currentColor.accent};
          border-radius: 50%;
          background: ${currentColor.primary};
          ${normalizedIsPlaying ? 'animation: spoke-spin 2s linear infinite;' : ''}
        }

        @keyframes spoke-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .display-panel {
          width: 100%;
          height: 40px;
          background: linear-gradient(145deg, #000000, #1a1a1a);
          border: 2px solid ${currentColor.accent};
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 15px;
          color: ${currentColor.highlight};
          font-family: 'Courier New', monospace;
          font-size: 14px;
          font-weight: bold;
        }

        .track-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .play-indicator {
          width: 8px;
          height: 8px;
          background: ${normalizedIsPlaying ? currentColor.highlight : currentColor.accent};
          border-radius: 50%;
          ${normalizedIsPlaying ? 'animation: pulse 1s infinite;' : ''}
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .volume-display {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .volume-bars {
          display: flex;
          gap: 2px;
        }

        .volume-bar {
          width: 3px;
          height: 12px;
          background: ${currentColor.accent};
        }

        .volume-bar.active {
          background: ${currentColor.highlight};
        }

        .controls-panel {
          width: 100%;
          display: flex;
          justify-content: center;
          gap: 15px;
        }

        .control-button {
          width: 30px;
          height: 30px;
          background: linear-gradient(145deg, ${currentColor.primary}, ${currentColor.secondary});
          border: 2px solid ${currentColor.accent};
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.1s ease;
          color: ${currentColor.text};
          font-size: 12px;
          font-weight: bold;
        }

        .control-button:hover {
          transform: translateY(-1px);
        }

        .control-button:active {
          transform: translateY(0);
        }

        .equalizer {
          width: 100%;
          height: 40px;
          display: ${normalizedShowEqualizer ? 'flex' : 'none'};
          align-items: flex-end;
          justify-content: space-between;
          padding: 0 10px;
          background: rgba(0,0,0,0.3);
          border-radius: 4px;
          gap: 2px;
        }

        .equalizer-bar {
          width: 6px;
          background: linear-gradient(to top, ${currentColor.highlight}, ${currentColor.accent});
          border-radius: 3px 3px 0 0;
          transition: height 0.2s ease;
          ${normalizedIsPlaying ? 'animation: equalizer-bounce 0.5s infinite alternate;' : ''}
        }

        @keyframes equalizer-bounce {
          0% { height: 20%; }
          100% { height: var(--bar-height, 80%); }
        }

        .radio-display {
          width: 100%;
          height: 25px;
          background: linear-gradient(145deg, #003300, #001100);
          border: 1px solid ${currentColor.accent};
          border-radius: 4px;
          display: ${normalizedShowRadio ? 'flex' : 'none'};
          align-items: center;
          padding: 0 10px;
          color: #00ff00;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }

        .radio-frequency {
          flex: 1;
        }

        .radio-band {
          background: rgba(0,255,0,0.2);
          padding: 2px 6px;
          border-radius: 2px;
        }

        .content-area {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
          pointer-events: none;
          text-align: center;
          color: ${currentColor.text};
        }

        @keyframes boombox-intro {
          0% {
            transform: scale(0.9) rotateY(5deg);
            opacity: 0;
          }
          100% {
            transform: scale(1) rotateY(0deg);
            opacity: 1;
          }
        }

        .boombox-shell {
          animation: boombox-intro 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
      `}</style>

      <div className="boombox-shell">
        {/* Handle */}
        <div className="boombox-handle"></div>

        {/* Left Speaker */}
        <div className="speaker">
          <div className="speaker-cone">
            <div className="speaker-center"></div>
          </div>
        </div>

        {/* Center Panel */}
        <div className="center-panel">
          {/* Cassette Deck */}
          <div className="cassette-deck">
            <div className="cassette-window">
              <div className="cassette-spokes">
                <div className="cassette-spoke"></div>
                <div className="cassette-spoke"></div>
              </div>
            </div>
          </div>

          {/* Display Panel */}
          <div className="display-panel">
            <div className="track-info">
              <div className="play-indicator"></div>
              <span>{normalizedCurrentTrack}</span>
            </div>
            <div className="volume-display">
              <span>VOL</span>
              <div className="volume-bars">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`volume-bar ${i < Math.floor(normalizedVolume / 20) ? 'active' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Radio Display */}
          <div className="radio-display">
            <div className="radio-frequency">
              FM 102.5 MHz
            </div>
            <div className="radio-band">STEREO</div>
          </div>

          {/* Equalizer */}
          <div className="equalizer">
            {generateEqualizerBars()}
          </div>

          {/* Controls */}
          <div className="controls-panel">
            <div className="control-button" title="Previous">⏮</div>
            <div className="control-button" title={normalizedIsPlaying ? 'Pause' : 'Play'}>
              {normalizedIsPlaying ? '⏸' : '▶'}
            </div>
            <div className="control-button" title="Next">⏭</div>
            <div className="control-button" title="Stop">⏹</div>
            <div className="control-button" title="Record">⏺</div>
          </div>
        </div>

        {/* Right Speaker */}
        <div className="speaker">
          <div className="speaker-cone">
            <div className="speaker-center"></div>
          </div>
        </div>

        {/* Content Area */}
        {children && (
          <div className="content-area">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}