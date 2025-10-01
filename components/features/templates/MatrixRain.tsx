/**
 * Matrix Rain Component - Falling code effect background with customizable styling
 */

import React, { useEffect, useRef, useState } from 'react';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';

export interface MatrixRainProps extends UniversalCSSProps {
  matrixColor?: 'green' | 'blue' | 'red' | 'purple' | 'cyan' | 'white';
  speed?: 'slow' | 'medium' | 'fast' | 'ultra';
  density?: 'low' | 'medium' | 'high' | 'extreme';
  characters?: 'katakana' | 'binary' | 'hex' | 'ascii' | 'custom';
  customCharacters?: string;
  fadeEffect?: boolean;
  glowEffect?: boolean;
  backgroundOpacity?: number;
  className?: string;
  children?: React.ReactNode;
  _isInVisualBuilder?: boolean;
  _positioningMode?: 'absolute' | 'grid' | 'normal';
  _isInGrid?: boolean;
}

export default function MatrixRain(props: MatrixRainProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    matrixColor = 'green',
  speed = 'medium',
  density = 'medium',
  characters = 'katakana',
  customCharacters = '',
  fadeEffect = true,
  glowEffect = true,
  backgroundOpacity = 95,
  className: customClassName,
  children,
  _isInVisualBuilder = false,
  _positioningMode = 'normal',
  _isInGrid = false
  } = componentProps;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [isVisible, setIsVisible] = useState(true);

  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  // Use prop-based grid detection instead of context hook
  const isInGrid = _isInGrid;

  // Color configurations
  const colorThemes = {
    green: {
      primary: '#00ff41',
      secondary: '#008f11',
      glow: 'rgba(0, 255, 65, 0.8)',
      shadow: 'rgba(0, 255, 65, 0.3)'
    },
    blue: {
      primary: '#00aaff',
      secondary: '#0055aa',
      glow: 'rgba(0, 170, 255, 0.8)',
      shadow: 'rgba(0, 170, 255, 0.3)'
    },
    red: {
      primary: '#ff4444',
      secondary: '#aa2222',
      glow: 'rgba(255, 68, 68, 0.8)',
      shadow: 'rgba(255, 68, 68, 0.3)'
    },
    purple: {
      primary: '#aa44ff',
      secondary: '#6622aa',
      glow: 'rgba(170, 68, 255, 0.8)',
      shadow: 'rgba(170, 68, 255, 0.3)'
    },
    cyan: {
      primary: '#44ffff',
      secondary: '#22aaaa',
      glow: 'rgba(68, 255, 255, 0.8)',
      shadow: 'rgba(68, 255, 255, 0.3)'
    },
    white: {
      primary: '#ffffff',
      secondary: '#aaaaaa',
      glow: 'rgba(255, 255, 255, 0.8)',
      shadow: 'rgba(255, 255, 255, 0.3)'
    }
  };

  // Character sets
  const characterSets = {
    katakana: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
    binary: '01',
    hex: '0123456789ABCDEF',
    ascii: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
    custom: customCharacters || 'MATRIX'
  };

  // Speed configurations (milliseconds between updates)
  const speedSettings = {
    slow: 150,
    medium: 100,
    fast: 50,
    ultra: 25
  };

  // Density configurations (columns per 100px width)
  const densitySettings = {
    low: 1,
    medium: 2,
    high: 3,
    extreme: 4
  };

  const currentColor = colorThemes[matrixColor];
  const currentCharacterSet = characterSets[characters];
  const currentSpeed = speedSettings[speed];
  const currentDensity = densitySettings[density];

  // Component default styles
  const componentStyle: React.CSSProperties = {
    position: _positioningMode === 'absolute' ? 'relative' : 'static',
    ...(isInGrid && {
      width: '100%',
      height: '100%',
      minHeight: '400px'
    })
  };

  // Merge component styles with CSS props (CSS props win)
  const containerStyle = { ...componentStyle, ...applyCSSProps(cssProps) };

  const containerClassName = normalizedCustomClassName
    ? `matrix-rain-container ${normalizedCustomClassName}`
    : 'matrix-rain-container';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Matrix rain variables
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize) * (currentDensity / 2);
    const drops: number[] = [];

    // Initialize drops
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * canvas.height / fontSize);
    }

    // Animation function
    let lastTime = 0;
    const animate = (currentTime: number) => {
      if (currentTime - lastTime > currentSpeed) {
        // Clear canvas with fade effect
        if (fadeEffect) {
          ctx.fillStyle = `rgba(0, 0, 0, ${backgroundOpacity / 100})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = 'rgba(0, 0, 0, 1)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Set text properties
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = 'center';

        // Draw characters
        for (let i = 0; i < drops.length; i++) {
          const char = currentCharacterSet[Math.floor(Math.random() * currentCharacterSet.length)];
          const x = i * fontSize + fontSize / 2;
          const y = drops[i] * fontSize;

          // Apply glow effect
          if (glowEffect) {
            ctx.shadowColor = currentColor.glow;
            ctx.shadowBlur = 10;
          } else {
            ctx.shadowBlur = 0;
          }

          // Draw character with gradient effect
          if (fadeEffect && drops[i] > 1) {
            // Create gradient for trailing effect
            const gradient = ctx.createLinearGradient(x, y - fontSize * 3, x, y);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.5, currentColor.secondary);
            gradient.addColorStop(1, currentColor.primary);
            ctx.fillStyle = gradient;
          } else {
            ctx.fillStyle = currentColor.primary;
          }

          ctx.fillText(char, x, y);

          // Reset drop when it goes off screen or randomly
          if (y > canvas.height || Math.random() > 0.95) {
            drops[i] = 0;
          } else {
            drops[i]++;
          }
        }

        lastTime = currentTime;
      }

      if (isVisible) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [matrixColor, speed, density, characters, customCharacters, fadeEffect, glowEffect, backgroundOpacity, isVisible]);

  // Pause animation when not visible (performance optimization)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <div
      className={containerClassName}
      style={containerStyle}
    >
      <style jsx>{`
        .matrix-rain-wrapper {
          width: 100%;
          height: 400px;
          position: relative;
          background: #000000;
          overflow: hidden;
          border-radius: 8px;
          box-shadow:
            inset 0 0 20px rgba(0,0,0,0.8),
            0 4px 8px rgba(0,0,0,0.3);
        }

        .matrix-canvas {
          width: 100%;
          height: 100%;
          display: block;
          position: absolute;
          top: 0;
          left: 0;
        }

        .matrix-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
          text-align: center;
          color: ${currentColor.primary};
          text-shadow: 0 0 10px ${currentColor.glow};
          font-family: 'Courier New', monospace;
          font-weight: bold;
          pointer-events: none;
          background: rgba(0,0,0,0.3);
          padding: 20px;
          border-radius: 8px;
          backdrop-filter: blur(2px);
        }

        .matrix-controls {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 11;
          display: flex;
          gap: 10px;
        }

        .matrix-control-button {
          width: 30px;
          height: 30px;
          background: rgba(0,0,0,0.7);
          border: 1px solid ${currentColor.primary};
          border-radius: 4px;
          color: ${currentColor.primary};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
        }

        .matrix-control-button:hover {
          background: rgba(0,0,0,0.9);
          box-shadow: 0 0 10px ${currentColor.shadow};
          transform: scale(1.1);
        }

        .matrix-info {
          position: absolute;
          bottom: 10px;
          left: 10px;
          z-index: 11;
          color: ${currentColor.primary};
          font-family: 'Courier New', monospace;
          font-size: 10px;
          background: rgba(0,0,0,0.7);
          padding: 5px 10px;
          border-radius: 4px;
          border: 1px solid ${currentColor.primary};
          backdrop-filter: blur(4px);
        }

        @keyframes matrix-glitch {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-1px, 1px); }
          40% { transform: translate(1px, -1px); }
          60% { transform: translate(-1px, -1px); }
          80% { transform: translate(1px, 1px); }
        }

        .matrix-rain-wrapper.glitch {
          animation: matrix-glitch 0.3s infinite;
        }

        @keyframes matrix-fade-in {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .matrix-rain-wrapper {
          animation: matrix-fade-in 1s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
      `}</style>

      <div className="matrix-rain-wrapper">
        <canvas
          ref={canvasRef}
          className="matrix-canvas"
        />

        {/* Content overlay */}
        {children && (
          <div className="matrix-content">
            {children}
          </div>
        )}

        {/* Control buttons (for interactive demos) */}
        {_isInVisualBuilder && (
          <div className="matrix-controls">
            <div
              className="matrix-control-button"
              title={isVisible ? 'Pause' : 'Play'}
              onClick={() => setIsVisible(!isVisible)}
            >
              {isVisible ? '⏸' : '▶'}
            </div>
          </div>
        )}

        {/* Info display */}
        <div className="matrix-info">
          {matrixColor.toUpperCase()} | {speed.toUpperCase()} | {density.toUpperCase()} | {characters.toUpperCase()}
        </div>
      </div>
    </div>
  );
}