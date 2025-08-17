import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications/count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      } else if (res.status === 401) {
        setUnreadCount(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error("Failed to fetch notification count:", error);
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
      fetchUnreadCount();
      // Set up periodic refresh every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // Don't show anything if not logged in or still loading
  if (loading || !isLoggedIn || unreadCount === null) {
    return null;
  }

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center gap-2 text-thread-pine hover:text-thread-sunset"
      title={`${unreadCount} unread notifications`}
    >
      <div className="relative">
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-thread-sunset text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border border-black shadow-[1px_1px_0_#000]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </div>
      {unreadCount > 0 && (
        <span className="text-sm text-thread-sage">
          {unreadCount} new
        </span>
      )}
    </Link>
  );
}