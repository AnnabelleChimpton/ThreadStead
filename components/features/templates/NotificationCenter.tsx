import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import type { NotificationData } from "../../ui/feedback/NotificationList";

export default function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getUsername = (handle: string | null | undefined): string | null => {
    if (!handle) return null;
    return handle.split('@')[0];
  };

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
      // Notification fetch failed silently
    } finally {
      setLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setIsLoggedIn(data.loggedIn);
    } catch (error) {
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchNotifications();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isLoggedIn) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="nav-link text-thread-pine hover:text-thread-sunset font-medium relative"
      >
        🔔
        {unreadCount !== null && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-black shadow-[4px_4px_0_#000] z-50 max-h-96 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Notifications</h3>
              <Link
                href="/notifications"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setIsOpen(false)}
              >
                View all
              </Link>
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    const username = getUsername(notification.actor.handle);
                    if (username) {
                      router.push(`/${username}`);
                      setIsOpen(false);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={notification.actor.avatarUrl || "/assets/default-avatar.gif"}
                      alt={notification.actor.handle || "User"}
                      className="w-8 h-8 rounded border border-black object-cover"
                    />
                    <div className="flex-1 text-sm">
                      <p className="text-gray-900">{getNotificationMessage(notification)}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}