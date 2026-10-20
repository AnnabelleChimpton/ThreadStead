/**
 * Neon Sign Component - Animated neon text with authentic glow effects
 */

import React from 'react';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';

const NEON_COLORS = ['blue', 'pink', 'green', 'purple', 'cyan', 'yellow', 'red', 'white'] as const;
const TEXT_SIZES = ['small', 'medium', 'large', 'xl'] as const;
const TEXT_WEIGHTS = ['normal', 'bold', 'black'] as const;

/** `value` if it's one of `values`, else undefined. */
function oneOf<T extends string>(values: readonly T[], value: unknown): T | undefined {
  return values.includes(value as T) ? (value as T) : undefined;
}

export interface NeonSignProps extends UniversalCSSProps {
  text?: string;
  neonColor?: (typeof NEON_COLORS)[number];
  intensity?: 'dim' | 'bright' | 'blazing';
  animation?: 'steady' | 'flicker' | 'pulse' | 'buzz';
  textSize?: (typeof TEXT_SIZES)[number];
  textWeight?: (typeof TEXT_WEIGHTS)[number];
  uppercase?: boolean;
  outline?: boolean;
  background?: boolean;
  className?: string;
  children?: React.ReactNode;
  _positioningMode?: 'absolute' | 'grid' | 'normal';
}

