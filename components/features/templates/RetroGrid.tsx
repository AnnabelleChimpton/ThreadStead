/**
 * Retro Grid Component - Synthwave/outrun grid backgrounds with perspective
 */

import React from 'react';
import { ComponentProps } from '@/lib/templates/types';

export interface RetroGridProps extends ComponentProps {
  gridStyle?: 'synthwave' | 'outrun' | 'cyberpunk' | 'vaporwave' | 'matrix' | 'tron';
  perspective?: 'none' | 'shallow' | 'deep' | 'extreme';
  animation?: 'none' | 'pulse' | 'scroll' | 'wave' | 'glitch';
  opacity?: 'subtle' | 'medium' | 'strong' | 'intense';
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  horizon?: 'high' | 'middle' | 'low' | 'hidden';
  scanlines?: boolean;
  glow?: boolean;
  content?: string;
  _isInVisualBuilder?: boolean;
  _positioningMode?: 'absolute' | 'grid' | 'normal';
  _isInGrid?: boolean;
}

export default function RetroGrid({
  gridStyle = 'synthwave',
  perspective = 'deep',
  animation = 'none',
  opacity = 'medium',
  size = 'medium',
  horizon = 'middle',
  scanlines = false,
  glow = true,
  content = '',
  className: customClassName = '',
  style = {},
  children,
  _isInVisualBuilder = false,
  _positioningMode = 'normal',
  _isInGrid = false
}: RetroGridProps) {

  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  // Use prop-based grid detection instead of context hook
  const isInGrid = _isInGrid;

  const getStyleColors = (style: string) => {
    const styleMap = {
      synthwave: {
        primary: '#FF0080',
        secondary: '#00FFFF',
        background: 'linear-gradient(180deg, #1a0033 0%, #000011 50%, #001122 100%)',
        grid: '#FF0080',
        glow: '#FF0080'
      },
      outrun: {
        primary: '#FF6600',
        secondary: '#FF0080',
        background: 'linear-gradient(180deg, #ff6600 0%, #ff0080 50%, #000033 100%)',
        grid: '#FF0080',
        glow: '#FF6600'
      },
      cyberpunk: {
        primary: '#00FF41',
        secondary: '#0080FF',
        background: 'linear-gradient(180deg, #001100 0%, #000033 50%, #001122 100%)',
        grid: '#00FF41',
        glow: '#00FF41'
      },
      vaporwave: {
        primary: '#FF69B4',
        secondary: '#87CEEB',
        background: 'linear-gradient(180deg, #FFB6C1 0%, #DDA0DD 50%, #9370DB 100%)',
        grid: '#FF69B4',
        glow: '#87CEEB'
      },
      matrix: {
        primary: '#00FF00',
        secondary: '#008000',
        background: 'linear-gradient(180deg, #000000 0%, #001100 50%, #000000 100%)',
        grid: '#00FF00',
        glow: '#00FF00'
      },
      tron: {
        primary: '#00BFFF',
        secondary: '#FFFFFF',
        background: 'linear-gradient(180deg, #000011 0%, #000033 50%, #000000 100%)',
        grid: '#00BFFF',
        glow: '#00BFFF'
      }
    };

    return styleMap[style as keyof typeof styleMap] || styleMap.synthwave;
  };

  const getOpacityValue = (opacity: string) => {
    const opacityMap = {
      subtle: 0.3,
      medium: 0.6,
      strong: 0.8,
      intense: 1.0
    };
    return opacityMap[opacity as keyof typeof opacityMap] || 0.6;
  };

  const getGridSize = (size: string) => {
    const sizeMap = {
      small: 20,
      medium: 40,
      large: 60,
      xlarge: 80
    };
    return sizeMap[size as keyof typeof sizeMap] || 40;
  };

  const getPerspectiveValue = (perspective: string) => {
    const perspectiveMap = {
      none: '0px',
      shallow: '500px',
      deep: '200px',
      extreme: '100px'
    };
    return perspectiveMap[perspective as keyof typeof perspectiveMap] || '200px';
  };

  const getHorizonPosition = (horizon: string) => {
    const horizonMap = {
      high: '20%',
      middle: '50%',
      low: '80%',
      hidden: '100%'
    };
    return horizonMap[horizon as keyof typeof horizonMap] || '50%';
  };

  const colors = getStyleColors(gridStyle);
  const opacityValue = getOpacityValue(opacity);
  const gridSize = getGridSize(size);
  const perspectiveValue = getPerspectiveValue(perspective);
  const horizonPosition = getHorizonPosition(horizon);

  const getAnimationKeyframes = () => {
    switch (animation) {
      case 'pulse':
        return `
          @keyframes grid-pulse {
            0%, 100% { opacity: ${opacityValue * 0.5}; }
            50% { opacity: ${opacityValue}; }
          }
        `;
      case 'scroll':
        return `
          @keyframes grid-scroll {
            0% { transform: translateY(0px); }
            100% { transform: translateY(${gridSize}px); }
          }
        `;
      case 'wave':
        return `
          @keyframes grid-wave {
            0%, 100% { transform: scaleY(1) rotateX(80deg); }
            25% { transform: scaleY(1.1) rotateX(75deg); }
            75% { transform: scaleY(0.9) rotateX(85deg); }
          }
        `;
      case 'glitch':
        return `
          @keyframes grid-glitch {
            0%, 90%, 100% { transform: rotateX(80deg) translateZ(0); }
            5% { transform: rotateX(80deg) translateZ(0) translateX(2px); }
            10% { transform: rotateX(80deg) translateZ(0) translateX(-2px); }
            15% { transform: rotateX(80deg) translateZ(0) translateY(1px); }
            20% { transform: rotateX(80deg) translateZ(0) translateY(-1px); }
          }
        `;
      default:
        return '';
    }
  };

  const getAnimationCSS = () => {
    switch (animation) {
      case 'pulse':
        return 'grid-pulse 2s ease-in-out infinite';
      case 'scroll':
        return 'grid-scroll 8s linear infinite';
      case 'wave':
        return 'grid-wave 4s ease-in-out infinite';
      case 'glitch':
        return 'grid-glitch 0.3s infinite';
      default:
        return 'none';
    }
  };

  const containerStyle = {
    ...style,
    position: 'relative' as const,
    width: '100%',
    height: '300px',
    background: colors.background,
    overflow: 'hidden',
    perspective: perspectiveValue !== '0px' ? perspectiveValue : 'none',
    perspectiveOrigin: `center ${horizonPosition}`
  };

  const gridStyle_computed = {
    position: 'absolute' as const,
    top: horizonPosition,
    left: '50%',
    width: '200%',
    height: '200%',
    transform: perspective !== 'none' ? 'translateX(-50%) rotateX(80deg)' : 'translateX(-50%)',
    transformOrigin: 'center top',
    backgroundImage: `
      linear-gradient(${colors.grid} 1px, transparent 1px),
      linear-gradient(90deg, ${colors.grid} 1px, transparent 1px)
    `,
    backgroundSize: `${gridSize}px ${gridSize}px`,
    opacity: opacityValue,
    animation: getAnimationCSS(),
    filter: glow ? `drop-shadow(0 0 ${gridSize / 4}px ${colors.glow})` : 'none'
  };

  return (
    <div
      className={`retro-grid-container ${normalizedCustomClassName}`}
      style={containerStyle}
    >
      {/* Main grid */}
      <div style={gridStyle_computed} />

      {/* Horizon glow effect */}
      {horizon !== 'hidden' && (
        <div
          style={{
            position: 'absolute',
            top: horizonPosition,
            left: '0',
            right: '0',
            height: '2px',
            background: `linear-gradient(90deg, transparent 0%, ${colors.primary} 50%, transparent 100%)`,
            boxShadow: `0 0 20px ${colors.primary}`,
            opacity: opacityValue * 0.8
          }}
        />
      )}

      {/* Scanlines overlay */}
      {scanlines && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.2) 2px,
                rgba(0,0,0,0.2) 4px
              )
            `,
            pointerEvents: 'none',
            opacity: 0.5
          }}
        />
      )}

      {/* Content overlay */}
      {(children || content) && (
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.primary,
            fontFamily: '"Orbitron", "Courier New", monospace',
            fontSize: '18px',
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: `0 0 10px ${colors.glow}`,
            padding: '20px'
          }}
        >
          {children || content}
        </div>
      )}

      {/* Vignette effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(ellipse at center,
              transparent 0%,
              transparent 60%,
              rgba(0,0,0,0.3) 100%
            )
          `,
          pointerEvents: 'none'
        }}
      />

      <style jsx>{`
        ${getAnimationKeyframes()}

        .retro-grid-container:hover {
          transform: scale(1.02);
          transition: transform 0.5s ease;
        }

        @keyframes retro-glow {
          0%, 100% { filter: brightness(1) saturate(1); }
          50% { filter: brightness(1.2) saturate(1.3); }
        }

        .retro-grid-container:hover > div:first-child {
          animation-duration: 0.5s;
        }
      `}</style>
    </div>
  );
}