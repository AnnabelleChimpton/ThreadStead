import React from "react";

interface MediaItem {
  id: string | number;
  url?: string;
  title?: string;
  type?: 'image' | 'video' | 'placeholder';
}

interface MediaGridProps {
  items?: MediaItem[];
  placeholderCount?: number;
}

export default function MediaGrid({ 
  items = [], 
  placeholderCount = 6 
}: MediaGridProps) {
  // Show placeholder items if no real items provided
  const displayItems = items.length > 0 
    ? items 
    : Array.from({ length: placeholderCount }, (_, i) => ({
        id: `placeholder-${i + 1}`,
        type: 'placeholder' as const,
        title: `img ${i + 1}`
      }));

  return (
    <div className="ts-media-tab-content profile-tab-content" data-component="media-grid">
      <div className="ts-media-gallery grid grid-cols-2 sm:grid-cols-3 gap-3">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="ts-media-item border border-black bg-white shadow-[2px_2px_0_#000] aspect-square flex items-center justify-center"
            data-media-type={item.type}
          >
            {item.type === 'placeholder' ? (
              <span className="ts-media-placeholder-text text-sm">
                {item.title}
              </span>
            ) : item.url ? (
              <img 
                src={item.url} 
                alt={item.title || 'Media item'} 
                className="ts-media-image w-full h-full object-cover"
              />
            ) : (
              <span className="ts-media-loading-text text-sm">
                Loading...
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}