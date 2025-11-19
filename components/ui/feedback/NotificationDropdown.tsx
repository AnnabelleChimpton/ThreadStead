import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { NotificationData } from "./NotificationList";
import { PixelIcon, type PixelIconName } from '@/components/ui/PixelIcon';

interface NotificationDropdownProps {
  className?: string;
}

export default function NotificationDropdown({ className = "" }: NotificationDropdownProps) {
  const router = useRouter();
  const { loggedIn, loading: authLoading } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper function to extract username from handle (e.g., "alice@sitename" -> "alice")
  const getUsername = (handle: string | null | undefined): string | null => {
    if (!handle) return null;
    return handle.split('@')[0];
  };

  const fetchNotifications = useCallback(async () => {
    if (loading || !loggedIn) return;
    
    setLoading(true);
    try {
      const [notificationsRes, countRes] = await Promise.all([
        fetch("/api/notifications?limit=5"),
        fetch("/api/notifications/count")
      ]);

      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json();
        setNotifications(notificationsData.notifications || []);
      }

      if (countRes.ok) {
        const countData = await countRes.json();
        setUnreadCount(countData.count);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Could optionally show toast notification here
    } finally {
      setLoading(false);
    }
  }, [loggedIn]);

  const markAsRead = async (notificationIds: string[]) => {
    if (!loggedIn) return;
    
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationIds,
          status: "read",
        }),
      });
      
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) 
              ? { ...n, status: "read" as const }
              : n
          )
        );
        setUnreadCount(prev => prev !== null ? Math.max(0, prev - notificationIds.length) : 0);
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      // Could optionally show toast notification here
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notification count on mount and periodically
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch("/api/notifications/count");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count);
        }
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
        // Could optionally show toast notification here
      }
    };

    // Only fetch if logged in and auth loading is complete
    if (loggedIn && !authLoading) {
      fetchUnreadCount();
      
      // Set up periodic refresh every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    } else if (!loggedIn && !authLoading) {
      // User is not logged in, clear any existing count
      setUnreadCount(0);
    }
  }, [loggedIn, authLoading]);

  // Fetch full notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const getNotificationMessage = (notification: NotificationData): string => {
    const actorName = notification.actor.displayName || notification.actor.handle || "Someone";

    switch (notification.type) {
      case "comment":
        return `${actorName} commented on your post`;
      case "reply":
        return `${actorName} replied to your comment`;
      case "photo_comment":
        return `${actorName} commented on your photo${notification.data?.mediaTitle ? ` "${notification.data.mediaTitle}"` : ""}`;
      case "photo_reply":
        return `${actorName} replied to your comment on a photo`;
      case "follow":
        return `${actorName} started following you`;
      case "friend":
        return `${actorName} is now your mutual friend!`;
      case "guestbook":
        return `${actorName} signed your guestbook`;
      default:
        return `New activity from ${actorName}`;
    }
  };

  const getNotificationLink = (notification: NotificationData): string | null => {
    const username = getUsername(notification.actor.handle);
    
    switch (notification.type) {
      case "comment":
      case "reply":
        // For comments and replies, link to the individual post page with comments expanded
        if (notification.data?.postAuthorHandle && notification.data?.postId) {
          const postAuthorUsername = getUsername(notification.data.postAuthorHandle);
          if (postAuthorUsername) {
            // Build URL with query parameters for auto-expanding comments and highlighting
            const baseUrl = `/resident/${postAuthorUsername}/post/${notification.data.postId}`;
            const params = new URLSearchParams({
              comments: 'open',
              ...(notification.data.commentId && { highlight: notification.data.commentId })
            });
            return `${baseUrl}?${params.toString()}`;
          }
        }
        // Fallback to actor's profile
        return username ? `/resident/${username}` : null;
      case "photo_comment":
      case "photo_reply":
        // For photo comments, link to the specific photo in the owner's media gallery
        if (notification.data?.mediaId && notification.data?.mediaOwnerHandle) {
          const mediaOwnerUsername = getUsername(notification.data.mediaOwnerHandle);
          if (mediaOwnerUsername) {
            const params = new URLSearchParams({
              photo: notification.data.mediaId,
              ...(notification.data.commentId && { comment: notification.data.commentId })
            });
            return `/resident/${mediaOwnerUsername}/media?${params.toString()}`;
          }
        }
        // Fallback to actor's profile
        return username ? `/resident/${username}` : null;
      case "follow":
      case "friend":
        return username ? `/resident/${username}` : null;
      case "guestbook":
        return username ? `/resident/${username}` : null;
      default:
        return null;
    }
  };

  const getNotificationIcon = (type: string): PixelIconName => {
    switch (type) {
      case "comment":
      case "reply":
        return "chat";
      case "photo_comment":
      case "photo_reply":
        return "camera";
      case "follow":
        return "users";
      case "friend":
        return "users";
      case "guestbook":
        return "file";
      default:
        return "notification";
    }
  };

  // Don't render if user is not logged in or still loading auth
  if (!loggedIn || authLoading) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="notification-button group relative inline-flex items-center justify-center w-10 h-10 hover:bg-thread-cream rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-thread-sunset focus:ring-offset-2"
        title={unreadCount !== null ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Notifications"
      >
        <div className="relative">
          <svg 
            className="w-5 h-5 text-thread-pine group-hover:text-thread-sunset transition-colors duration-200" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount !== null && unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 font-semibold shadow-md animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </div>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="notification-dropdown-menu absolute right-0 top-full mt-2 w-80 lg:w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-[10000] max-h-96 overflow-hidden dropdown-animated">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-thread-cream to-thread-background">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-thread-pine" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <h3 className="font-semibold text-thread-pine text-base">Notifications</h3>
              </div>
              <Link
                href="/notifications"
                className="text-sm text-thread-sage hover:text-thread-sunset font-medium transition-colors"
                onClick={() => setIsOpen(false)}
              >
                View all →
              </Link>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="notification-dropdown-item text-center text-thread-sage">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-dropdown-item text-center text-thread-sage">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-dropdown-item border-b border-thread-sage/10 hover:bg-thread-cream cursor-pointer ${
                    notification.status === "unread" ? "bg-thread-cream/50" : ""
                  }`}
                  onClick={() => {
                    if (notification.status === "unread") {
                      markAsRead([notification.id]);
                    }
                    setIsOpen(false);
                    
                    // Navigate to the actor's profile
                    const profileLink = getNotificationLink(notification);
                    if (profileLink) {
                      router.push(profileLink);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {notification.actor.avatarUrl ? (
                      <Image
                        src={notification.actor.avatarUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full border border-thread-sage/30 flex-shrink-0"
                        unoptimized={notification.actor.avatarUrl?.endsWith('.gif')}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-thread-sage/20 flex items-center justify-center flex-shrink-0">
                        <PixelIcon name={getNotificationIcon(notification.type)} />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm leading-relaxed">
                        {getNotificationMessage(notification)}
                      </div>
                      <div className="text-xs text-thread-sage mt-1">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {notification.status === "unread" && (
                      <div className="w-2 h-2 bg-thread-sunset rounded-full mt-1 flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-2 border-t border-thread-sage/20 bg-thread-cream">
              <Link
                href="/notifications"
                className="block w-full text-center py-3 text-xs sm:text-sm text-thread-pine hover:text-thread-sunset"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}