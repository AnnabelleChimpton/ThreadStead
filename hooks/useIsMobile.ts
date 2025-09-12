import { useState, useEffect } from 'react'

export default function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < breakpoint
      setIsMobile(mobile)
    }

    // Initial check
    checkMobile()

    // Listen for resize events
    window.addEventListener('resize', checkMobile)
    
    // Listen for orientation changes (mobile)
    window.addEventListener('orientationchange', () => {
      // Small delay to ensure dimensions are updated after orientation change
      setTimeout(checkMobile, 100)
    })

    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('orientationchange', checkMobile)
    }
  }, [breakpoint])

  return isMobile
}

// Additional mobile detection utilities
export const useIsTouch = (): boolean => {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    setIsTouch(hasTouch)
  }, [])

  return isTouch
}

// Detect if user prefers reduced motion
export const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}