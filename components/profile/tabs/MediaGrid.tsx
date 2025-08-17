import React, { useState, useEffect } from "react";
import Link from "next/link";
import MediaUpload from "@/components/MediaUpload";

interface MediaItem {
  id: string;
  thumbnailUrl: string;
  mediumUrl: string;
  fullUrl: string;
  caption?: string;
  title?: string;
  featured: boolean;
  featuredOrder?: number;
  createdAt: string;
}

interface MediaGridProps {
  username: string;
  isOwner?: boolean;
}

export default function MediaGrid({ username, isOwner = false }: MediaGridProps) {
  const [featuredMedia, setFeaturedMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const loadFeaturedMedia = async () => {
    try {
      const response = await fetch(`/api/photos/${username}/featured`);
      if (response.ok) {
        const data = await response.json();
        setFeaturedMedia(data.media || []);
      } else {
        setError("Failed to load media");
      }
    } catch (err) {
      setError("Failed to load media");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeaturedMedia();
  }, [username]);

  const handleUploadSuccess = (newMedia: MediaItem) => {
    // Add to featured media if it was marked as featured
    if (newMedia.featured) {
      setFeaturedMedia(prev => [...prev, newMedia].sort((a, b) => 
        (a.featuredOrder || 0) - (b.featuredOrder || 0)
      ));
    }
    setShowUpload(false);
  };

  // Create display grid - only show actual media items
  const createDisplayGrid = () => {
    const sortedMedia = featuredMedia.sort((a, b) => 
      (a.featuredOrder || 0) - (b.featuredOrder || 0)
    );
    
    return sortedMedia.slice(0, 6).map(media => (
      <div
        key={media.id}
        className="ts-media-item border border-thread-sage bg-thread-paper shadow-cozy aspect-square overflow-hidden group relative"
      >
        <img 
          src={media.thumbnailUrl} 
          alt={media.title || media.caption || 'Media item'} 
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        {/* Overlay with caption */}
        {(media.title || media.caption) && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
            <div className="text-white text-xs">
              {media.title && <div className="font-medium">{media.title}</div>}
              {media.caption && (
                <div className="line-clamp-2">{media.caption}</div>
              )}
            </div>
          </div>
        )}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="ts-media-tab-content profile-tab-content">
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-thread-pine border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-thread-sage">Loading media...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ts-media-tab-content profile-tab-content space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-thread-pine">Featured Media</h3>
          <p className="text-sm text-thread-sage">
            {isOwner ? "Share your favorite moments (up to 6)" : `${username}'s favorite moments`}
          </p>
        </div>
        <div className="flex gap-2">
          {featuredMedia.length > 0 && (
            <Link 
              href={`/resident/${username}/media`}
              className="thread-button-secondary text-sm"
            >
              View All
            </Link>
          )}
          {isOwner && (
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="thread-button text-sm"
            >
              {showUpload ? "Cancel" : "Add Photo"}
            </button>
          )}
        </div>
      </div>

      {/* Upload Section */}
      {isOwner && showUpload && (
        <MediaUpload onUploadSuccess={handleUploadSuccess} />
      )}

      {/* Media Grid - only show when there are photos */}
      {featuredMedia.length > 0 ? (
        <>
          <div className="ts-media-gallery grid grid-cols-2 sm:grid-cols-3 gap-4">
            {createDisplayGrid()}
          </div>

          {/* Link to full gallery */}
          <div className="text-center">
            <Link 
              href={`/resident/${username}/media`}
              className="text-thread-pine hover:text-thread-sunset transition-colors text-sm"
            >
              Explore {isOwner ? "your" : `${username}'s`} complete media collection →
            </Link>
          </div>
        </>
      ) : (
        /* Empty state */
        !showUpload && (
          <div className="text-center py-12">
            {isOwner ? (
              <>
                <div className="text-6xl mb-4">📸</div>
                <h3 className="text-lg font-medium text-thread-pine mb-2">Start sharing your moments</h3>
                <p className="text-thread-sage mb-4">
                  Every image has a story. What&apos;s yours?
                </p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="thread-button"
                >
                  Share your first photo
                </button>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">🖼️</div>
                <h3 className="text-lg font-medium text-thread-pine mb-2">No featured photos</h3>
                <p className="text-thread-sage">
                  {username} hasn&apos;t featured any photos yet.
                </p>
              </>
            )}
          </div>
        )
      )}

      {error && (
        <div className="text-center py-8 text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}