export default function NeonSign(props: NeonSignProps) {
  const { cssProps: allCSSProps, componentProps } = separateCSSProps(props);

  // Templates write `color`, `fontSize` and `fontWeight`; they arrive as
  // neonColor, textSize and textWeight. Pages saved before props reached
  // components store them as styles instead. For those, one of the sign's
  // own values there still means the sign; anything else stays CSS.
  const colorFromTemplate = componentProps.neonColor === undefined ? oneOf(NEON_COLORS, allCSSProps.color) : undefined;
  const sizeFromTemplate = componentProps.textSize === undefined ? oneOf(TEXT_SIZES, allCSSProps.fontSize) : undefined;
  const weightFromTemplate = componentProps.textWeight === undefined ? oneOf(TEXT_WEIGHTS, allCSSProps.fontWeight) : undefined;
  const cssProps = { ...allCSSProps };
  if (colorFromTemplate) delete cssProps.color;
  if (sizeFromTemplate) delete cssProps.fontSize;
  if (weightFromTemplate) delete cssProps.fontWeight;

  const {
    text = 'NEON SIGN',
    neonColor = colorFromTemplate ?? 'blue',
    intensity = 'bright',
    animation = 'steady',
    textSize = sizeFromTemplate ?? 'medium',
    textWeight = weightFromTemplate ?? 'bold',
    uppercase = true,
    outline = true,
    background = false,
    className: customClassName,
    children,
    _positioningMode = 'normal'
  } = componentProps;

  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  const getColorValues = (neonColor: string, intensity: string) => {
    const baseColors = {
      blue: { primary: '#00bfff', secondary: '#0080ff', shadow: '#004080' },
      pink: { primary: '#ff1493', secondary: '#ff69b4', shadow: '#8b0030' },
      green: { primary: '#00ff41', secondary: '#32cd32', shadow: '#006400' },
      purple: { primary: '#9932cc', secondary: '#ba55d3', shadow: '#4b0082' },
      cyan: { primary: '#00ffff', secondary: '#40e0d0', shadow: '#008b8b' },
      yellow: { primary: '#ffff00', secondary: '#ffd700', shadow: '#b8860b' },
      red: { primary: '#ff0040', secondary: '#ff4500', shadow: '#8b0000' },
      white: { primary: '#ffffff', secondary: '#f0f8ff', shadow: '#708090' }
    };

    const intensityMultipliers = {
      dim: { glow: 0.6, brightness: 0.7, shadowBlur: 15 },
      bright: { glow: 1, brightness: 1, shadowBlur: 25 },
      blazing: { glow: 1.4, brightness: 1.3, shadowBlur: 35 }
    };

    const colors = baseColors[neonColor as keyof typeof baseColors] || baseColors.blue;
    const multiplier = intensityMultipliers[intensity as keyof typeof intensityMultipliers];

    return {
      primary: colors.primary,
      secondary: colors.secondary,
      shadow: colors.shadow,
      ...multiplier
    };
  };

  const { primary, secondary, shadow, glow, brightness, shadowBlur } = getColorValues(neonColor, intensity);

  const fontSizeMap: Record<'small' | 'medium' | 'large' | 'xl', string> = {
    small: '24px',
    medium: '36px',
    large: '48px',
    xl: '64px'
  };

  const getAnimationKeyframes = () => {
    switch (animation) {
      case 'flicker':
        return `
          @keyframes neon-flicker {
            0%, 100% { opacity: 1; filter: brightness(${brightness}); }
            2% { opacity: 0.8; filter: brightness(0.8); }
            4% { opacity: 1; filter: brightness(${brightness}); }
            8% { opacity: 0.9; filter: brightness(0.9); }
            10% { opacity: 1; filter: brightness(${brightness}); }
            92% { opacity: 1; filter: brightness(${brightness}); }
            94% { opacity: 0.7; filter: brightness(0.7); }
            96% { opacity: 1; filter: brightness(${brightness}); }
          }
        `;
      case 'pulse':
        return `
          @keyframes neon-pulse {
            0%, 100% { opacity: ${brightness * 0.8}; filter: brightness(${brightness * 0.8}); }
            50% { opacity: ${brightness}; filter: brightness(${brightness}); }
          }
        `;
      case 'buzz':
        return `
          @keyframes neon-buzz {
            0%, 100% { opacity: 1; filter: brightness(${brightness}) saturate(1); }
            10% { opacity: 0.95; filter: brightness(${brightness * 0.9}) saturate(1.1); }
            20% { opacity: 1; filter: brightness(${brightness}) saturate(1); }
            30% { opacity: 0.98; filter: brightness(${brightness * 0.95}) saturate(1.05); }
            40% { opacity: 1; filter: brightness(${brightness}) saturate(1); }
            90% { opacity: 1; filter: brightness(${brightness}) saturate(1); }
            95% { opacity: 0.97; filter: brightness(${brightness * 0.92}) saturate(1.08); }
          }
        `;
      default:
        return '';
    }
  };

  const getAnimationCSS = () => {
    switch (animation) {
      case 'flicker':
        return 'neon-flicker 3s infinite';
      case 'pulse':
        return 'neon-pulse 2s ease-in-out infinite';
      case 'buzz':
        return 'neon-buzz 0.1s infinite';
      default:
        return 'none';
    }
  };

  // Children can be elements (a hydrated <b>, say), so they're rendered as
  // they are and capitals come from CSS. Whitespace alone isn't content.
  const hasChildren = React.Children.toArray(children).some(
    (child) => typeof child !== 'string' || child.trim() !== ''
  );
  const displayText = hasChildren ? children : text;

  // Component default styles
  const componentStyle = {
    position: 'relative' as const,
    display: 'inline-block',
    padding: background ? '20px 40px' : '10px',
    background: background ? `radial-gradient(ellipse at center, ${shadow}20 0%, transparent 70%)` : 'transparent',
    borderRadius: background ? '15px' : '0',
    textTransform: uppercase ? ('uppercase' as const) : undefined
  };

  // Merge component styles with CSS props (CSS props win)
  const mergedStyle = { ...componentStyle, ...applyCSSProps(cssProps) };

  const containerClassName = normalizedCustomClassName
    ? `neon-sign-container ${normalizedCustomClassName}`
    : 'neon-sign-container';

  return (
    <div
      className={containerClassName}
      style={mergedStyle}
    >
      {/* Background glow */}
      {background && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(ellipse at center, ${primary}15 0%, transparent 60%)`,
            borderRadius: '15px',
            filter: `blur(${shadowBlur / 2}px)`,
            animation: getAnimationCSS(),
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Main neon text */}
      <div
        style={{
          position: 'relative',
          fontSize: fontSizeMap[textSize],
          fontWeight: textWeight === 'black' ? 900 : textWeight === 'bold' ? 700 : 400,
          fontFamily: '"Arial Black", Arial, sans-serif',
          color: primary,
          textShadow: `
            0 0 ${shadowBlur * 0.4}px ${primary},
            0 0 ${shadowBlur * 0.6}px ${primary},
            0 0 ${shadowBlur * 0.8}px ${secondary},
            0 0 ${shadowBlur}px ${secondary},
            0 0 ${shadowBlur * 1.2}px ${shadow}
          `,
          filter: `brightness(${brightness}) saturate(${glow})`,
          animation: getAnimationCSS(),
          userSelect: 'none',
          letterSpacing: '2px',
          textAlign: 'center',
          lineHeight: 1.2
        }}
      >
        {displayText}

        {/* Text outline */}
        {outline && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              fontSize: fontSizeMap[textSize],
              fontWeight: textWeight === 'black' ? 900 : textWeight === 'bold' ? 700 : 400,
              fontFamily: '"Arial Black", Arial, sans-serif',
              color: 'transparent',
              WebkitTextStroke: `1px ${shadow}`,
              zIndex: -1,
              letterSpacing: '2px',
              textAlign: 'center',
              lineHeight: 1.2
            }}
          >
            {displayText}
          </div>
        )}
      </div>

      {/* Reflection effect */}
      <div
        style={{
          position: 'absolute',
          bottom: `-${parseInt(fontSizeMap[textSize]) * 0.1}px`,
          left: 0,
          right: 0,
          fontSize: fontSizeMap[textSize],
          fontWeight: textWeight === 'black' ? 900 : textWeight === 'bold' ? 700 : 400,
          fontFamily: '"Arial Black", Arial, sans-serif',
          color: primary,
          opacity: 0.2,
          transform: 'scaleY(-0.3) perspective(100px) rotateX(45deg)',
          transformOrigin: 'top',
          filter: 'blur(1px)',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, transparent 80%)',
          pointerEvents: 'none',
          letterSpacing: '2px',
          textAlign: 'center',
          lineHeight: 1.2
        }}
      >
        {displayText}
      </div>

      <style jsx>{`
        ${getAnimationKeyframes()}

        .neon-sign-container:hover {
          transform: scale(1.05);
          transition: transform 0.3s ease;
        }
      `}</style>
    </div>
  );
}