import React, { useState, useEffect } from "react";
import Link from "next/link";
import MediaUpload from "@/components/MediaUpload";
import PhotoComments from "@/components/PhotoComments";

interface PhotoItem {
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
  mediaType?: string; // Add mediaType for type checking
}

interface MediaGridProps {
  username: string;
  isOwner?: boolean;
}

export default function MediaGrid({ username, isOwner = false }: MediaGridProps) {
  const [featuredPhotos, setFeaturedPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState<PhotoItem | null>(null);
  const [showComments, setShowComments] = useState(false);

  const loadFeaturedPhotos = async () => {
    try {
      const response = await fetch(`/api/photos/featured/${username}`);
      if (response.ok) {
        const data = await response.json();
        setFeaturedPhotos(data.media || []);
      } else {
        setError("Failed to load photos");
      }
    } catch (err) {
      setError("Failed to load photos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeaturedPhotos();
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

  const handleUploadSuccess = (newPhoto: any) => {
    // Add to featured photos if it was marked as featured and is an image
    if (newPhoto.featured && newPhoto.mediaType === 'image') {
      setFeaturedPhotos(prev => [...prev, newPhoto].sort((a, b) => 
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

  // Create display grid - only show actual photo items
  const createPhotoGrid = () => {
    const sortedPhotos = featuredPhotos.sort((a, b) => 
      (a.featuredOrder || 0) - (b.featuredOrder || 0)
    );
    
    return sortedPhotos.slice(0, 6).map(photo => (
      <div
        key={photo.id}
        className="ts-media-item border border-thread-sage bg-thread-paper shadow-cozy aspect-square overflow-hidden group relative cursor-pointer hover:shadow-cozyLg transition-all"
        onClick={() => setSelectedImage(photo)}
      >
        <img 
          src={photo.mediumUrl} 
          alt={photo.title || photo.caption || 'Photo'} 
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        {/* Overlay with caption */}
        {(photo.title || photo.caption) && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
            <div className="text-white text-xs">
              {photo.title && <div className="font-medium">{photo.title}</div>}
              {photo.caption && (
                <div className="line-clamp-2">{photo.caption}</div>
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
          <h3 className="text-lg font-semibold text-thread-pine">Featured Photos</h3>
          <p className="text-sm text-thread-sage">
            {isOwner ? "Share your favorite photos (up to 6)" : `${username}'s favorite photos`}
          </p>
        </div>
        <div className="flex gap-2">
          {featuredPhotos.length > 0 && (
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
      {featuredPhotos.length > 0 ? (
        <>
          <div className="ts-media-gallery grid grid-cols-2 sm:grid-cols-3 gap-4">
            {createPhotoGrid()}
          </div>

          {/* Link to full gallery */}
          <div className="text-center">
            <Link 
              href={`/resident/${username}/media`}
              className="text-thread-pine hover:text-thread-sunset transition-colors text-sm"
            >
              Explore {isOwner ? "your" : `${username}'s`} complete photo collection →
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
          className="media-modal-overlay bg-black/80 flex items-center justify-center p-4"
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