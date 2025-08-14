import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import type { NotificationData } from "./NotificationList";

interface NotificationDropdownProps {
  className?: string;
}

export default function NotificationDropdown({ className = "" }: NotificationDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper function to extract username from handle (e.g., "alice@local" -> "alice")
  const getUsername = (handle: string | null | undefined): string | null => {
    if (!handle) return null;
    return handle.split('@')[0];
  };

  const fetchNotifications = async () => {
    if (loading) return;
    
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
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
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
      console.error("Failed to mark notifications as read:", error);
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
          setIsLoggedIn(true);
        } else if (res.status === 401) {
          // Not logged in
          setUnreadCount(0);
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Failed to fetch notification count:", error);
      }
    };

    // Fetch initial count
    fetchUnreadCount();

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch full notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const getNotificationMessage = (notification: NotificationData): string => {
    const actorName = notification.actor.displayName || notification.actor.handle || "Someone";

    switch (notification.type) {
      case "comment":
        return `${actorName} commented on your post`;
      case "reply":
        return `${actorName} replied to your comment`;
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
        // For comments and replies, link to the post on the post author's profile
        if (notification.data?.postAuthorHandle && notification.data?.postId) {
          const postAuthorUsername = getUsername(notification.data.postAuthorHandle);
          if (postAuthorUsername) {
            // Link to post author's profile with post ID fragment
            return `/${postAuthorUsername}#post-${notification.data.postId.slice(-6)}`;
          }
        }
        // Fallback to actor's profile
        return username ? `/${username}` : null;
      case "follow":
      case "friend":
        return username ? `/${username}` : null;
      case "guestbook":
        return username ? `/${username}` : null;
      default:
        return null;
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case "comment":
      case "reply":
        return "💬";
      case "follow":
        return "👥";
      case "friend":
        return "🤝";
      case "guestbook":
        return "📝";
      default:
        return "🔔";
    }
  };

  // Don't render if user is not logged in
  if (isLoggedIn === false) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex items-center gap-2 p-2 hover:bg-thread-cream rounded transition-colors"
        title={unreadCount !== null ? `${unreadCount} unread notifications` : "Notifications"}
      >
        <span className="text-xl">🔔</span>
        {unreadCount !== null && unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-thread-sunset text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border border-black shadow-[1px_1px_0_#000]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-black shadow-[4px_4px_0_#000] rounded-cozy z-50 max-h-96 overflow-hidden">
          <div className="p-3 border-b border-thread-sage/20 bg-thread-cream">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-thread-pine">Notifications</h3>
              <Link
                href="/notifications"
                className="text-sm text-thread-sage hover:text-thread-sunset"
                onClick={() => setIsOpen(false)}
              >
                View all
              </Link>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-thread-sage">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-thread-sage">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-thread-sage/10 hover:bg-thread-cream cursor-pointer transition-colors ${
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
                      <img
                        src={notification.actor.avatarUrl}
                        alt=""
                        className="w-8 h-8 rounded-full border border-thread-sage/30 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-thread-sage/20 flex items-center justify-center text-sm flex-shrink-0">
                        {getNotificationIcon(notification.type)}
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
                className="block w-full text-center py-2 text-sm text-thread-pine hover:text-thread-sunset transition-colors"
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