// components/ui/PixelIcon.tsx
import dynamic from 'next/dynamic';
import { ComponentType, SVGProps } from 'react';

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

export interface PixelIconProps extends SVGProps<SVGSVGElement> {
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
 * Uses next/dynamic for code splitting.
 */
export const PixelIcon = ({ name, size = 24, color = 'currentColor', className, style, ...props }: PixelIconProps) => {
  const IconComponent = dynamic<SVGProps<SVGSVGElement>>(() =>
    import(`pixelarticons/svg/${name}.svg`).then(mod => mod.default || mod)
    , {
      loading: () => <span style={{ width: size, height: size, display: 'inline-block' }} />,
      ssr: true // Try to render on server if possible
    });

  return (
    <IconComponent
      width={size}
      height={size}
      fill={color}
      className={className}
      style={style}
      aria-hidden="true"
      {...props}
    />
  );
};

PixelIcon.displayName = 'PixelIcon';
