import React, { useRef, useCallback } from 'react'

interface TouchDecorationPlacerProps {
  onTouchPlace: (x: number, y: number) => void
  selectedDecoration: any | null
  canvasWidth: number
  canvasHeight: number
  className?: string
}

export default function TouchDecorationPlacer({
  onTouchPlace,
  selectedDecoration,
  canvasWidth,
  canvasHeight,
  className = ''
}: TouchDecorationPlacerProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!selectedDecoration || !overlayRef.current) return

    const touch = e.touches[0]
    const rect = overlayRef.current.getBoundingClientRect()
    
    // Calculate relative position within canvas
    const relativeX = (touch.clientX - rect.left) / rect.width
    const relativeY = (touch.clientY - rect.top) / rect.height
    
    // Convert to canvas coordinates
    const canvasX = Math.round(relativeX * canvasWidth)
    const canvasY = Math.round(relativeY * canvasHeight)
    
    // Ensure coordinates are within bounds
    const boundedX = Math.max(0, Math.min(canvasX, canvasWidth))
    const boundedY = Math.max(0, Math.min(canvasY, canvasHeight))
    
    onTouchPlace(boundedX, boundedY)
  }, [onTouchPlace, selectedDecoration, canvasWidth, canvasHeight])

  // Show visual feedback when decoration is selected
  const showTouchOverlay = selectedDecoration !== null

  return (
    <div
      ref={overlayRef}
      className={`touch-decoration-overlay absolute inset-0 z-20 ${className}`}
      onTouchStart={handleTouchStart}
      style={{
        pointerEvents: showTouchOverlay ? 'auto' : 'none',
        cursor: showTouchOverlay ? 'crosshair' : 'default',
        // Visual feedback for touch mode
        background: showTouchOverlay 
          ? 'rgba(59, 130, 246, 0.1)' 
          : 'transparent',
        // Add subtle grid pattern to help with placement
        backgroundImage: showTouchOverlay 
          ? `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `
          : 'none',
        backgroundSize: showTouchOverlay ? '20px 20px' : 'auto'
      }}
    >
      {/* Touch placement indicator */}
      {showTouchOverlay && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg animate-pulse">
            Tap to place decoration
          </div>
        </div>
      )}
    </div>
  )
}