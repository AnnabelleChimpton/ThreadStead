import React from 'react';
import Link from 'next/link';
import { useResidentData } from './ResidentDataProvider';
import OwnerNote from './OwnerNote';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';
import { componentHeading } from './component-heading';

interface MediaGridProps extends UniversalCSSProps {
  className?: string;
  heading?: string;
}

export default function MediaGrid(props: MediaGridProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className: customClassName, heading } = componentProps;
  const headingText = componentHeading(heading, 'Featured Photos');
  const { images, owner, viewer } = useResidentData();

  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  const baseClasses = "media-grid profile-tab-content space-y-6";
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const style = applyCSSProps(cssProps);

  const containerClassName = normalizedCustomClassName
    ? `${filteredClasses} ${normalizedCustomClassName}`
    : filteredClasses;

  if (!images || images.length === 0) {
    // Visitors see nothing rather than a box saying there's nothing; the
    // owner gets the hint
    if (!viewer?.id || viewer.id !== owner?.id) return null;
    return (
      <OwnerNote className={`media-grid media-grid--empty ${normalizedCustomClassName ?? ''}`} style={style}>
        No featured photos yet. <Link href={`/resident/${encodeURIComponent(owner.handle)}/media`}>Pick some on your media page</Link>.
      </OwnerNote>
    );
  }

  // Sort by creation date and limit images
  const sortedImages = images.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const displayImages = sortedImages.slice(0, 6);

  return (
    <div className={containerClassName} style={style}>
      {/* Header */}
      {headingText && (
      <div className="flex items-center justify-between">
        <div>
          <h3 className="ts-media-heading text-lg font-semibold text-thread-pine">{headingText}</h3>
          <p className="ts-media-subtitle text-sm text-thread-sage">
            {owner?.displayName || owner?.handle || 'This user'}&apos;s favorite photos
          </p>
        </div>
        <div className="flex gap-2">
          {displayImages.length > 0 && (
            <span className="ts-media-view-all thread-button-secondary text-sm cursor-default">
              View All
            </span>
          )}
        </div>
      </div>
      )}

      {/* Media Grid */}
      <div className="media-gallery grid grid-cols-2 sm:grid-cols-3 gap-4">
        {displayImages.map((image) => (
          <div
            key={image.id}
            className="media-item ts-media-item border border-thread-sage bg-thread-paper shadow-cozy aspect-square overflow-hidden group relative"
          >
            <img
              src={image.url}
              alt={image.caption || image.alt || 'Photo'}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            {/* Hover overlay with caption */}
            {image.caption && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <div className="text-white text-xs">
                  <div className="line-clamp-2">{image.caption}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Link to full gallery (non-functional in preview) */}
      {displayImages.length > 0 && (
        <div className="text-center">
          <span className="ts-media-more text-thread-pine text-sm cursor-default">
            Explore {owner?.displayName || owner?.handle || 'this user'}&apos;s complete photo collection →
          </span>
        </div>
      )}
    </div>
  );
}