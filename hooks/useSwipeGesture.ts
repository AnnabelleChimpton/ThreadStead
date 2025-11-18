import { useEffect, useRef, useState } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: () => void;
  onSwipeMove?: (deltaX: number, deltaY: number) => void;
  onSwipeEnd?: (direction: SwipeDirection) => void;
  minSwipeDistance?: number;
  minSwipeVelocity?: number;
  preventDefaultTouchMove?: boolean;
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

export function useSwipeGesture(options: SwipeGestureOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart,
    onSwipeMove,
    onSwipeEnd,
    minSwipeDistance = 50,
    minSwipeVelocity = 0.3,
    preventDefaultTouchMove = false,
  } = options;

  const touchStartRef = useRef<TouchPosition | null>(null);
  const touchCurrentRef = useRef<TouchPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    const position: TouchPosition = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    touchStartRef.current = position;
    touchCurrentRef.current = position;
    setIsDragging(true);

    if (onSwipeStart) {
      onSwipeStart();
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStartRef.current) return;

    if (preventDefaultTouchMove) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const current: TouchPosition = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    touchCurrentRef.current = current;

    const deltaX = current.x - touchStartRef.current.x;
    const deltaY = current.y - touchStartRef.current.y;

    setDragOffset({ x: deltaX, y: deltaY });

    if (onSwipeMove) {
      onSwipeMove(deltaX, deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchCurrentRef.current) {
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    const deltaX = touchCurrentRef.current.x - touchStartRef.current.x;
    const deltaY = touchCurrentRef.current.y - touchStartRef.current.y;
    const deltaTime = touchCurrentRef.current.time - touchStartRef.current.time;

    // Calculate velocity (pixels per millisecond)
    const velocityX = Math.abs(deltaX) / deltaTime;
    const velocityY = Math.abs(deltaY) / deltaTime;

    let direction: SwipeDirection = null;

    // Determine swipe direction
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Check if swipe meets minimum distance or velocity requirements
    const isValidSwipe =
      (absDeltaX > minSwipeDistance || velocityX > minSwipeVelocity) ||
      (absDeltaY > minSwipeDistance || velocityY > minSwipeVelocity);

    if (isValidSwipe) {
      // Determine primary direction
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          direction = 'right';
          if (onSwipeRight) onSwipeRight();
        } else {
          direction = 'left';
          if (onSwipeLeft) onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          direction = 'down';
          if (onSwipeDown) onSwipeDown();
        } else {
          direction = 'up';
          if (onSwipeUp) onSwipeUp();
        }
      }
    }

    if (onSwipeEnd) {
      onSwipeEnd(direction);
    }

    // Reset state
    touchStartRef.current = null;
    touchCurrentRef.current = null;
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Use passive listeners for better scroll performance
    // Only prevent default when explicitly requested
    const touchStartOptions = { passive: true };
    const touchMoveOptions = { passive: !preventDefaultTouchMove };

    element.addEventListener('touchstart', handleTouchStart, touchStartOptions);
    element.addEventListener('touchmove', handleTouchMove, touchMoveOptions);
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart,
    onSwipeMove,
    onSwipeEnd,
    minSwipeDistance,
    minSwipeVelocity,
    preventDefaultTouchMove,
  ]);

  return {
    ref,
    isDragging,
    dragOffset,
  };
}

// Helper hook for simple swipe detection without drag tracking
export function useSimpleSwipe(options: SwipeGestureOptions) {
  return useSwipeGesture(options);
}
