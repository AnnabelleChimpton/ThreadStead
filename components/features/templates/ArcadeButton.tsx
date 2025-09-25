/**
 * Arcade Button Component - Chunky retro button with authentic arcade styling
 */

import React, { useState } from 'react';
import { ComponentProps } from '@/lib/templates/types';

export interface ArcadeButtonProps extends ComponentProps {
  text?: string;
  color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'white' | 'black';
  size?: 'small' | 'medium' | 'large' | 'xl';
  shape?: 'circle' | 'square' | 'rectangle';
  style3D?: boolean;
  glowing?: boolean;
  clickEffect?: boolean;
  sound?: boolean;
  href?: string;
  onClick?: () => void;
  _isInVisualBuilder?: boolean;
  _positioningMode?: 'absolute' | 'grid' | 'normal';
  _isInGrid?: boolean;
}

export default function ArcadeButton({
  text = 'START',
  color = 'red',
  size = 'medium',
  shape = 'circle',
  style3D = true,
  glowing = false,
  clickEffect = true,
  sound = false,
  href,
  onClick,
  className: customClassName = '',
  style = {},
  children,
  _isInVisualBuilder = false,
  _positioningMode = 'normal',
  _isInGrid = false
}: ArcadeButtonProps) {

  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  // Use prop-based grid detection instead of context hook
  const isInGrid = _isInGrid;
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getColorValues = (color: string) => {
    const colorMap = {
      red: {
        primary: '#ff0040',
        secondary: '#cc0020',
        dark: '#990010',
        light: '#ff4080',
        shadow: '#660010'
      },
      blue: {
        primary: '#0080ff',
        secondary: '#0060cc',
        dark: '#004099',
        light: '#40a0ff',
        shadow: '#003066'
      },
      green: {
        primary: '#00ff40',
        secondary: '#00cc20',
        dark: '#009910',
        light: '#40ff80',
        shadow: '#006610'
      },
      yellow: {
        primary: '#ffff00',
        secondary: '#cccc00',
        dark: '#999900',
        light: '#ffff40',
        shadow: '#666600'
      },
      purple: {
        primary: '#8040ff',
        secondary: '#6020cc',
        dark: '#401099',
        light: '#a060ff',
        shadow: '#300066'
      },
      orange: {
        primary: '#ff8000',
        secondary: '#cc6000',
        dark: '#994000',
        light: '#ffa040',
        shadow: '#663000'
      },
      white: {
        primary: '#ffffff',
        secondary: '#e0e0e0',
        dark: '#c0c0c0',
        light: '#ffffff',
        shadow: '#808080'
      },
      black: {
        primary: '#404040',
        secondary: '#202020',
        dark: '#101010',
        light: '#606060',
        shadow: '#000000'
      }
    };

    return colorMap[color as keyof typeof colorMap] || colorMap.red;
  };

  const getSizeValues = (size: string, shape: string) => {
    const baseSizes = {
      small: { width: 60, height: 60, fontSize: 12, padding: 8 },
      medium: { width: 100, height: 100, fontSize: 16, padding: 12 },
      large: { width: 140, height: 140, fontSize: 20, padding: 16 },
      xl: { width: 180, height: 180, fontSize: 24, padding: 20 }
    };

    const base = baseSizes[size as keyof typeof baseSizes] || baseSizes.medium;

    if (shape === 'rectangle') {
      return {
        ...base,
        width: base.width * 1.6,
        height: base.height * 0.7
      };
    }
    if (shape === 'square') {
      return {
        ...base,
        width: base.height,
        height: base.height
      };
    }

    return base; // circle
  };

  const colors = getColorValues(color);
  const dimensions = getSizeValues(size, shape);

  const handleClick = () => {
    if (clickEffect) {
      setIsPressed(true);
      setTimeout(() => setIsPressed(false), 150);
    }

    if (sound && typeof window !== 'undefined') {
      // Create a simple beep sound
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (e) {
        // Fallback - silent
      }
    }

    if (href && typeof window !== 'undefined') {
      window.open(href, '_blank');
    }

    if (onClick) {
      onClick();
    }
  };

  const buttonContent = children || (text && text.trim() ? text : 'START');
  const isClickable = href || onClick;

  const baseStyles = {
    position: 'relative' as const,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    borderRadius: shape === 'circle' ? '50%' : '8px',
    fontSize: `${dimensions.fontSize}px`,
    fontWeight: 'bold' as const,
    fontFamily: '"Arial Black", Arial, sans-serif',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    cursor: isClickable ? 'pointer' : 'default',
    userSelect: 'none' as const,
    transition: 'all 0.1s ease',
    border: 'none',
    outline: 'none',
    overflow: _isInVisualBuilder ? 'visible' : 'hidden',
    ...style
  };

  const surfaceStyles = {
    background: isPressed
      ? `radial-gradient(ellipse at 30% 30%, ${colors.dark} 0%, ${colors.secondary} 100%)`
      : `radial-gradient(ellipse at 30% 30%, ${colors.light} 0%, ${colors.primary} 60%, ${colors.secondary} 100%)`,
    boxShadow: style3D
      ? isPressed
        ? `
          inset 0 4px 8px ${colors.shadow},
          inset 0 -2px 4px ${colors.light},
          0 2px 4px rgba(0,0,0,0.3)
        `
        : `
          inset 0 -4px 8px ${colors.shadow},
          inset 0 2px 4px ${colors.light},
          0 6px 12px rgba(0,0,0,0.4),
          0 3px 6px rgba(0,0,0,0.2)
        `
      : `0 2px 4px rgba(0,0,0,0.2)`,
    transform: isPressed ? 'translateY(2px)' : isHovered ? 'translateY(-1px)' : 'translateY(0)'
  };

  const glowStyles = glowing ? {
    filter: `drop-shadow(0 0 ${dimensions.width * 0.2}px ${colors.primary})`
  } : {};

  return (
    <div
      className={`arcade-button-container ${normalizedCustomClassName}`}
      style={baseStyles}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => clickEffect && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={handleClick}
    >
      {/* Main button surface */}
      <div
        style={{
          ...surfaceStyles,
          ...glowStyles,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 'inherit'
        }}
      />

      {/* Button ring/bezel */}
      {style3D && (
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            left: '-4px',
            right: '-4px',
            bottom: '-4px',
            background: `linear-gradient(145deg, #666, #333, #111)`,
            borderRadius: shape === 'circle' ? '50%' : '12px',
            zIndex: -1,
            boxShadow: `
              inset 0 0 8px rgba(0,0,0,0.5),
              0 0 0 2px #444,
              0 8px 16px rgba(0,0,0,0.6)
            `
          }}
        />
      )}

      {/* Text content */}
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          color: color === 'white' || color === 'yellow' ? '#000' : '#fff',
          textShadow: color === 'white' || color === 'yellow'
            ? '0 1px 2px rgba(0,0,0,0.3)'
            : '0 1px 2px rgba(0,0,0,0.8)',
          padding: `${dimensions.padding}px`,
          maxWidth: _isInVisualBuilder ? '100%' : '80%',
          textAlign: 'center' as const,
          lineHeight: 1.2,
          overflow: _isInVisualBuilder ? 'visible' : 'hidden',
          textOverflow: _isInVisualBuilder ? 'unset' : 'ellipsis',
          whiteSpace: _isInVisualBuilder ? 'nowrap' : 'normal'
        }}
      >
        {buttonContent}
      </span>

      {/* Shine effect */}
      {!isPressed && (
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '30%',
            height: '30%',
            background: `radial-gradient(ellipse at center, ${colors.light}60 0%, transparent 70%)`,
            borderRadius: '50%',
            pointerEvents: 'none',
            opacity: isHovered ? 0.8 : 0.6,
            transition: 'opacity 0.2s ease'
          }}
        />
      )}

      <style jsx>{`
        .arcade-button-container:active {
          transform: translateY(3px) !important;
        }

        .arcade-button-container:hover {
          filter: brightness(1.1) ${glowing ? `drop-shadow(0 0 ${dimensions.width * 0.3}px ${colors.primary})` : ''};
        }
      `}</style>
    </div>
  );
}