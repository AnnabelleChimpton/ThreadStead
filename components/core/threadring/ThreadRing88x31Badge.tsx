import React from 'react';
import { badgeDesignFor } from '@/lib/rings/badge-art';
import { ringBadgePalette } from '@/lib/rings/theme';
import RingBadgeArt from './RingBadgeArt';

interface ThreadRing88x31BadgeProps {
  title: string;
  slug?: string;
  /** The ring's theme colour: the default badge is in its palette (else the slug picks one) */
  themeColor?: string | null;
  imageUrl?: string;
  linkUrl?: string;
  className?: string;
  onClick?: () => void;
}

/** A ring's 88×31: its badge image, or the default badge when it has none. */
export default function ThreadRing88x31Badge({ title, slug, themeColor, imageUrl, linkUrl, className = '', onClick }: ThreadRing88x31BadgeProps) {
  const BadgeElement = linkUrl ? 'a' : 'div';
  const linkProps = linkUrl ? { href: linkUrl, target: '_blank', rel: 'noopener noreferrer' } : {};
  const alt = `${title} ThreadRing Badge`;

  return (
    <BadgeElement
      {...linkProps}
      className={`inline-block cursor-pointer ${className}`}
      onClick={onClick}
      style={{ width: '88px', height: '31px' }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          width={88}
          height={31}
          className="threadring-badge-image"
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <RingBadgeArt
          design={badgeDesignFor({}, title || '', ringBadgePalette(themeColor, slug || title || ''))}
          slug={slug || ''}
          label={alt}
        />
      )}
    </BadgeElement>
  );
}
