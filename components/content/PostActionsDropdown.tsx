import React, { useState, useRef, useEffect } from "react";
import ReportButton from "../ReportButton";

interface PostActionsDropdownProps {
  post: {
    id: string;
    title?: string | null;
    textPreview?: string | null;
    author?: { id: string; primaryHandle?: string; profile?: { displayName?: string } };
    isPinned?: boolean;
  };
  isOwner: boolean;
  isAdmin?: boolean;
  busy?: boolean;
  threadRingContext?: { slug: string; name: string } | null;
  canModerateRing?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onAdminDelete?: () => void;
  onPinToggle?: () => void;
  onRemoveFromRing?: () => void;
}

export default function PostActionsDropdown({
  post,
  isOwner,
  isAdmin = false,
  busy = false,
  threadRingContext,
  canModerateRing = false,
  onEdit,
  onDelete,
  onAdminDelete,
  onPinToggle,
  onRemoveFromRing,
}: PostActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const copyPostLink = async () => {
    const postUrl = post.author?.primaryHandle 
      ? `${window.location.origin}/resident/${post.author.primaryHandle}/post/${post.id}`
      : `${window.location.origin}/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      alert("Link copied to clipboard!");
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = postUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Link copied to clipboard!");
    }
    setIsOpen(false);
  };

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  // Don't render if no actions are available
  const hasActions = isOwner || isAdmin || !isOwner || (threadRingContext && canModerateRing);
  if (!hasActions) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={busy}
        className="border border-black px-2 py-1 bg-white hover:bg-gray-100 shadow-[1px_1px_0_#000] text-xs disabled:opacity-50"
        title="Post actions"
      >
        ⋯
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 border border-black bg-white shadow-[2px_2px_0_#000] rounded z-50">
          <div className="py-1">
            {/* Share link - always available */}
            <button
              onClick={copyPostLink}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100"
            >
              <span>🔗</span>
              Share Link
            </button>

            {/* Owner actions */}
            {isOwner && (
              <>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={() => handleAction(onEdit!)}
                  disabled={busy}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 disabled:opacity-50"
                >
                  <span>✏️</span>
                  Edit
                </button>
                <button
                  onClick={() => handleAction(onDelete!)}
                  disabled={busy}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 disabled:opacity-50"
                >
                  <span>🗑️</span>
                  Delete
                </button>
              </>
            )}

            {/* ThreadRing moderation actions */}
            {threadRingContext && canModerateRing && (
              <>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={() => handleAction(onPinToggle!)}
                  disabled={busy}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 disabled:opacity-50"
                >
                  <span>{post.isPinned ? "📌" : "📍"}</span>
                  {post.isPinned ? "Unpin" : "Pin"}
                </button>
                <button
                  onClick={() => handleAction(onRemoveFromRing!)}
                  disabled={busy}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 disabled:opacity-50"
                >
                  <span>🗑️</span>
                  Remove from Ring
                </button>
              </>
            )}

            {/* Admin actions */}
            {isAdmin && !isOwner && (
              <>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={() => handleAction(onAdminDelete!)}
                  disabled={busy}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 disabled:opacity-50 text-red-600"
                >
                  <span>🛡️</span>
                  Admin Delete
                </button>
              </>
            )}

            {/* Report action - show for non-owners */}
            {!isOwner && post.author && (
              <>
                <div className="border-t border-gray-200 my-1"></div>
                <div className="px-3 py-2">
                  <ReportButton
                    reportType="post"
                    targetId={post.id}
                    reportedUserId={post.author.id}
                    contentPreview={post.title || post.textPreview || "Post content"}
                    size="dropdown"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}