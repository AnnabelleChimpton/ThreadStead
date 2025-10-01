/**
 * Cassette Tape Component - Audio content with vintage labeling and authentic deck styling
 */

import React from 'react';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';

export interface CassetteTapeProps extends UniversalCSSProps {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  side?: 'A' | 'B';
  duration?: string;
  tapeColor?: 'black' | 'white' | 'clear' | 'chrome' | 'metal';
  labelStyle?: 'classic' | 'handwritten' | 'typed' | 'minimal';
  wear?: 'mint' | 'good' | 'worn' | 'damaged';
  showSpokesToRotate?: boolean;
  className?: string;
  children?: React.ReactNode;
  _isInVisualBuilder?: boolean;
  _positioningMode?: 'absolute' | 'grid' | 'normal';
  _isInGrid?: boolean;
}

export default function CassetteTape(props: CassetteTapeProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
  title = 'MIX TAPE',
  artist = 'Various Artists',
  album = '',
  year = '1985',
  side = 'A',
  duration = '45 min',
  tapeColor = 'black',
  labelStyle = 'classic',
  wear = 'good',
  showSpokesToRotate = true,
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

  // Normalize string props that could be passed as arrays
  const normalizedTitle = React.useMemo(() => {
    if (Array.isArray(title)) {
      return title.join(' ') || 'MIX TAPE';
    }
    return title || 'MIX TAPE';
  }, [title]);

  const normalizedArtist = React.useMemo(() => {
    if (Array.isArray(artist)) {
      return artist.join(' ') || 'Various Artists';
    }
    return artist || 'Various Artists';
  }, [artist]);

  const normalizedAlbum = React.useMemo(() => {
    if (Array.isArray(album)) {
      return album.join(' ') || '';
    }
    return album || '';
  }, [album]);

  // Color configurations
  const tapeColors = {
    black: { shell: '#1a1a1a', accent: '#333', window: '#0a0a0a', spokes: '#666' },
    white: { shell: '#f8f8f8', accent: '#ddd', window: '#333', spokes: '#999' },
    clear: { shell: 'rgba(240,240,240,0.8)', accent: '#ccc', window: '#666', spokes: '#999' },
    chrome: { shell: '#c0c0c0', accent: '#999', window: '#333', spokes: '#666' },
    metal: { shell: '#708090', accent: '#556b7d', window: '#2c3e50', spokes: '#4a6fa5' }
  };

  // Label style configurations
  const labelStyles = {
    classic: {
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      border: '#dee2e6',
      textColor: '#212529',
      font: 'Arial, sans-serif',
      titleSize: '11px',
      detailSize: '9px'
    },
    handwritten: {
      background: 'linear-gradient(135deg, #fff8dc 0%, #f5f5dc 100%)',
      border: '#deb887',
      textColor: '#4a4a4a',
      font: 'Courier New, monospace',
      titleSize: '10px',
      detailSize: '8px'
    },
    typed: {
      background: 'linear-gradient(135deg, #ffffff 0%, #f1f3f4 100%)',
      border: '#9aa0a6',
      textColor: '#202124',
      font: 'Courier New, monospace',
      titleSize: '10px',
      detailSize: '8px'
    },
    minimal: {
      background: 'linear-gradient(135deg, #000000 0%, #2c3e50 100%)',
      border: '#34495e',
      textColor: '#ecf0f1',
      font: 'Arial, sans-serif',
      titleSize: '10px',
      detailSize: '8px'
    }
  };

  // Wear effects
  const wearEffects = {
    mint: { opacity: 1, scratches: 0 },
    good: { opacity: 0.95, scratches: 1 },
    worn: { opacity: 0.85, scratches: 3 },
    damaged: { opacity: 0.75, scratches: 5 }
  };

  const currentTapeColor = tapeColors[tapeColor];
  const currentLabelStyle = labelStyles[labelStyle];
  const currentWear = wearEffects[wear];

  // Component default styles
  const componentStyle: React.CSSProperties = {
    display: 'inline-block',
    position: _positioningMode === 'absolute' ? 'relative' : 'static',
    opacity: currentWear.opacity,
    ...(isInGrid && {
      width: '100%',
      height: '100%',
      minHeight: '100px'
    })
  };

  // Merge component styles with CSS props (CSS props win)
  const containerStyle = { ...componentStyle, ...applyCSSProps(cssProps) };

  const containerClassName = normalizedCustomClassName
    ? `cassette-tape-container ${normalizedCustomClassName}`
    : 'cassette-tape-container';

  return (
    <div
      className={containerClassName}
      style={containerStyle}
    >
      <style jsx>{`
        .cassette-tape-shell {
          width: 160px;
          height: 100px;
          background: ${currentTapeColor.shell};
          border: 2px solid ${currentTapeColor.accent};
          border-radius: 6px;
          position: relative;
          box-shadow:
            inset 0 2px 4px rgba(255,255,255,0.1),
            0 3px 6px rgba(0,0,0,0.3),
            0 1px 3px rgba(0,0,0,0.2);
          transition: transform 0.2s ease;
        }

        .cassette-tape-shell:hover {
          transform: translateY(-1px);
        }

        .tape-window {
          position: absolute;
          top: 12px;
          left: 12px;
          width: 136px;
          height: 6px;
          background: ${currentTapeColor.window};
          border-radius: 1px;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);
        }

        .tape-spokes-container {
          position: absolute;
          top: 22px;
          left: 15px;
          right: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .tape-spoke {
          width: 20px;
          height: 20px;
          border: 2px solid ${currentTapeColor.accent};
          border-radius: 50%;
          background: radial-gradient(circle, ${currentTapeColor.window} 20%, ${currentTapeColor.shell} 70%);
          position: relative;
          ${showSpokesToRotate ? 'animation: spoke-rotate 4s linear infinite;' : ''}
        }

        @keyframes spoke-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spoke-center {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 6px;
          height: 6px;
          background: ${currentTapeColor.spokes};
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }

        .spoke-teeth {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 12px;
          height: 12px;
          transform: translate(-50%, -50%);
        }

        .spoke-teeth::before,
        .spoke-teeth::after {
          content: '';
          position: absolute;
          background: ${currentTapeColor.spokes};
          border-radius: 0.5px;
        }

        .spoke-teeth::before {
          top: 1px;
          left: 50%;
          width: 1px;
          height: 10px;
          transform: translateX(-50%);
        }

        .spoke-teeth::after {
          top: 50%;
          left: 1px;
          width: 10px;
          height: 1px;
          transform: translateY(-50%);
        }

        .tape-label {
          position: absolute;
          top: 46px;
          left: 8px;
          right: 8px;
          height: 46px;
          background: ${currentLabelStyle.background};
          border: 1px solid ${currentLabelStyle.border};
          border-radius: 2px;
          padding: 3px 6px;
          font-family: ${currentLabelStyle.font};
          color: ${currentLabelStyle.textColor};
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
          overflow: hidden;
        }

        .label-title {
          font-size: ${currentLabelStyle.titleSize};
          font-weight: bold;
          text-transform: uppercase;
          line-height: 1.1;
          margin-bottom: 1px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .label-artist {
          font-size: ${currentLabelStyle.detailSize};
          line-height: 1.2;
          margin-bottom: 1px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          opacity: 0.9;
        }

        .label-details {
          font-size: ${currentLabelStyle.detailSize};
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          opacity: 0.8;
          line-height: 1.1;
          margin-top: 2px;
        }

        .label-side-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .label-duration-year {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          text-align: right;
        }

        .cassette-holes {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
        }

        .cassette-hole {
          width: 4px;
          height: 4px;
          background: ${currentTapeColor.window};
          border-radius: 50%;
          box-shadow: inset 0 1px 1px rgba(0,0,0,0.8);
        }

        .wear-scratches {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          border-radius: 6px;
          opacity: ${currentWear.scratches * 0.08};
          background:
            linear-gradient(35deg, transparent 48%, rgba(255,255,255,0.08) 49%, rgba(255,255,255,0.08) 50%, transparent 51%),
            linear-gradient(-35deg, transparent 48%, rgba(0,0,0,0.08) 49%, rgba(0,0,0,0.08) 50%, transparent 51%);
          background-size: 15px 15px, 12px 12px;
        }

        @keyframes cassette-insert {
          0% {
            transform: translateY(8px) rotateX(8deg);
            opacity: 0;
          }
          100% {
            transform: translateY(0) rotateX(0deg);
            opacity: 1;
          }
        }

        .cassette-tape-shell {
          animation: cassette-insert 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
      `}</style>

      <div className="cassette-tape-shell">
        {/* Tape window showing tape inside */}
        <div className="tape-window"></div>

        {/* Tape spokes/reels */}
        <div className="tape-spokes-container">
          <div className="tape-spoke">
            <div className="spoke-center"></div>
            <div className="spoke-teeth"></div>
          </div>
          <div className="tape-spoke">
            <div className="spoke-center"></div>
            <div className="spoke-teeth"></div>
          </div>
        </div>

        {/* Main label */}
        <div className="tape-label">
          <div className="label-title">
            {(() => {
              // Handle children properly - filter out falsy values and check if we have real content
              const hasValidChildren = children &&
                (Array.isArray(children)
                  ? children.some(child => child !== null && child !== undefined && child !== false && child !== '')
                  : children !== null && children !== undefined && children !== '');

              return hasValidChildren ? children : normalizedTitle;
            })()}
          </div>
          <div className="label-artist">
            {normalizedArtist}
          </div>
          {normalizedAlbum && (
            <div className="label-artist" style={{ fontSize: currentLabelStyle.detailSize, opacity: 0.7 }}>
              {normalizedAlbum}
            </div>
          )}
          <div className="label-details">
            <div className="label-side-info">
              <div>Side {side}</div>
            </div>
            <div className="label-duration-year">
              <div>{duration}</div>
              <div>{year}</div>
            </div>
          </div>
        </div>

        {/* Cassette holes */}
        <div className="cassette-holes">
          <div className="cassette-hole"></div>
          <div className="cassette-hole"></div>
        </div>

        {/* Wear effects overlay */}
        {wear !== 'mint' && <div className="wear-scratches"></div>}
      </div>
    </div>
  );
}