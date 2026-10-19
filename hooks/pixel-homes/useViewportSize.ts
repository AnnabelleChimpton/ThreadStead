import { useEffect, useState } from 'react'

export interface ViewportSize {
  width: number
  height: number
  devicePixelRatio: number
}

/** The window's size and pixel ratio, updated on resize. Zero until mounted (no window on the server). */
export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>({ width: 0, height: 0, devicePixelRatio: 1 })

  useEffect(() => {
    const update = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio || 1 })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return size
}
