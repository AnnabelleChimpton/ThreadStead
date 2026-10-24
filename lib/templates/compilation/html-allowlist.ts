/**
 * What plain HTML a page may contain, for the sanitizer schema in
 * template-parser.ts. It started life as rehype-sanitize's defaultSchema,
 * which is GitHub's allowlist for COMMENTS: no <center>, <font> or
 * <marquee>, no SVG shapes, no `target`, every <input> forced into a
 * disabled checkbox, and <audio>/<video> without src or controls. This list
 * starts from how people write their own pages instead.
 *
 * Names are hast property names (camelCase: htmlFor, bgColor, strokeWidth),
 * because that is what the sanitizer compares. SVG element names keep their
 * SVG casing (linearGradient, feGaussianBlur).
 *
 * Loosening this list is a safety change. tests/template-engine/__tests__/
 * sanitizer-blocklist.etest.ts pins what must stay out (NEVER_ALLOWED_*
 * below) against the real schema; change both together.
 */

/**
 * data-* names the site's own code reads: island placeholders
 * (data-island, data-component), the page root and chrome markers
 * (data-template-root, data-site-chrome, data-ts-page), component state
 * (data-state, data-active). A page may use any other data-* (attr(),
 * [data-theme] switches, glitch-text tutorials); these are taken out.
 * Takes the attribute's HTML name (data-foo-bar).
 */
export function isReservedDataAttribute(name: string): boolean {
  return /^data-(?:ts-|site-|template-|island|component|state$|active$)/i.test(name);
}

/** Ordinary HTML elements beyond defaultSchema's tag list. */
export const HTML_AUTHORING_TAGS = [
  // structure
  'section', 'article', 'aside', 'header', 'footer', 'main', 'nav', 'address', 'hgroup', 'search',
  'figure', 'figcaption',
  // text
  'u', 'small', 'mark', 'abbr', 'cite', 'dfn', 'time', 'bdi', 'bdo', 'wbr', 'data', 'big',
  // the old web, still in every browser
  'center', 'font', 'marquee', 'blink',
  // tables and image maps
  'caption', 'colgroup', 'col', 'map', 'area',
  // forms (they can only post to this site: CSP form-action 'self')
  'form', 'input', 'button', 'select', 'option', 'optgroup', 'textarea', 'label',
  'fieldset', 'legend', 'datalist', 'output', 'progress', 'meter',
  // media
  'img', 'picture', 'source', 'audio', 'video', 'track', 'canvas',
  // misc
  'strong', 'em', 'code', 'pre', 'blockquote', 'var', 'samp', 'kbd',
  // a list of commands, and a dialog that's open on the page (never a modal:
  // that needs a script, so nothing reaches the top layer)
  'menu', 'dialog',
] as const

/** Inline SVG for drawings, icons and filters. No scripting, animation or embedding. */
export const SVG_TAGS = [
  'svg', 'g', 'defs', 'desc',
  'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect',
  'text', 'tspan', 'textPath',
  'linearGradient', 'radialGradient', 'stop', 'pattern', 'clipPath', 'mask', 'marker',
  'filter', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight',
  'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
  'feGaussianBlur', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset',
  'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence',
] as const

/** Every element may carry these (plus aria-*, added from property-information). */
export const GLOBAL_ATTRIBUTES = [
  'className', 'style', 'id', 'title', 'lang', 'dir', 'hidden', 'tabIndex', 'role',
  'translate', 'spellCheck', 'inert', 'draggable', 'inputMode', 'enterKeyHint', 'autoCapitalize',
  // presentational attributes the old web uses everywhere
  'align', 'bgColor', 'width', 'height', 'border', 'color',
] as const

/** Allowed values for `target`: a page can't steer the window that frames it. */
const LINK_TARGETS = ['_blank', '_self']

