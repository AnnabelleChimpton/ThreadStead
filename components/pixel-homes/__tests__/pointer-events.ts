/**
 * jsdom has no PointerEvent, so fireEvent.pointer* drops clientX/Y, button
 * and isPrimary. Call once in a test file that fires pointer events.
 */
export function installPointerEvents() {
  if ((global as any).PointerEvent) return
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number
    isPrimary: boolean
    pointerType: string
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
      this.isPrimary = init.isPrimary ?? true
      this.pointerType = init.pointerType ?? 'mouse'
    }
  }
  ;(global as any).PointerEvent = PointerEventPolyfill
}
