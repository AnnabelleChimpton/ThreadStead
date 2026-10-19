import { useId } from 'react'

/**
 * A per-instance prefix for SVG <pattern>/<clipPath> ids.
 *
 * SVG ids are page-global: with several houses on one page, `url(#roof-shingle)`
 * resolves to the first element with that id, so every house would paint with
 * the first house's colours. Prefixing each instance's ids keeps them apart.
 * useId is stable between server and client render; the delimiters React wraps
 * it in are stripped so the result is safe inside `url(#…)`.
 */
export function useSvgIdPrefix(): string {
  return `p${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
}