/** Input types a page can use. No password (look-alike login forms) and no file. */
export const INPUT_TYPES = [
  'text', 'email', 'url', 'tel', 'search', 'number', 'range', 'color',
  'date', 'time', 'datetime-local', 'month', 'week',
  'checkbox', 'radio', 'submit', 'reset', 'button', 'hidden',
] as const

type AttributeDefinition = string | [string, ...Array<string | number | boolean | RegExp>]

const media = ['src', 'controls', 'loop', 'muted', 'preload', 'autoPlay']

/** Per-element attributes (hast property names). */
export const ELEMENT_ATTRIBUTES: Record<string, AttributeDefinition[]> = {
  a: ['href', ['target', ...LINK_TARGETS], 'rel', 'hrefLang', 'type', 'name', 'download'],
  area: ['href', 'alt', 'shape', 'coords', ['target', ...LINK_TARGETS], 'rel'],
  img: ['src', 'srcSet', 'sizes', 'alt', 'loading', 'decoding', 'useMap', 'isMap', 'hSpace', 'vSpace'],
  source: ['src', 'srcSet', 'sizes', 'type', 'media'],
  audio: [...media],
  video: [...media, 'poster', 'playsInline'],
  track: ['src', 'kind', 'srcLang', 'label', 'default'],
  font: ['face', 'size', 'color'],
  marquee: ['behavior', 'direction', 'scrollamount', 'scrolldelay', 'truespeed', 'loop', 'hSpace', 'vSpace'],
  hr: ['noShade', 'size'],
  br: ['clear'],
  table: ['cellPadding', 'cellSpacing', 'summary', 'frame', 'rules', 'background'],
  td: ['colSpan', 'rowSpan', 'headers', 'scope', 'vAlign', 'noWrap', 'background', 'abbr'],
  th: ['colSpan', 'rowSpan', 'headers', 'scope', 'vAlign', 'noWrap', 'background', 'abbr'],
  tr: ['vAlign'],
  col: ['span'],
  colgroup: ['span'],
  ol: ['start', 'type', 'reversed'],
  ul: ['type'],
  li: ['value', 'type'],
  time: ['dateTime'],
  data: ['value'],
  meter: ['value', 'min', 'max', 'low', 'high', 'optimum'],
  progress: ['value', 'max'],
  blockquote: ['cite'],
  q: ['cite'],
  del: ['cite', 'dateTime'],
  ins: ['cite', 'dateTime'],
  details: ['open', 'name'],
  dialog: ['open'],
  form: ['action', ['method', 'get', 'post', 'GET', 'POST'], 'name', 'noValidate', 'acceptCharset', 'encType'],
  input: [
    ['type', ...INPUT_TYPES],
    'name', 'value', 'placeholder', 'required', 'min', 'max', 'step', 'minLength', 'maxLength',
    'pattern', 'checked', 'disabled', 'readOnly', 'size', 'multiple', 'list', 'alt', 'autoComplete',
  ],
  button: [['type', 'button', 'submit', 'reset'], 'name', 'value', 'disabled'],
  select: ['name', 'multiple', 'size', 'required', 'disabled', 'autoComplete'],
  option: ['value', 'selected', 'disabled', 'label'],
  optgroup: ['label', 'disabled'],
  textarea: ['name', 'rows', 'cols', 'placeholder', 'required', 'readOnly', 'disabled', 'minLength', 'maxLength', 'wrap', 'autoComplete'],
  label: ['htmlFor'],
  output: ['htmlFor', 'name'],
  fieldset: ['name', 'disabled'],
  canvas: [],
}

