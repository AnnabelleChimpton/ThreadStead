import React, { useRef, useState } from 'react'

export type SheetSnap = 'peek' | 'fit' | 'full'
const ORDER: SheetSnap[] = ['peek', 'fit', 'full']
const LABELS: Record<SheetSnap, string> = {
  peek: 'Show more of the palette',
  fit: 'Show all of the palette',
  full: 'Show less of the palette',
}

interface EditorSheetProps {
  /** Height in px at each snap point, smallest first. */
  heights: Record<SheetSnap, number>
  snap: SheetSnap
  onSnapChange: (snap: SheetSnap) => void
  children: React.ReactNode
}

/**
 * The palette on a phone: a panel under the scene's action bar that can be
 * dragged (or tapped) between three heights. It grows into the space the
 * scene gives up, so it never covers the scene or its bar.
 */
export default function EditorSheet({ heights, snap, onSnapChange, children }: EditorSheetProps) {
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const drag = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null)
  // The click that follows a drag must not also step the size
  const dragged = useRef(false)
  const height = dragHeight ?? heights[snap]

  const nearest = (h: number) =>
    ORDER.reduce((best, s) => (Math.abs(heights[s] - h) < Math.abs(heights[best] - h) ? s : best), ORDER[0])

  return (
    <div className="flex flex-col border-t border-thread-sage/30 bg-thread-paper shrink-0" style={{ height }}>
      <button
        type="button"
        aria-label={LABELS[snap]}
        className="ts-bare flex h-5 w-full shrink-0 cursor-row-resize touch-none items-center justify-center bg-transparent p-0"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId)
          drag.current = { startY: e.clientY, startHeight: height, moved: false }
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          const dy = d.startY - e.clientY
          if (!d.moved && Math.abs(dy) < 4) return
          d.moved = true
          setDragHeight(Math.min(heights.full, Math.max(heights.peek, d.startHeight + dy)))
        }}
        onPointerUp={(e) => {
          const d = drag.current
          drag.current = null
          if (!d) return
          if (d.moved) {
            dragged.current = true
            onSnapChange(nearest(d.startHeight + (d.startY - e.clientY)))
            setDragHeight(null)
          }
        }}
        onPointerCancel={() => {
          drag.current = null
          setDragHeight(null)
        }}
        onClick={() => {
          // A tap (or Enter) steps to the next size; a drag already snapped
          if (dragged.current) {
            dragged.current = false
            return
          }
          onSnapChange(ORDER[(ORDER.indexOf(snap) + 1) % ORDER.length])
        }}
      >
        <span aria-hidden="true" className="block h-1 w-10 rounded-full bg-thread-sage/50" />
      </button>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
