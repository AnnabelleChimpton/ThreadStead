import React, { useState, useEffect } from "react";
import Link from "next/link";
import MediaUpload from "@/components/MediaUpload";
import PhotoComments from "@/components/PhotoComments";

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
  width?: number;
  height?: number;
  fileSize?: number;
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
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const [showComments, setShowComments] = useState(false);

  const loadFeaturedMedia = async () => {
    try {
      const response = await fetch(`/api/photos/featured/${username}`);
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

  // Handle keyboard shortcuts for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedImage) {
        setSelectedImage(null);
        setShowComments(false);
      }
    };

    if (selectedImage) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [selectedImage]);

  const handleUploadSuccess = (newMedia: MediaItem) => {
    // Add to featured media if it was marked as featured
    if (newMedia.featured) {
      setFeaturedMedia(prev => [...prev, newMedia].sort((a, b) => 
        (a.featuredOrder || 0) - (b.featuredOrder || 0)
      ));
    }
    setShowUpload(false);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Create display grid - only show actual media items
  const createDisplayGrid = () => {
    const sortedMedia = featuredMedia.sort((a, b) => 
      (a.featuredOrder || 0) - (b.featuredOrder || 0)
    );
    
    return sortedMedia.slice(0, 6).map(media => (
      <div
        key={media.id}
        className="ts-media-item border border-thread-sage bg-thread-paper shadow-cozy aspect-square overflow-hidden group relative cursor-pointer hover:shadow-cozyLg transition-all"
        onClick={() => setSelectedImage(media)}
      >
        <img 
          src={media.mediumUrl} 
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

      {/* Full Size Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4"
          style={{ 
            zIndex: 9999, 
            position: 'fixed',
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            width: '100vw',
            height: '100vh'
          }}
          onClick={() => {
            setSelectedImage(null);
            setShowComments(false);
          }}
        >
          <div 
            className="max-w-6xl max-h-full bg-white rounded-lg overflow-hidden shadow-2xl flex"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image section */}
            <div className="flex-1 relative">
              <img 
                src={selectedImage.fullUrl} 
                alt={selectedImage.title || selectedImage.caption || 'Full size image'} 
                className="w-full h-full max-h-[80vh] object-contain"
              />
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setShowComments(false);
                }}
                className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/90 transition-colors"
                title="Close"
              >
                ×
              </button>
              
              {/* Comments toggle button */}
              <button
                onClick={() => setShowComments(!showComments)}
                className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-2 rounded hover:bg-black/90 transition-colors text-sm"
                title={showComments ? "Hide comments" : "Show comments"}
              >
                💬 {showComments ? "Hide" : "Comments"}
              </button>
            </div>

            {/* Comments sidebar */}
            {showComments && (
              <div className="w-96 border-l border-thread-sage bg-white flex flex-col max-h-[80vh]">
                {/* Photo info header */}
                <div className="p-4 border-b border-thread-sage">
                  {selectedImage.title && (
                    <h3 className="font-medium text-thread-pine mb-2">
                      {selectedImage.title}
                    </h3>
                  )}
                  {selectedImage.caption && (
                    <p className="text-thread-sage text-sm mb-2">
                      {selectedImage.caption}
                    </p>
                  )}
                  <div className="flex justify-between items-center text-xs text-thread-sage">
                    <span>{formatDate(selectedImage.createdAt)}</span>
                    {selectedImage.fileSize && (
                      <span>{formatFileSize(selectedImage.fileSize)}</span>
                    )}
                  </div>
                </div>

                {/* Comments section */}
                <div className="flex-1 overflow-y-auto p-4">
                  <PhotoComments 
                    photoId={selectedImage.id} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}