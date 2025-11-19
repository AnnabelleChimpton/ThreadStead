// components/ui/PixelIcon.tsx
import { forwardRef } from 'react';

// Map of available Pixelarticons
// Full list: https://pixelarticons.com/
export type PixelIconName =
  // Navigation & Arrows
  | 'arrow-down'
  | 'arrow-up'
  | 'arrow-left'
  | 'arrow-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'home'
  | 'menu'
  | 'external-link'
  // Actions
  | 'plus'
  | 'minus'
  | 'close'
  | 'check'
  | 'edit'
  | 'delete'
  | 'save'
  | 'copy'
  | 'clipboard'
  | 'undo'
  | 'redo'
  | 'search'
  | 'reload'
  // Status
  | 'alert'
  | 'info-box'
  | 'warning-box'
  // User & Social
  | 'user'
  | 'users'
  | 'user-plus'
  | 'user-minus'
  | 'heart'
  | 'chat'
  | 'mail'
  | 'mail-check'
  // Media
  | 'image'
  | 'camera'
  | 'video'
  | 'music'
  | 'play'
  | 'pause'
  // Files & Documents
  | 'file'
  | 'file-plus'
  | 'file-minus'
  | 'folder'
  | 'folder-plus'
  | 'download'
  | 'upload'
  | 'article'
  | 'speaker'
  // Weather
  | 'cloud'
  | 'cloud-sun'
  | 'cloud-moon'
  | 'cloud-rain'
  | 'cloud-snow'
  | 'cloud-lightning'
  | 'sun'
  | 'moon'
  | 'moon-star'
  | 'moon-stars'
  // Objects
  | 'calendar'
  | 'clock'
  | 'notification'
  | 'bookmark'
  | 'flag'
  | 'gift'
  | 'key'
  | 'lock'
  | 'lock-open'
  | 'shield'
  | 'sliders'
  | 'trash'
  | 'archive'
  // Special (gap fillers)
  | 'dice'
  | 'map'
  | 'gps'
  | 'trophy'
  | 'chart'
  | 'coin'
  | 'lightbulb'
  | 'link'
  | 'unlink'
  | 'eye'
  | 'eye-closed'
  | 'paint-bucket'
  | 'drop'
  | 'zap'
  | 'script'
  | 'code'
  | 'debug'
  // Buildings & Places
  | 'building'
  | 'buildings'
  | 'store'
  // Misc
  | 'more-horizontal'
  | 'more-vertical'
  | 'drag-and-drop'
  | 'sort'
  | 'human-handsup';

export interface PixelIconProps extends React.SVGAttributes<SVGElement> {
  /** The name of the Pixelarticon */
  name: PixelIconName;
  /** Icon size in pixels (default: 24) */
  size?: number;
  /** Icon color (default: currentColor) */
  color?: string;
}

/**
 * Pixel Icon Component
 *
 * Renders a 24x24 pixel icon from Pixelarticons.
 *
 * @example
 * // Basic usage
 * <PixelIcon name="save" />
 *
 * @example
 * // With custom size and color
 * <PixelIcon name="heart" size={32} color="red" />
 */
export const PixelIcon = forwardRef<SVGSVGElement, PixelIconProps>(
  ({ name, size = 24, color = 'currentColor', className, style, ...props }, ref) => {
    // Dynamic import pattern for pixelarticons
    // Each icon is imported as an SVG component
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const IconComponent = require(`pixelarticons/svg/${name}.svg`).default;

    return (
      <IconComponent
        ref={ref}
        width={size}
        height={size}
        fill={color}
        className={className}
        style={style}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

PixelIcon.displayName = 'PixelIcon';
