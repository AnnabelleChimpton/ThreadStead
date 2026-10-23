import React, { useState, useEffect } from "react";
import { getInternalBaseUrl } from "@/lib/utils/api/internal-base-url";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Link from "next/link";
import ProfileLayout from "@/components/ui/layout/ProfileLayout";
import RetroCard from "@/components/ui/layout/RetroCard";
import MediaUpload from "@/components/ui/media/MediaUpload";
import PhotoComments from "@/components/core/content/PhotoComments";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { CapabilityError, requestCapability } from "@/lib/api/client/capability";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import Modal from "@/components/ui/feedback/Modal";
import PrivateProfile from "@/components/core/profile/PrivateProfile";
import PageMeta from "@/components/ui/layout/PageMeta";

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

/** The gallery of a profile the viewer may not see shows the private-profile page. */
interface HiddenMediaProps {
  privateProfile: {
    username: string;
    displayName: string;
    avatarUrl: string;
    visibility: 'private' | 'followers' | 'friends';
  };
}

export default function MediaGalleryRoute(props: MediaGalleryProps | HiddenMediaProps) {
  if ('privateProfile' in props) {
    return <PrivateProfile {...props.privateProfile} />;
  }
  return <MediaGalleryPage {...props} />;
}

function MediaGalleryPage({
  username,
  isOwner,
  initialMedia,
  pagination: initialPagination
}: MediaGalleryProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const { showSuccess, showError } = useToast();

  // The image's full-size address, to paste into your own page's <img src>
  const copyImageLink = async (item: MediaItem) => {
    const link = new URL(item.fullUrl, window.location.origin).href;
    try {
      await navigator.clipboard.writeText(link);
      showSuccess("Link copied. Paste it into an <img src> on your page.");
    } catch {
      showError(`Couldn't copy. The link is ${link}`);
    }
  };
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const closeLightbox = () => {
    setSelectedImage(null);
    setShowComments(false);
    setEditing(false);
    setActionError(null);
    router.replace(`/resident/${username}/media`, undefined, { shallow: true });
  };

  const startEditing = (item: MediaItem) => {
    setEditTitle(item.title || "");
    setEditCaption(item.caption || "");
    setActionError(null);
    setEditing(true);
    setShowComments(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedImage) return;
    setBusy(true);
    setActionError(null);
    try {
      // Media writes need a short-lived capability token, same as uploads.
      const cap = await requestCapability("media");
      const res = await csrfFetch(`/api/media/${selectedImage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cap, title: editTitle, caption: editCaption }),
      });
      if (!res.ok) {
        setActionError((await res.json().catch(() => ({}))).error || "Couldn't save your changes. Try again.");
        return;
      }
      const { media: updated } = await res.json();
      const patch = { title: updated.title ?? undefined, caption: updated.caption ?? undefined };
      setMedia(prev => prev.map(m => (m.id === updated.id ? { ...m, ...patch } : m)));
      setSelectedImage(prev => (prev && prev.id === updated.id ? { ...prev, ...patch } : prev));
      setEditing(false);
    } catch (error) {
      console.error("Failed to update media:", error);
      setActionError(error instanceof CapabilityError ? error.message : "Couldn't save your changes. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedImage) return;
    const ok = await confirm({
      title: "Delete this image for good?",
      message: "Anywhere it's been linked or embedded — posts, comments, other sites — will show a broken image.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    setActionError(null);
    try {
      const cap = await requestCapability("media");
      const res = await csrfFetch(`/api/media/${selectedImage.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cap }),
      });
      if (!res.ok) {
        setActionError((await res.json().catch(() => ({}))).error || "Couldn't delete this image. Try again.");
        return;
      }
      const deletedId = selectedImage.id;
      setMedia(prev => prev.filter(m => m.id !== deletedId));
      setPagination(prev => ({ ...prev, totalCount: Math.max(0, prev.totalCount - 1) }));
      closeLightbox();
    } catch (error) {
      console.error("Failed to delete media:", error);
      setActionError(error instanceof CapabilityError ? error.message : "Couldn't delete this image. Try again.");
    } finally {
      setBusy(false);
    }
  };

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
      <PageMeta title={`${username}'s media`} description={`Pictures and music ${username} has shared on HomePageAgain.`} path={`/resident/${username}/media`} />
      <ProfileLayout>
        <RetroCard className="ts-phone-sheet">
          <div className="space-y-6">
            {/* Header. Phones: the buttons go under the title, side by side */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                  className="thread-button-secondary inline-flex items-center justify-center min-h-[44px] sm:min-h-0 flex-1 sm:flex-none whitespace-nowrap"
                >
                  Back to Profile
                </Link>
                {isOwner && (
                  <button
                    onClick={() => setShowUpload(!showUpload)}
                    className="thread-button inline-flex items-center justify-center min-h-[44px] sm:min-h-0 flex-1 sm:flex-none whitespace-nowrap"
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {media.map((item) => (
                    <div
                      key={item.id}
                      className="group relative border border-thread-sage rounded-lg overflow-hidden bg-thread-paper shadow-cozy hover:shadow-cozy-lg transition-all cursor-pointer"
                      onClick={() => setSelectedImage(item)}
                    >
                      {/* Featured Badge */}
                      {item.featured && (
                        <div className="absolute top-2 left-2 z-10 bg-thread-pine text-white text-xs px-2 py-1 rounded">
                          Featured
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
        <Modal
          isOpen={!!selectedImage}
          onClose={() => { if (!busy) closeLightbox(); }}
          title={selectedImage?.title || selectedImage?.caption || "Photo"}
          hideTitle
          maxWidth="max-w-6xl"
          className="overflow-hidden md:w-auto"
          bodyClassName="flex"
          backdropClassName="modal-overlay-high bg-black/80"
        >
          {selectedImage && (
            <>
              {/* Image section */}
              <div className="flex-1 relative">
                <img 
                  src={selectedImage.fullUrl} 
                  alt={selectedImage.title || selectedImage.caption || 'Full size image'} 
                  className="w-full h-full max-h-[80vh] object-contain"
                />
                <button
                  onClick={closeLightbox}
                  className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/90 transition-colors"
                  title="Close"
                  aria-label="Close"
                >
                  <PixelIcon name="close" size={16} />
                </button>
                
                {actionError && !showComments && (
                  <p className="absolute top-2 left-2 right-12 bg-thread-paper text-thread-sunset text-sm px-3 py-2 rounded" role="alert">
                    {actionError}
                  </p>
                )}

                {/* Owner actions */}
                {isOwner && !editing && (
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <button
                      onClick={() => startEditing(selectedImage)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 bg-black/70 text-white px-3 py-2 rounded hover:bg-black/90 transition-colors text-sm disabled:opacity-50"
                    >
                      <PixelIcon name="edit" size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => copyImageLink(selectedImage)}
                      className="inline-flex items-center gap-1 bg-black/70 text-white px-3 py-2 rounded hover:bg-black/90 transition-colors text-sm"
                    >
                      <PixelIcon name="link" size={16} />
                      Copy link
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={busy}
                      className="inline-flex items-center gap-1 bg-black/70 text-white px-3 py-2 rounded hover:bg-thread-sunset transition-colors text-sm disabled:opacity-50"
                    >
                      <PixelIcon name="trash" size={16} />
                      {busy ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                )}

                {/* Comments toggle button */}
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="absolute bottom-4 right-4 inline-flex items-center gap-1 bg-black/70 text-white px-3 py-2 rounded hover:bg-black/90 transition-colors text-sm"
                  title={showComments ? "Hide comments" : "Show comments"}
                >
                  <PixelIcon name="chat" size={16} />
                  {showComments ? "Hide" : "Comments"}
                </button>
              </div>

              {/* Comments sidebar */}
              {showComments && (
                <div className="w-96 border-l border-thread-sage flex flex-col max-h-[80vh]">
                  {/* Photo info header */}
                  <div className="p-4 border-b border-thread-sage">
                    {editing ? (
                      <form
                        className="space-y-2 mb-2"
                        onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}
                      >
                        <label className="block text-xs text-thread-sage">
                          Title
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            maxLength={100}
                            disabled={busy}
                            autoFocus
                            className="mt-1 w-full border border-thread-sage p-2 bg-thread-paper text-thread-pine text-sm rounded focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
                          />
                        </label>
                        <label className="block text-xs text-thread-sage">
                          Caption
                          <textarea
                            value={editCaption}
                            onChange={(e) => setEditCaption(e.target.value)}
                            maxLength={500}
                            rows={3}
                            disabled={busy}
                            className="mt-1 w-full border border-thread-sage p-2 bg-thread-paper text-thread-pine text-sm rounded focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
                          />
                        </label>
                        <div className="flex gap-2">
                          <button type="submit" disabled={busy} className="thread-button text-sm disabled:opacity-50">
                            {busy ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => { setEditing(false); setActionError(null); }}
                            className="thread-button-secondary text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
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
                      </>
                    )}
                    {actionError && (
                      <p className="text-thread-sunset text-sm mb-2" role="alert">{actionError}</p>
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
            </>
          )}
        </Modal>
      </ProfileLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<MediaGalleryProps | HiddenMediaProps> = async ({ 
  params, 
  query,
  req 
}) => {
  const username = Array.isArray(params?.username) ? params.username[0] : String(params?.username || "");
  const page = parseInt(String(query.page || "1"));
  
  if (!username) return { notFound: true };

  const base = getInternalBaseUrl();

  try {
    // Get current user to determine ownership
    const { getSessionUser } = await import('@/lib/auth/server');
    const currentUser = await getSessionUser(req as any);

    // Get profile data to verify user exists and get user ID. Forward the
    // cookie so the profile's visibility is checked against this viewer.
    const headers = { cookie: req.headers.cookie || '' };
    const profileRes = await fetch(`${base}/api/profile/${encodeURIComponent(username)}`, { headers });
    if (profileRes.status === 404) return { notFound: true };
    if (profileRes.status === 403) {
      const hidden = await profileRes.json();
      if (hidden.error === 'private_profile') {
        return {
          props: {
            privateProfile: {
              username: hidden.username || username,
              displayName: hidden.displayName || username,
              avatarUrl: hidden.avatarUrl || '/assets/default-avatar.gif',
              visibility: hidden.visibility,
            },
          },
        };
      }
    }
    if (!profileRes.ok) return { notFound: true };

    const profileData = await profileRes.json();
    const isOwner = currentUser?.id === profileData.userId;

    // Get media data
    const mediaRes = await fetch(`${base}/api/photos/${encodeURIComponent(username)}?page=${page}&limit=20`, { headers });
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