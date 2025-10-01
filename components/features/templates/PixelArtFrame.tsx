/**
 * Pixel Art Frame Component - 8-bit style borders and containers
 */

import React from 'react';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';

export interface PixelArtFrameProps extends UniversalCSSProps {
  content?: string;
  frameColor?: 'classic' | 'gold' | 'silver' | 'copper' | 'neon' | 'rainbow';
  frameWidth?: 'thin' | 'medium' | 'thick' | 'ultra';
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double';
  cornerStyle?: 'square' | 'beveled' | 'rounded' | 'ornate';
  shadowEffect?: boolean;
  glowEffect?: boolean;
  animated?: boolean;
  innerPadding?: 'none' | 'small' | 'medium' | 'large';
  fillColor?: string;
  className?: string;
  children?: React.ReactNode;
  _isInVisualBuilder?: boolean;
  _positioningMode?: 'absolute' | 'grid' | 'normal';
  _isInGrid?: boolean;
}

export default function PixelArtFrame(props: PixelArtFrameProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    content = '',
    frameColor = 'classic',
    frameWidth = 'medium',
    borderStyle = 'solid',
    cornerStyle = 'square',
    shadowEffect = true,
    glowEffect = false,
    animated = false,
    innerPadding = 'medium',
    fillColor = 'transparent',
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

  const getFrameColorValues = (color: string) => {
    const colorMap = {
      classic: {
        primary: '#8B4513',
        secondary: '#A0522D',
        highlight: '#DEB887',
        shadow: '#654321'
      },
      gold: {
        primary: '#FFD700',
        secondary: '#FFA500',
        highlight: '#FFFF99',
        shadow: '#B8860B'
      },
      silver: {
        primary: '#C0C0C0',
        secondary: '#A9A9A9',
        highlight: '#F5F5F5',
        shadow: '#696969'
      },
      copper: {
        primary: '#B87333',
        secondary: '#CD853F',
        highlight: '#DEB887',
        shadow: '#8B4513'
      },
      neon: {
        primary: '#00FFFF',
        secondary: '#00BFFF',
        highlight: '#E0FFFF',
        shadow: '#008B8B'
      },
      rainbow: {
        primary: '#FF1493',
        secondary: '#00BFFF',
        highlight: '#FFFF00',
        shadow: '#8A2BE2'
      }
    };

    return colorMap[color as keyof typeof colorMap] || colorMap.classic;
  };

  const getFrameWidthValue = (width: string) => {
    const widthMap = {
      thin: 4,
      medium: 8,
      thick: 12,
      ultra: 16
    };
    return widthMap[width as keyof typeof widthMap] || 8;
  };

  const getPaddingValue = (padding: string) => {
    const paddingMap = {
      none: 0,
      small: 8,
      medium: 16,
      large: 24
    };
    return paddingMap[padding as keyof typeof paddingMap] || 16;
  };

  const colors = getFrameColorValues(frameColor);
  const framePixelWidth = getFrameWidthValue(frameWidth);
  const contentPadding = getPaddingValue(innerPadding);

  const getPixelBorderStyle = () => {
    const pixelSize = Math.max(2, framePixelWidth / 4);

    switch (cornerStyle) {
      case 'beveled':
        return {
          border: `${framePixelWidth}px solid ${colors.primary}`,
          borderTopColor: colors.highlight,
          borderLeftColor: colors.highlight,
          borderBottomColor: colors.shadow,
          borderRightColor: colors.shadow,
          borderRadius: `${pixelSize}px`
        };
      case 'rounded':
        return {
          border: `${framePixelWidth}px solid ${colors.primary}`,
          borderRadius: `${framePixelWidth * 2}px`
        };
      case 'ornate':
        return {
          border: `${framePixelWidth}px ${borderStyle} ${colors.primary}`,
          borderRadius: `${pixelSize}px`,
          outline: `${Math.max(1, framePixelWidth / 2)}px solid ${colors.secondary}`,
          outlineOffset: `${pixelSize}px`
        };
      default: // square
        return {
          border: `${framePixelWidth}px ${borderStyle} ${colors.primary}`
        };
    }
  };

  const getShadowStyle = () => {
    if (!shadowEffect) return {};

    const shadowOffset = Math.max(2, framePixelWidth / 2);
    return {
      boxShadow: `
        ${shadowOffset}px ${shadowOffset}px 0px ${colors.shadow},
        ${shadowOffset * 2}px ${shadowOffset * 2}px ${shadowOffset}px rgba(0,0,0,0.3)
      `
    };
  };

  const getGlowStyle = () => {
    if (!glowEffect) return {};

    return {
      filter: `drop-shadow(0 0 ${framePixelWidth * 2}px ${colors.primary})`
    };
  };

  const getAnimationStyle = () => {
    if (!animated || frameColor !== 'rainbow') return {};

    return {
      animation: 'pixel-rainbow 3s linear infinite'
    };
  };

  // Component default styles
  const componentStyle = {
    position: 'relative' as const,
    display: 'inline-block',
    backgroundColor: fillColor !== 'transparent' ? fillColor : 'rgba(0,0,0,0.1)',
    padding: `${contentPadding}px`,
    ...getPixelBorderStyle(),
    ...getShadowStyle(),
    ...getGlowStyle(),
    ...getAnimationStyle(),
    overflow: _isInVisualBuilder ? 'visible' : 'hidden'
  };

  // Merge component styles with CSS props (CSS props win)
  const containerStyle = { ...componentStyle, ...applyCSSProps(cssProps) };

  const contentStyle = {
    display: 'block',
    width: '100%',
    height: '100%',
    fontFamily: '"Courier New", monospace',
    fontSize: '14px',
    lineHeight: 1.4,
    color: '#000',
    whiteSpace: 'pre-wrap' as const
  };

  const containerClassName = normalizedCustomClassName
    ? `pixel-art-frame-container ${normalizedCustomClassName}`
    : 'pixel-art-frame-container';

  return (
    <div
      className={containerClassName}
      style={containerStyle}
    >
      {/* Content area */}
      <div style={contentStyle}>
        {children || content}
      </div>

      {/* Pixel corner decorations for ornate style */}
      {cornerStyle === 'ornate' && (
        <>
          {/* Top-left corner */}
          <div
            style={{
              position: 'absolute',
              top: `-${framePixelWidth / 2}px`,
              left: `-${framePixelWidth / 2}px`,
              width: `${framePixelWidth * 2}px`,
              height: `${framePixelWidth * 2}px`,
              background: colors.highlight,
              borderRadius: '2px'
            }}
          />

          {/* Top-right corner */}
          <div
            style={{
              position: 'absolute',
              top: `-${framePixelWidth / 2}px`,
              right: `-${framePixelWidth / 2}px`,
              width: `${framePixelWidth * 2}px`,
              height: `${framePixelWidth * 2}px`,
              background: colors.highlight,
              borderRadius: '2px'
            }}
          />

          {/* Bottom-left corner */}
          <div
            style={{
              position: 'absolute',
              bottom: `-${framePixelWidth / 2}px`,
              left: `-${framePixelWidth / 2}px`,
              width: `${framePixelWidth * 2}px`,
              height: `${framePixelWidth * 2}px`,
              background: colors.highlight,
              borderRadius: '2px'
            }}
          />

          {/* Bottom-right corner */}
          <div
            style={{
              position: 'absolute',
              bottom: `-${framePixelWidth / 2}px`,
              right: `-${framePixelWidth / 2}px`,
              width: `${framePixelWidth * 2}px`,
              height: `${framePixelWidth * 2}px`,
              background: colors.highlight,
              borderRadius: '2px'
            }}
          />
        </>
      )}

      <style jsx>{`
        @keyframes pixel-rainbow {
          0% { border-color: #FF0000; }
          16.66% { border-color: #FF7F00; }
          33.33% { border-color: #FFFF00; }
          50% { border-color: #00FF00; }
          66.66% { border-color: #0000FF; }
          83.33% { border-color: #8B00FF; }
          100% { border-color: #FF0000; }
        }

        .pixel-art-frame-container:hover {
          transform: scale(1.02);
          transition: transform 0.2s ease;
        }

        .pixel-art-frame-container * {
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
      `}</style>
    </div>
  );
}