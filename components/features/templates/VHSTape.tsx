/**
 * VHS Tape Component - Video content with vintage labeling and authentic styling
 */

import React from 'react';
import { ComponentProps } from '@/lib/templates/types';

export interface VHSTapeProps extends ComponentProps {
  title?: string;
  year?: string;
  genre?: 'Action' | 'Comedy' | 'Drama' | 'Horror' | 'Sci-Fi' | 'Romance' | 'Thriller' | 'Documentary';
  duration?: string;
  tapeColor?: 'black' | 'white' | 'clear' | 'blue' | 'red';
  labelStyle?: 'classic' | 'rental' | 'homemade' | 'premium';
  wear?: 'mint' | 'good' | 'worn' | 'damaged';
  showBarcode?: boolean;
  _isInVisualBuilder?: boolean;
  _positioningMode?: 'absolute' | 'grid' | 'normal';
  _isInGrid?: boolean;
}

export default function VHSTape({
  title = 'HOME VIDEO',
  year = '1985',
  genre = 'Action',
  duration = '120 min',
  tapeColor = 'black',
  labelStyle = 'classic',
  wear = 'good',
  showBarcode = true,
  className: customClassName = '',
  style = {},
  children,
  _isInVisualBuilder = false,
  _positioningMode = 'normal',
  _isInGrid = false
}: VHSTapeProps) {

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

  // Normalize string props that could be passed as arrays
  const normalizedTitle = React.useMemo(() => {
    if (Array.isArray(title)) {
      return title.join(' ') || 'HOME VIDEO';
    }
    return title || 'HOME VIDEO';
  }, [title]);

  // Color configurations
  const tapeColors = {
    black: { shell: '#1a1a1a', accent: '#333', window: '#0a0a0a' },
    white: { shell: '#f8f8f8', accent: '#ddd', window: '#333' },
    clear: { shell: 'rgba(240,240,240,0.8)', accent: '#ccc', window: '#666' },
    blue: { shell: '#1e3a8a', accent: '#3b82f6', window: '#1e293b' },
    red: { shell: '#991b1b', accent: '#ef4444', window: '#1e293b' }
  };

  // Label style configurations
  const labelStyles = {
    classic: {
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      border: '#dee2e6',
      textColor: '#212529',
      font: 'Arial, sans-serif'
    },
    rental: {
      background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
      border: '#f39c12',
      textColor: '#856404',
      font: 'Impact, Arial Black, sans-serif'
    },
    homemade: {
      background: 'linear-gradient(135deg, #ffffff 0%, #f1f3f4 100%)',
      border: '#9aa0a6',
      textColor: '#5f6368',
      font: 'Courier New, monospace'
    },
    premium: {
      background: 'linear-gradient(135deg, #000000 0%, #2c3e50 100%)',
      border: '#34495e',
      textColor: '#ecf0f1',
      font: 'Georgia, serif'
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

  return (
    <div
      className={`vhs-tape-container ${normalizedCustomClassName}`}
      style={{
        ...normalizedStyle,
        display: 'inline-block',
        position: _positioningMode === 'absolute' ? 'relative' : 'static',
        opacity: currentWear.opacity,
        ...(isInGrid && {
          width: '100%',
          height: '100%',
          minHeight: '120px'
        })
      }}
    >
      <style jsx>{`
        .vhs-tape-shell {
          width: 200px;
          height: 120px;
          background: ${currentTapeColor.shell};
          border: 2px solid ${currentTapeColor.accent};
          border-radius: 8px;
          position: relative;
          box-shadow:
            inset 0 2px 4px rgba(255,255,255,0.1),
            0 4px 8px rgba(0,0,0,0.3),
            0 1px 3px rgba(0,0,0,0.2);
          transition: transform 0.2s ease;
        }

        .vhs-tape-shell:hover {
          transform: translateY(-2px);
        }

        .tape-window {
          position: absolute;
          top: 15px;
          left: 15px;
          width: 170px;
          height: 8px;
          background: ${currentTapeColor.window};
          border-radius: 2px;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);
        }

        .tape-reels {
          position: absolute;
          top: 30px;
          left: 20px;
          right: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .tape-reel {
          width: 25px;
          height: 25px;
          border: 2px solid ${currentTapeColor.accent};
          border-radius: 50%;
          background: radial-gradient(circle, ${currentTapeColor.window} 30%, ${currentTapeColor.shell} 70%);
          position: relative;
        }

        .reel-center {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 8px;
          height: 8px;
          background: ${currentTapeColor.accent};
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }

        .tape-label {
          position: absolute;
          top: 65px;
          left: 10px;
          right: 10px;
          height: 45px;
          background: ${currentLabelStyle.background};
          border: 1px solid ${currentLabelStyle.border};
          border-radius: 3px;
          padding: 4px 8px;
          font-family: ${currentLabelStyle.font};
          color: ${currentLabelStyle.textColor};
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .label-title {
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          line-height: 1.2;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .label-details {
          font-size: 8px;
          display: flex;
          justify-content: space-between;
          opacity: 0.8;
          line-height: 1.3;
        }

        .label-genre-year {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .barcode {
          position: absolute;
          bottom: 2px;
          right: 4px;
          width: 30px;
          height: 8px;
          background: repeating-linear-gradient(
            90deg,
            #000 0px,
            #000 1px,
            transparent 1px,
            transparent 2px
          );
          opacity: 0.6;
        }

        .wear-scratches {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          border-radius: 8px;
          opacity: ${currentWear.scratches * 0.1};
          background:
            linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.1) 49%, rgba(255,255,255,0.1) 50%, transparent 51%),
            linear-gradient(-45deg, transparent 48%, rgba(0,0,0,0.1) 49%, rgba(0,0,0,0.1) 50%, transparent 51%);
          background-size: 20px 20px, 15px 15px;
        }

        @keyframes tape-insert {
          0% {
            transform: translateY(10px) rotateX(10deg);
            opacity: 0;
          }
          100% {
            transform: translateY(0) rotateX(0deg);
            opacity: 1;
          }
        }

        .vhs-tape-shell {
          animation: tape-insert 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
      `}</style>

      <div className="vhs-tape-shell">
        {/* Tape window showing tape inside */}
        <div className="tape-window"></div>

        {/* Tape reels */}
        <div className="tape-reels">
          <div className="tape-reel">
            <div className="reel-center"></div>
          </div>
          <div className="tape-reel">
            <div className="reel-center"></div>
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
          <div className="label-details">
            <div className="label-genre-year">
              <div>{genre}</div>
              <div>{year}</div>
            </div>
            <div>{duration}</div>
          </div>

          {showBarcode && <div className="barcode"></div>}
        </div>

        {/* Wear effects overlay */}
        {wear !== 'mint' && <div className="wear-scratches"></div>}
      </div>
    </div>
  );
}