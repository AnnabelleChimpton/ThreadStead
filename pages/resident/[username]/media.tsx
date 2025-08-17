import React, { useState, useEffect } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import ProfileLayout from "@/components/layout/ProfileLayout";
import RetroCard from "@/components/layout/RetroCard";
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

interface MediaGalleryProps {
  username: string;
  isOwner: boolean;
  initialMedia: MediaItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function MediaGalleryPage({
  username,
  isOwner,
  initialMedia,
  pagination: initialPagination
}: MediaGalleryProps) {
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const [showComments, setShowComments] = useState(false);

  const loadPage = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/photos/${username}?page=${page}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setMedia(data.media);
        setPagination(data.pagination);
        
        // Update URL without page reload
        const url = new URL(window.location.href);
        if (page === 1) {
          url.searchParams.delete('page');
        } else {
          url.searchParams.set('page', page.toString());
        }
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error) {
      console.error("Failed to load page:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (newMedia: MediaItem) => {
    // Add new media to the beginning of the list
    setMedia(prev => [newMedia, ...prev]);
    setShowUpload(false);
  };

  // Handle URL parameters for opening specific photo with highlighted comment
  useEffect(() => {
    const { photo } = router.query;
    if (photo && typeof photo === 'string') {
      const targetPhoto = media.find(item => item.id === photo);
      if (targetPhoto) {
        setSelectedImage(targetPhoto);
        setShowComments(true);
      }
    }
  }, [router.query, media]);

  // Handle keyboard shortcuts for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedImage) {
        setSelectedImage(null);
        setShowComments(false);
        // Clear URL parameters
        router.replace(`/resident/${username}/media`, undefined, { shallow: true });
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
  }, [selectedImage, router, username]);

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

  return (
    <>
      <Head>
        <title>Media Gallery - {username} | ThreadStead</title>
      </Head>
      <ProfileLayout>
        <RetroCard>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-thread-pine">
                  {isOwner ? "Your" : `${username}'s`} Media Gallery
                </h1>
                <p className="text-thread-sage">
                  {pagination.totalCount} {pagination.totalCount === 1 ? 'image' : 'images'} shared
                </p>
              </div>
              <div className="flex gap-2">
                <Link 
                  href={`/resident/${username}`}
                  className="thread-button-secondary"
                >
                  Back to Profile
                </Link>
                {isOwner && (
                  <button
                    onClick={() => setShowUpload(!showUpload)}
                    className="thread-button"
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

            {/* Gallery Grid */}
            {media.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {media.map((item) => (
                    <div
                      key={item.id}
                      className="group relative border border-thread-sage rounded-lg overflow-hidden bg-thread-paper shadow-cozy hover:shadow-cozyLg transition-all cursor-pointer"
                      onClick={() => setSelectedImage(item)}
                    >
                      {/* Featured Badge */}
                      {item.featured && (
                        <div className="absolute top-2 left-2 z-10 bg-thread-pine text-white text-xs px-2 py-1 rounded">
                          ⭐ Featured
                        </div>
                      )}
                      
                      {/* Image */}
                      <div className="aspect-square overflow-hidden">
                        <img 
                          src={item.mediumUrl} 
                          alt={item.title || item.caption || 'Media item'} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      
                      {/* Caption */}
                      {(item.title || item.caption) && (
                        <div className="p-3">
                          {item.title && (
                            <h3 className="font-medium text-thread-pine text-sm mb-1 line-clamp-1">
                              {item.title}
                            </h3>
                          )}
                          {item.caption && (
                            <p className="text-thread-sage text-xs line-clamp-2">
                              {item.caption}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Date */}
                      <div className="px-3 pb-3">
                        <p className="text-thread-sage text-xs">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => loadPage(pagination.page - 1)}
                      disabled={!pagination.hasPrevPage || loading}
                      className="thread-button-secondary disabled:opacity-50"
                    >
                      Previous
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const page = i + 1;
                        const isCurrent = page === pagination.page;
                        return (
                          <button
                            key={page}
                            onClick={() => loadPage(page)}
                            disabled={loading}
                            className={`px-3 py-1 text-sm rounded ${
                              isCurrent 
                                ? 'bg-thread-pine text-white' 
                                : 'text-thread-sage hover:text-thread-pine'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => loadPage(pagination.page + 1)}
                      disabled={!pagination.hasNextPage || loading}
                      className="thread-button-secondary disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                {isOwner ? (
                  <div>
                    <div className="text-6xl mb-4">📸</div>
                    <h3 className="text-lg font-medium text-thread-pine mb-2">
                      Your gallery is waiting for its first story
                    </h3>
                    <p className="text-thread-sage mb-6">
                      Every image has a story. What&apos;s yours?
                    </p>
                    <button
                      onClick={() => setShowUpload(true)}
                      className="thread-button"
                    >
                      Share your first photo
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-6xl mb-4">🖼️</div>
                    <h3 className="text-lg font-medium text-thread-pine mb-2">
                      No photos shared yet
                    </h3>
                    <p className="text-thread-sage">
                      {username} hasn&apos;t shared any photos in their gallery.
                    </p>
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-thread-pine border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-thread-sage">Loading...</p>
              </div>
            )}
          </div>
        </RetroCard>

        {/* Full Size Image Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 pt-20"
            style={{ zIndex: 9999 }}
            onClick={() => {
              setSelectedImage(null);
              setShowComments(false);
              router.replace(`/resident/${username}/media`, undefined, { shallow: true });
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
                    router.replace(`/resident/${username}/media`, undefined, { shallow: true });
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
                      highlightCommentId={typeof router.query.comment === 'string' ? router.query.comment : undefined}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </ProfileLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<MediaGalleryProps> = async ({ 
  params, 
  query,
  req 
}) => {
  const username = String(params?.username || "");
  const page = parseInt(String(query.page || "1"));
  
  if (!username) return { notFound: true };

  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  const host = req?.headers?.host || "localhost:3000";
  const base = `${proto}://${host}`;

  try {
    // Get current user to determine ownership
    const { getSessionUser } = await import('@/lib/auth-server');
    const currentUser = await getSessionUser(req as any);

    // Get profile data to verify user exists and get user ID
    const profileRes = await fetch(`${base}/api/profile/${encodeURIComponent(username)}`);
    if (profileRes.status === 404) return { notFound: true };
    if (!profileRes.ok) return { notFound: true };

    const profileData = await profileRes.json();
    const isOwner = currentUser?.id === profileData.userId;

    // Get media data
    const mediaRes = await fetch(`${base}/api/photos/${encodeURIComponent(username)}?page=${page}&limit=20`);
    if (!mediaRes.ok) {
      return {
        props: {
          username,
          isOwner,
          initialMedia: [],
          pagination: {
            page: 1,
            limit: 20,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false
          }
        }
      };
    }

    const mediaData = await mediaRes.json();

    return {
      props: {
        username,
        isOwner,
        initialMedia: mediaData.media || [],
        pagination: mediaData.pagination || {
          page: 1,
          limit: 20,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    };

  } catch (error) {
    console.error("Error in media gallery getServerSideProps:", error);
    return { notFound: true };
  }
};