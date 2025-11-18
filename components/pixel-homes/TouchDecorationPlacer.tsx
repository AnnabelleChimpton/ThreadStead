import React, { useRef, useCallback, useState, useEffect } from 'react'

interface TouchDecorationPlacerProps {
  onTouchPlace: (x: number, y: number) => void
  selectedDecoration: any | null
  canvasWidth: number
  canvasHeight: number
  className?: string
  // Enhanced gesture callbacks
  onTouchSelect?: (decorationIds: string[]) => void
  onTouchDelete?: (decorationId: string) => void
  onTouchMove?: (decorationId: string, x: number, y: number) => void
  decorations?: Array<{id: string, position: {x: number, y: number}}>
  isDeleteMode?: boolean
}

interface TouchState {
  isActive: boolean
  startTime: number
  startPosition: {x: number, y: number}
  currentPosition: {x: number, y: number}
  touchCount: number
  gestureType: 'none' | 'tap' | 'longpress' | 'drag' | 'pinch' | 'swipe'
}

export default function TouchDecorationPlacer({
  onTouchPlace,
  selectedDecoration,
  canvasWidth,
  canvasHeight,
  className = '',
  onTouchSelect,
  onTouchDelete,
  onTouchMove,
  decorations = [],
  isDeleteMode = false
}: TouchDecorationPlacerProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [touchState, setTouchState] = useState<TouchState>({
    isActive: false,
    startTime: 0,
    startPosition: {x: 0, y: 0},
    currentPosition: {x: 0, y: 0},
    touchCount: 0,
    gestureType: 'none'
  })
  const [dragSelection, setDragSelection] = useState<{x: number, y: number, width: number, height: number} | null>(null)
  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Helper function to convert touch to canvas coordinates
  const touchToCanvas = useCallback((touch: Touch) => {
    if (!overlayRef.current) return {x: 0, y: 0}

    const rect = overlayRef.current.getBoundingClientRect()
    const relativeX = (touch.clientX - rect.left) / rect.width
    const relativeY = (touch.clientY - rect.top) / rect.height

    return {
      x: Math.max(0, Math.min(Math.round(relativeX * canvasWidth), canvasWidth)),
      y: Math.max(0, Math.min(Math.round(relativeY * canvasHeight), canvasHeight))
    }
  }, [canvasWidth, canvasHeight])

  // Find decoration at position
  const findDecorationAt = useCallback((x: number, y: number) => {
    return decorations.find(decoration => {
      const dx = Math.abs(decoration.position.x - x)
      const dy = Math.abs(decoration.position.y - y)
      return dx <= 12 && dy <= 12 // 24px touch target (12px radius)
    })
  }, [decorations])

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!overlayRef.current) return

    const touch = e.touches[0]
    const position = touchToCanvas(touch as any)
    const touchCount = e.touches.length

    // Clear any existing timeout
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current)
      gestureTimeoutRef.current = null
    }

    setTouchState({
      isActive: true,
      startTime: Date.now(),
      startPosition: position,
      currentPosition: position,
      touchCount,
      gestureType: touchCount > 1 ? 'pinch' : 'none'
    })

    // Set up long press detection
    if (touchCount === 1) {
      gestureTimeoutRef.current = setTimeout(() => {
        setTouchState(prev => ({ ...prev, gestureType: 'longpress' }))

        // Long press for selection/context menu
        const decoration = findDecorationAt(position.x, position.y)
        if (decoration && onTouchSelect) {
          onTouchSelect([decoration.id])
          // Add haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
        }
      }, 500) // 500ms long press threshold
    }
  }, [touchToCanvas, findDecorationAt, onTouchSelect])

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!touchState.isActive || !overlayRef.current) return

    const touch = e.touches[0]
    const position = touchToCanvas(touch as any)
    const distance = Math.sqrt(
      Math.pow(position.x - touchState.startPosition.x, 2) +
      Math.pow(position.y - touchState.startPosition.y, 2)
    )

    // Update touch state
    setTouchState(prev => {
      const newState = { ...prev, currentPosition: position }

      // Determine gesture type based on movement
      if (prev.gestureType === 'none' && distance > 10) {
        if (e.touches.length > 1) {
          newState.gestureType = 'pinch'
        } else if (distance > 30) {
          newState.gestureType = 'drag'
          // Clear long press timeout since we're dragging
          if (gestureTimeoutRef.current) {
            clearTimeout(gestureTimeoutRef.current)
            gestureTimeoutRef.current = null
          }
        }
      }

      return newState
    })

    // Handle drag selection rectangle
    if (touchState.gestureType === 'drag' && !selectedDecoration) {
      setDragSelection({
        x: Math.min(touchState.startPosition.x, position.x),
        y: Math.min(touchState.startPosition.y, position.y),
        width: Math.abs(position.x - touchState.startPosition.x),
        height: Math.abs(position.y - touchState.startPosition.y)
      })
    }

    // Handle decoration dragging
    if (touchState.gestureType === 'drag' && !selectedDecoration) {
      const decoration = findDecorationAt(touchState.startPosition.x, touchState.startPosition.y)
      if (decoration && onTouchMove) {
        onTouchMove(decoration.id, position.x, position.y)
      }
    }
  }, [touchState, touchToCanvas, selectedDecoration, findDecorationAt, onTouchMove])

  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Clear timeout
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current)
      gestureTimeoutRef.current = null
    }

    const duration = Date.now() - touchState.startTime
    const distance = Math.sqrt(
      Math.pow(touchState.currentPosition.x - touchState.startPosition.x, 2) +
      Math.pow(touchState.currentPosition.y - touchState.startPosition.y, 2)
    )

    // Handle different gesture types
    if (touchState.gestureType === 'none' && duration < 500 && distance < 10) {
      // Simple tap
      if (selectedDecoration) {
        // Place decoration
        onTouchPlace(touchState.startPosition.x, touchState.startPosition.y)
      } else {
        // Select/deselect decoration or delete in delete mode
        const decoration = findDecorationAt(touchState.startPosition.x, touchState.startPosition.y)
        if (decoration) {
          if (isDeleteMode && onTouchDelete) {
            onTouchDelete(decoration.id)
          } else if (onTouchSelect) {
            onTouchSelect([decoration.id])
          }
        }
      }
    } else if (touchState.gestureType === 'drag' && dragSelection && onTouchSelect) {
      // Multi-select with drag rectangle
      const selectedDecorations = decorations.filter(decoration => {
        const dx = decoration.position.x
        const dy = decoration.position.y
        return dx >= dragSelection.x && dx <= dragSelection.x + dragSelection.width &&
               dy >= dragSelection.y && dy <= dragSelection.y + dragSelection.height
      })

      if (selectedDecorations.length > 0) {
        onTouchSelect(selectedDecorations.map(d => d.id))
      }
    } else if (touchState.gestureType === 'drag' && distance > 50) {
      // Swipe gesture detection
      const deltaX = touchState.currentPosition.x - touchState.startPosition.x
      const deltaY = touchState.currentPosition.y - touchState.startPosition.y

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe - could be used for changing decoration categories
        console.log('Horizontal swipe detected:', deltaX > 0 ? 'right' : 'left')
      } else {
        // Vertical swipe - could be used for showing/hiding palette
        console.log('Vertical swipe detected:', deltaY > 0 ? 'down' : 'up')
      }
    }

    // Reset state
    setTouchState({
      isActive: false,
      startTime: 0,
      startPosition: {x: 0, y: 0},
      currentPosition: {x: 0, y: 0},
      touchCount: 0,
      gestureType: 'none'
    })
    setDragSelection(null)
  }, [touchState, dragSelection, selectedDecoration, isDeleteMode, decorations, onTouchPlace, onTouchSelect, onTouchDelete, findDecorationAt])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current)
      }
    }
  }, [])

  // Show visual feedback when decoration is selected
  const showTouchOverlay = selectedDecoration !== null

  return (
    <div
      ref={overlayRef}
      className={`touch-decoration-overlay absolute inset-0 z-20 ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        pointerEvents: 'auto',
        cursor: showTouchOverlay ? 'crosshair' : 'default',
        // Enhanced visual feedback based on mode
        background: showTouchOverlay
          ? 'rgba(59, 130, 246, 0.05)'
          : isDeleteMode ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
        // Add subtle grid pattern to help with placement
        backgroundImage: showTouchOverlay
          ? `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `
          : 'none',
        backgroundSize: showTouchOverlay ? '10px 10px' : 'auto' // Updated for smaller grid
      }}
    >
      {/* Touch gesture feedback */}
      {touchState.isActive && (
        <>
          {/* Ripple effect at touch point */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: touchState.startPosition.x - 20,
              top: touchState.startPosition.y - 20,
              width: 40,
              height: 40
            }}
          >
            <div className="w-full h-full border-2 border-blue-400 rounded-full animate-ping opacity-50" />
          </div>

          {/* Long press indicator */}
          {touchState.gestureType === 'longpress' && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: touchState.startPosition.x - 15,
                top: touchState.startPosition.y - 15,
                width: 30,
                height: 30
              }}
            >
              <div className="w-full h-full bg-yellow-400 rounded-full animate-pulse opacity-70" />
            </div>
          )}

          {/* Drag selection rectangle */}
          {dragSelection && touchState.gestureType === 'drag' && (
            <div
              className="absolute pointer-events-none border-2 border-blue-500 border-dashed bg-blue-200 bg-opacity-20"
              style={{
                left: dragSelection.x,
                top: dragSelection.y,
                width: dragSelection.width,
                height: dragSelection.height
              }}
            />
          )}
        </>
      )}

      {/* Mode-specific instructions */}
      {showTouchOverlay && (
        <div className="absolute top-4 left-4 pointer-events-none">
          <div className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
            Tap to place decoration
          </div>
        </div>
      )}

      {isDeleteMode && !showTouchOverlay && (
        <div className="absolute top-4 left-4 pointer-events-none">
          <div className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
            Tap decorations to delete
          </div>
        </div>
      )}

      {/* Touch targets for decorations */}
      {!showTouchOverlay && decorations.map(decoration => (
        <div
          key={decoration.id}
          className="absolute pointer-events-none"
          style={{
            left: decoration.position.x - 12,
            top: decoration.position.y - 12,
            width: 24,
            height: 24,
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '50%',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            opacity: 0.7
          }}
        />
      ))}
    </div>
  )
}