/** SVG presentation and geometry attributes, allowed on every SVG element. */
export const SVG_ATTRIBUTES = [
  'viewBox', 'preserveAspectRatio', 'xmlns', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'fr', 'd', 'points', 'pathLength', 'transform',
  'fill', 'fillOpacity', 'fillRule', 'stroke', 'strokeWidth', 'strokeLineCap', 'strokeLineJoin',
  'strokeDashArray', 'strokeDashOffset', 'strokeMiterLimit', 'strokeOpacity', 'opacity',
  'clipPath', 'clipRule', 'mask', 'filter', 'visibility', 'display', 'paintOrder',
  'vectorEffect', 'shapeRendering', 'colorInterpolationFilters',
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'textAnchor',
  'dominantBaseline', 'textDecoration', 'dx', 'dy', 'rotate', 'textLength', 'lengthAdjust',
  'offset', 'stopColor', 'stopOpacity', 'gradientUnits', 'gradientTransform', 'spreadMethod',
  'patternUnits', 'patternContentUnits', 'patternTransform', 'clipPathUnits',
  'maskUnits', 'maskContentUnits', 'filterUnits', 'primitiveUnits',
  'in', 'in2', 'result', 'stdDeviation', 'mode', 'operator', 'k1', 'k2', 'k3', 'k4',
  'values', 'type', 'tableValues', 'slope', 'intercept', 'amplitude', 'exponent',
  'baseFrequency', 'numOctaves', 'seed', 'stitchTiles', 'scale', 'xChannelSelector',
  'yChannelSelector', 'floodColor', 'floodOpacity', 'radius', 'kernelMatrix', 'order',
  'divisor', 'bias', 'targetX', 'targetY', 'edgeMode', 'preserveAlpha', 'surfaceScale',
  'diffuseConstant', 'specularConstant', 'specularExponent', 'lightingColor',
  'azimuth', 'elevation', 'z', 'pointsAtX', 'pointsAtY', 'pointsAtZ', 'limitingConeAngle',
  // markers (arrowheads) and text on a path
  'markerStart', 'markerMid', 'markerEnd', 'markerWidth', 'markerHeight', 'markerUnits',
  'refX', 'refY', 'orient', 'startOffset', 'side', 'method', 'spacing',
  // one gradient or pattern building on another, text on a path: only a
  // #fragment in the page (template-parser.ts drops anything else)
  'href',
] as const

/**
 * Elements whose CONTENT goes too: raw text (so CSS or a title never shows
 * as text), and foreignObject, whose HTML unwrapped into an <svg> made the
 * browser's page differ from the server's and failed hydration.
 */
export const STRIPPED_WITH_CONTENT = [
  'script', 'style', 'title', 'iframe', 'object', 'embed', 'noscript', 'template',
  'frame', 'frameset', 'noframes', 'noembed', 'applet', 'foreignObject',
] as const

/**
 * Attributes that reference other elements by id. The sanitizer prefixes
 * them exactly as it prefixes the ids themselves, so they keep pointing at
 * the same element.
 */
export const ID_REFERENCE_ATTRIBUTES = [
  'id', 'name', 'htmlFor', 'list', 'headers',
  'ariaDescribedBy', 'ariaLabelledBy', 'ariaControls', 'ariaOwns',
  'ariaActiveDescendant', 'ariaErrorMessage', 'ariaFlowTo', 'ariaDetails',
] as const

// ---------------------------------------------------------------------------
// What stays out. Asserted against the built schema by the blocklist test.
// ---------------------------------------------------------------------------

/** Elements that run code, load other documents, or change how the page resolves. */
export const NEVER_ALLOWED_TAGS = [
  'script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'base', 'meta',
  'link', 'style', 'template', 'portal', 'fencedframe',
  // SVG: foreign content and animation (set/animate can rewrite href at runtime)
  'foreignObject', 'set', 'animate', 'animateMotion', 'animateTransform', 'discard',
  'use', 'image', 'feImage',
] as const

/**
 * Attributes never allowed on plain HTML or SVG elements (components take
 * their own registered props). Event handlers (on*) are checked by pattern.
 */
export const NEVER_ALLOWED_ATTRIBUTES = [
  'srcDoc', 'formAction', 'formTarget', 'formMethod', 'formEncType', 'ping',
  'xLinkHref', 'attributeName', 'httpEquiv', 'contentEditable', 'autoFocus',
  'popover', 'popoverTarget',
] as const
