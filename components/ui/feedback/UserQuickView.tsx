"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { UserQuickViewData } from "@/types/user-quick-view";
import ImprovedBadgeDisplay from "@/components/shared/ImprovedBadgeDisplay";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useChat } from "@/contexts/ChatContext";

interface UserQuickViewProps {
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserQuickView({ username, isOpen, onClose }: UserQuickViewProps) {
  const [data, setData] = useState<UserQuickViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [currentRelationship, setCurrentRelationship] = useState<string | null>(null);
  const { loggedIn } = useCurrentUser();
  const { openDM } = useChat();

  useEffect(() => {
    if (!isOpen) return;

    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(username)}/quick-view`);
        if (!response.ok) {
          throw new Error("Failed to load user data");
        }
        const result = await response.json();
        if (result.success && result.data) {
          setData(result.data);
          setCurrentRelationship(result.data.relationship);
        } else {
          throw new Error(result.error || "Unknown error");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [username, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleFollow = async () => {
    setFollowBusy(true);
    try {
      const response = await csrfFetch(`/api/follow/${encodeURIComponent(username)}`, {
        method: "POST",
      });
      if (response.status === 401) {
        setError("Please log in to follow users");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to follow user");
      }

      // Update relationship status optimistically
      if (currentRelationship === "followed_by") {
        setCurrentRelationship("friends");
      } else {
        setCurrentRelationship("following");
      }

      // Refetch to get accurate stats
      const refreshResponse = await fetch(`/api/users/${encodeURIComponent(username)}/quick-view`);
      if (refreshResponse.ok) {
        const result = await refreshResponse.json();
        if (result.success && result.data) {
          setData(result.data);
          setCurrentRelationship(result.data.relationship);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to follow user");
    } finally {
      setFollowBusy(false);
    }
  };

  const handleUnfollow = async () => {
    setFollowBusy(true);
    try {
      const response = await csrfFetch(`/api/follow/${encodeURIComponent(username)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to unfollow user");
      }

      // Update relationship status optimistically
      if (currentRelationship === "friends") {
        setCurrentRelationship("followed_by");
      } else {
        setCurrentRelationship("none");
      }

      // Refetch to get accurate stats
      const refreshResponse = await fetch(`/api/users/${encodeURIComponent(username)}/quick-view`);
      if (refreshResponse.ok) {
        const result = await refreshResponse.json();
        if (result.success && result.data) {
          setData(result.data);
          setCurrentRelationship(result.data.relationship);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to unfollow user");
    } finally {
      setFollowBusy(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-6">
          <div className="animate-pulse">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-20 h-20 bg-thread-cream rounded-full" />
              <div className="flex-1">
                <div className="h-6 bg-thread-cream rounded w-32 mb-2" />
                <div className="h-4 bg-thread-cream rounded w-24" />
              </div>
            </div>
            <div className="h-20 bg-thread-cream rounded mb-4" />
            <div className="flex gap-4">
              <div className="h-10 bg-thread-cream rounded flex-1" />
              <div className="h-10 bg-thread-cream rounded flex-1" />
            </div>
          </div>
        </div>
      );
    }

    if (error || !data) {
      return (
        <div className="p-6">
          <p className="text-red-700 mb-4">{error || "Failed to load user data"}</p>
          <button onClick={onClose} className="thread-button">
            Close
          </button>
        </div>
      );
    }

    const isOwner = currentRelationship === "owner";
    const showFollow = currentRelationship === "none" || currentRelationship === "followed_by";
    const showUnfollow = currentRelationship === "following" || currentRelationship === "friends";
    const followLabel = currentRelationship === "followed_by" ? "Follow Back" : "Follow";

    return (
      <div className="p-6">
        {/* Header with Avatar and Name */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-thread-cream border-2 border-thread-sage flex-shrink-0">
            {data.avatarUrl ? (
              <img
                src={data.avatarUrl}
                alt={data.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-thread-charcoal">
                {data.displayName[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-thread-charcoal mb-1 truncate">
              {data.displayName}
            </h2>
            <p className="text-sm text-thread-charcoal opacity-70 truncate">
              @{data.username}
            </p>
            {currentRelationship === "friends" && (
              <span className="inline-block mt-1 text-xs bg-thread-sage text-white px-2 py-0.5 rounded">
                Friends
              </span>
            )}
            {currentRelationship === "followed_by" && (
              <span className="inline-block mt-1 text-xs bg-thread-cream text-thread-charcoal px-2 py-0.5 rounded border border-thread-sage">
                Follows you
              </span>
            )}
          </div>
        </div>

        {/* Bio */}
        {data.bio && (
          <div className="mb-4">
            <p className="text-sm text-thread-charcoal whitespace-pre-wrap line-clamp-3">
              {data.bio}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 mb-4 text-sm text-thread-charcoal">
          <div>
            <span className="font-bold">{data.stats.followers}</span>{" "}
            <span className="opacity-70">Followers</span>
          </div>
          <div>
            <span className="font-bold">{data.stats.following}</span>{" "}
            <span className="opacity-70">Following</span>
          </div>
          <div>
            <span className="font-bold">{data.stats.posts}</span>{" "}
            <span className="opacity-70">Posts</span>
          </div>
          {data.stats.mutualFriends > 0 && (
            <div>
              <span className="font-bold">{data.stats.mutualFriends}</span>{" "}
              <span className="opacity-70">Mutual</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="mb-4">
          <ImprovedBadgeDisplay
            userId={data.userId}
            context="comments"
            layout="compact"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          {!isOwner && loggedIn && (
            <>
              {showFollow && (
                <button
                  onClick={handleFollow}
                  disabled={followBusy}
                  className="thread-button text-sm disabled:opacity-50 flex-1"
                >
                  {followBusy ? "Working…" : followLabel}
                </button>
              )}
              {showUnfollow && (
                <button
                  onClick={handleUnfollow}
                  disabled={followBusy}
                  className="px-3 py-1 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream text-thread-charcoal rounded shadow-cozySm transition-all disabled:opacity-50 flex-1"
                >
                  {followBusy ? "Working…" : "Unfollow"}
                </button>
              )}
              <button
                onClick={() => {
                  openDM(data.userId);
                  onClose();
                }}
                className="px-3 py-1 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream text-thread-charcoal rounded shadow-cozySm transition-all flex-1"
              >
                Message
              </button>
            </>
          )}
          {isOwner && (
            <Link
              href="/settings/profile"
              className="thread-button text-sm text-center flex-1"
            >
              Edit Profile
            </Link>
          )}
        </div>

        {/* Navigation Links */}
        <div className="flex gap-2">
          <Link
            href={`/resident/${data.username}`}
            className="flex-1 text-center px-3 py-2 text-sm border border-thread-sage bg-white hover:bg-thread-cream text-thread-charcoal rounded shadow-cozySm transition-all"
          >
            View Full Profile
          </Link>
          {data.hasCustomPixelHome && (
            <Link
              href={`/home/${data.username}`}
              className="flex-1 text-center px-3 py-2 text-sm border border-thread-sage bg-white hover:bg-thread-cream text-thread-charcoal rounded shadow-cozySm transition-all"
            >
              Visit Pixel Home
            </Link>
          )}
        </div>

        {error && (
          <p className="text-red-700 text-xs mt-2">{error}</p>
        )}
      </div>
    );
  };

  return createPortal(
    <>
      {/* Invisible backdrop for click-outside-to-close */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 60000 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-thread-paper border-2 border-thread-sage rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        style={{ zIndex: 60001 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-thread-charcoal hover:bg-thread-cream rounded-full transition-colors"
          aria-label="Close"
        >
          ×
        </button>

        {renderContent()}
      </div>
    </>,
    document.body
  );
}
