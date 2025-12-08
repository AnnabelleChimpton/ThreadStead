import React, { useEffect, useState } from 'react'
import DecorationSVG from './DecorationSVG'

interface AnimatedDecorationProps {
  decorationType: string
  decorationId: string
  variant?: string
  size?: 'small' | 'medium' | 'large'
  position: { x: number; y: number }
  animationType?: 'place' | 'remove' | 'select' | 'hover' | 'pulse' | 'bounce'
  onAnimationComplete?: () => void
  className?: string
  pngUrl?: string
}

interface PlacementEffect {
  id: string
  x: number
  y: number
  type: 'sparkle' | 'ripple' | 'glow' | 'magic_dust'
  timestamp: number
}

// Enhanced placement animations component
export default function AnimatedDecoration({
  decorationType,
  decorationId,
  variant = 'default',
  size = 'medium',
  position,
  animationType = 'place',
  onAnimationComplete,
  className = '',
  pngUrl
}: AnimatedDecorationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [effects, setEffects] = useState<PlacementEffect[]>([])

  useEffect(() => {
    if (animationType === 'place') {
      // Delayed entrance for dramatic effect
      setTimeout(() => setIsVisible(true), 50)

      // Add placement effects
      addPlacementEffect('sparkle')
      setTimeout(() => addPlacementEffect('ripple'), 200)
      setTimeout(() => addPlacementEffect('glow'), 400)

      // Complete animation
      const timer = setTimeout(() => {
        onAnimationComplete?.()
      }, 800)

      return () => clearTimeout(timer)
    } else {
      setIsVisible(true)
    }
  }, [animationType, onAnimationComplete])

  const addPlacementEffect = (type: PlacementEffect['type']) => {
    const effect: PlacementEffect = {
      id: Math.random().toString(36).substr(2, 9),
      x: position.x,
      y: position.y,
      type,
      timestamp: Date.now()
    }
    setEffects(prev => [...prev, effect])

    // Remove effect after animation
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== effect.id))
    }, 1000)
  }

  const getAnimationClasses = () => {
    const baseClasses = 'decoration-animated transition-all duration-300 ease-out'

    switch (animationType) {
      case 'place':
        return `${baseClasses} ${isVisible
          ? 'scale-100 opacity-100 animate-bounce-gentle'
          : 'scale-50 opacity-0'}`

      case 'remove':
        return `${baseClasses} scale-0 opacity-0 rotate-180`

      case 'select':
        return `${baseClasses} scale-110 brightness-110 drop-shadow-lg animate-pulse-soft`

      case 'hover':
        return `${baseClasses} scale-105 brightness-105 drop-shadow-md transform-gpu`

      case 'pulse':
        return `${baseClasses} animate-pulse-gentle`

      case 'bounce':
        return `${baseClasses} animate-bounce-subtle`

      default:
        return baseClasses
    }
  }

  return (
    <div
      className="relative"
      style={{
        left: position.x,
        top: position.y,
        zIndex: animationType === 'select' ? 30 : 20
      }}
    >
      {/* Main decoration with animations */}
      <div className={`${getAnimationClasses()} ${className}`}>
        <DecorationSVG
          decorationType={decorationType as any}
          decorationId={decorationId}
          variant={variant}
          size={size}
          className="filter drop-shadow-sm"
          pngUrl={pngUrl}
        />
      </div>

      {/* Placement effects */}
      {effects.map((effect) => (
        <PlacementEffect
          key={effect.id}
          effect={effect}
          position={position}
        />
      ))}

      {/* Selection highlight ring */}
      {animationType === 'select' && (
        <div className="absolute inset-0 border-2 border-blue-400 rounded-lg pointer-events-none opacity-60" />
      )}

      {/* Hover glow effect */}
      {animationType === 'hover' && (
        <div className="absolute inset-0 -m-1 bg-blue-400 rounded-full blur-sm opacity-20 animate-pulse" />
      )}
    </div>
  )
}

// Individual placement effect component
function PlacementEffect({
  effect,
  position
}: {
  effect: PlacementEffect;
  position: { x: number; y: number }
}) {
  switch (effect.type) {
    case 'sparkle':
      return (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-sparkle"
              style={{
                left: `${50 + (Math.random() - 0.5) * 60}%`,
                top: `${50 + (Math.random() - 0.5) * 60}%`,
                animationDelay: `${i * 100}ms`,
                animationDuration: '600ms'
              }}
            />
          ))}
        </div>
      )

    case 'ripple':
      return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-400 rounded-full animate-ripple opacity-60" />
          <div className="absolute w-12 h-12 border-2 border-blue-300 rounded-full animate-ripple-delayed opacity-40" />
        </div>
      )

    case 'glow':
      return (
        <div className="absolute inset-0 -m-3 bg-gradient-radial from-blue-400 to-transparent rounded-full opacity-30 animate-glow-pulse" />
      )

    case 'magic_dust':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-purple-400 rounded-full animate-float-up"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 50}ms`,
                animationDuration: '1500ms'
              }}
            />
          ))}
        </div>
      )

    default:
      return null
  }
}

