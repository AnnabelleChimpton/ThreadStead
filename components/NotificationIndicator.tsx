import React, { useState, useEffect } from "react";
import Link from "next/link";

interface NotificationIndicatorProps {
  className?: string;
  showCount?: boolean;
  refreshInterval?: number; // in ms
}

export default function NotificationIndicator({ 
  className = "",
  showCount = true,
  refreshInterval = 30000 // 30 seconds
}: NotificationIndicatorProps) {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications/count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      } else if (res.status === 401) {
        // Not logged in
        setUnreadCount(null);
      }
    } catch (error) {
      console.error("Failed to fetch notification count:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Set up periodic refresh
    const interval = setInterval(fetchUnreadCount, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Don't show anything if not logged in or still loading
  if (loading || unreadCount === null) {
    return null;
  }

  return (
    <Link
      href="/notifications"
      className={`relative inline-flex items-center gap-2 ${className}`}
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
      {showCount && unreadCount > 0 && (
        <span className="text-sm text-thread-sage">
          {unreadCount} new
        </span>
      )}
    </Link>
  );
}

// Hook for other components to trigger notification count refresh
export function useNotificationRefresh() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const refresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return { refresh, refreshTrigger };
}