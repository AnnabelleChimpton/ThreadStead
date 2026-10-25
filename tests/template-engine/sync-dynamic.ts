/**
 * `next/dynamic` for render tests. The component runtime
 * (PageWithComponents, loaded by HTMLIslandHydration for a page with
 * components) comes at once, as Next's own server render loads it and
 * preloads its chunk before hydration; in jest the real one renders nothing
 * until its import resolves. Anything else renders nothing, as before.
 *
 *   jest.mock('next/dynamic', () => require('../sync-dynamic').syncDynamic)
 */
export function syncDynamic(loader: () => Promise<unknown>) {
  // The import path as jest's transform leaves it (made relative to the importer)
  if (/lib\/templates\/rendering\/PageWithComponents["']/.test(String(loader))) {
    return (jest.requireActual('@/lib/templates/rendering/PageWithComponents') as { default: unknown }).default
  }
  return function DynamicStub() {
    return null
  }
}