// Ambient decoration animations for atmosphere
export function AmbientDecorationEffects({
  decorations,
  className = ''
}: {
  decorations: Array<{
    id: string
    type: string
    decorationId: string
    position: { x: number; y: number }
  }>
  className?: string
}) {
  const [activeEffects, setActiveEffects] = useState<string[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly activate ambient effects on decorations
      const eligibleDecorations = decorations.filter(d =>
        ['lighting', 'water', 'seasonal'].includes(d.type)
      )

      if (eligibleDecorations.length > 0) {
        const randomDecoration = eligibleDecorations[Math.floor(Math.random() * eligibleDecorations.length)]
        setActiveEffects(prev => [...prev, randomDecoration.id])

        // Remove effect after duration
        setTimeout(() => {
          setActiveEffects(prev => prev.filter(id => id !== randomDecoration.id))
        }, 2000)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [decorations])

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {decorations.map((decoration) => {
        if (!activeEffects.includes(decoration.id)) return null

        return (
          <div
            key={decoration.id}
            className="absolute"
            style={{
              left: decoration.position.x,
              top: decoration.position.y
            }}
          >
            {/* Ambient effects based on decoration type */}
            {decoration.type === 'lighting' && (
              <div className="absolute inset-0 -m-4">
                <div className="w-12 h-12 bg-yellow-300 rounded-full opacity-20 animate-pulse-gentle blur-md" />
                {/* Light rays */}
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute w-px h-6 bg-yellow-400 opacity-40 animate-flicker"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `rotate(${i * 45}deg) translateY(-12px)`,
                      transformOrigin: 'bottom',
                      animationDelay: `${i * 200}ms`
                    }}
                  />
                ))}
              </div>
            )}

            {decoration.type === 'water' && (
              <div className="absolute inset-0 -m-2">
                {/* Water sparkles */}
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-blue-400 rounded-full animate-twinkle opacity-60"
                    style={{
                      left: `${20 + i * 15}%`,
                      top: `${30 + (i % 2) * 20}%`,
                      animationDelay: `${i * 300}ms`
                    }}
                  />
                ))}
              </div>
            )}

            {decoration.type === 'seasonal' && decoration.decorationId === 'pumpkin' && (
              <div className="absolute inset-0 -m-2">
                {/* Spooky glow */}
                <div className="w-8 h-8 bg-orange-400 rounded-full opacity-30 animate-spooky-glow blur-sm" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Deletion animation component
export function DeletionAnimation({
  position,
  onComplete
}: {
  position: { x: number; y: number }
  onComplete: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 600)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div
      className="absolute pointer-events-none z-40"
      style={{ left: position.x, top: position.y }}
    >
      {/* Explosion effect */}
      <div className="relative">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-red-400 rounded-full animate-explosion"
            style={{
              transform: `rotate(${i * 45}deg) translateY(-16px)`,
              animationDelay: `${i * 50}ms`
            }}
          />
        ))}

        {/* Central flash */}
        <div className="absolute inset-0 w-6 h-6 bg-white rounded-full animate-flash opacity-80" />

        {/* Smoke puff */}
        <div className="absolute inset-0 w-8 h-8 bg-gray-400 rounded-full animate-smoke-puff opacity-40 blur-sm" />
      </div>
    </div>
  )
}

// Enhanced visual feedback for actions
export function ActionFeedback({
  type,
  position,
  message,
  onComplete
}: {
  type: 'success' | 'error' | 'info' | 'warning'
  position: { x: number; y: number }
  message: string
  onComplete: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000)
    return () => clearTimeout(timer)
  }, [onComplete])

  const getColorClasses = () => {
    switch (type) {
      case 'success': return 'bg-green-500 text-white'
      case 'error': return 'bg-red-500 text-white'
      case 'warning': return 'bg-yellow-500 text-black'
      case 'info': return 'bg-blue-500 text-white'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success': return '✓'
      case 'error': return '✕'
      case 'warning': return '⚠'
      case 'info': return 'ℹ'
    }
  }

  return (
    <div
      className="absolute pointer-events-none z-50 animate-feedback-popup"
      style={{ left: position.x, top: position.y - 30 }}
    >
      <div className={`px-3 py-2 rounded-lg shadow-lg ${getColorClasses()} flex items-center space-x-2`}>
        <span className="text-sm font-medium">{getIcon()}</span>
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  )
}

// Loading shimmer for decorations
export function DecorationSkeleton({
  size = 'medium',
  className = ''
}: {
  size?: 'small' | 'medium' | 'large'
  className?: string
}) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  }

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full bg-gray-200 rounded animate-shimmer" />
    </div>
  )
}