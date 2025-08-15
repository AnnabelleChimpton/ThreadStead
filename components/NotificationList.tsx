import React, { useState, useEffect } from "react";
import Link from "next/link";

export type NotificationData = {
  id: string;
  type: "comment" | "reply" | "follow" | "friend" | "guestbook";
  status: "unread" | "read" | "dismissed";
  data?: {
    postId?: string;
    commentId?: string;
    parentCommentId?: string;
    postAuthorHandle?: string;
    guestbookEntryId?: string;
  };
  createdAt: string;
  readAt?: string | null;
  actor: {
    id: string;
    handle?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
};

interface NotificationListProps {
  limit?: number;
  showStatus?: boolean;
  onNotificationUpdate?: () => void;
}

export default function NotificationList({ 
  limit = 20, 
  showStatus = true,
  onNotificationUpdate 
}: NotificationListProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const loadNotifications = async () => {
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        status: filter,
      });
      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [limit, filter]);

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
              ? { ...n, status: "read" as const, readAt: new Date().toISOString() }
              : n
          )
        );
        onNotificationUpdate?.();
      }
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
      });
      
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => ({ 
            ...n, 
            status: "read" as const, 
            readAt: new Date().toISOString() 
          }))
        );
        onNotificationUpdate?.();
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  // Helper function to extract username from handle (e.g., "alice@local" -> "alice")
  const getUsername = (handle: string | null | undefined): string | null => {
    if (!handle) return null;
    return handle.split('@')[0];
  };

  const getNotificationMessage = (notification: NotificationData): React.ReactNode => {
    const actorName = notification.actor.displayName || notification.actor.handle || "Someone";
    const username = getUsername(notification.actor.handle);
    const actorLink = username ? `/${username}` : null;

    const ActorComponent = actorLink ? (
      <Link href={actorLink} className="font-semibold text-thread-pine hover:text-thread-sunset">
        {actorName}
      </Link>
    ) : (
      <span className="font-semibold text-thread-pine">{actorName}</span>
    );

    switch (notification.type) {
      case "comment":
        return (
          <span>
            {ActorComponent} commented on your post
          </span>
        );
      case "reply":
        return (
          <span>
            {ActorComponent} replied to your comment
          </span>
        );
      case "follow":
        return (
          <span>
            {ActorComponent} started following you
          </span>
        );
      case "friend":
        return (
          <span>
            {ActorComponent} is now your mutual friend!
          </span>
        );
      case "guestbook":
        return (
          <span>
            {ActorComponent} signed your guestbook
          </span>
        );
      default:
        return <span>New activity from {ActorComponent}</span>;
    }
  };

  const getNotificationLink = (notification: NotificationData): string | null => {
    const username = getUsername(notification.actor.handle);
    
    switch (notification.type) {
      case "comment":
      case "reply":
        // For comments and replies, link to the individual post page with comments expanded
        if (notification.data?.postAuthorHandle && notification.data?.postId) {
          // Use the full handle for the URL (e.g., "scooby@local" instead of just "scooby")
          const postAuthorHandle = notification.data.postAuthorHandle;
          // Build URL with query parameters for auto-expanding comments and highlighting
          const baseUrl = `/${postAuthorHandle}/post/${notification.data.postId}`;
          const params = new URLSearchParams({
            comments: 'open',
            ...(notification.data.commentId && { highlight: notification.data.commentId })
          });
          return `${baseUrl}?${params.toString()}`;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-thread-sage">Loading notifications...</div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => n.status === "unread").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-thread-pine">Notifications</h2>
        <div className="flex items-center gap-2">
          {showStatus && (
            <div className="flex gap-1">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 text-sm border border-black shadow-[2px_2px_0_#000] ${
                  filter === "all" ? "bg-thread-sunset text-white" : "bg-white hover:bg-thread-cream"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`px-3 py-1 text-sm border border-black shadow-[2px_2px_0_#000] ${
                  filter === "unread" ? "bg-thread-sunset text-white" : "bg-white hover:bg-thread-cream"
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>
          )}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3 py-1 text-sm border border-black bg-white hover:bg-thread-cream shadow-[2px_2px_0_#000]"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-thread-sage">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </div>
        ) : (
          notifications.map((notification) => {
            const link = getNotificationLink(notification);
            const isUnread = notification.status === "unread";

            const content = (
              <div
                className={`p-4 border border-black shadow-[2px_2px_0_#000] rounded-cozy cursor-pointer transition-colors ${
                  isUnread 
                    ? "bg-thread-cream border-thread-sunset" 
                    : "bg-white hover:bg-thread-cream"
                }`}
                onClick={() => {
                  if (isUnread) {
                    markAsRead([notification.id]);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  {notification.actor.avatarUrl ? (
                    <img
                      src={notification.actor.avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full border-2 border-thread-sage/30"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-thread-sage/20 flex items-center justify-center text-lg">
                      {getNotificationIcon(notification.type)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-relaxed">
                      {getNotificationMessage(notification)}
                    </div>
                    <div className="text-xs text-thread-sage mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {isUnread && (
                    <div className="w-2 h-2 bg-thread-sunset rounded-full mt-2 flex-shrink-0"></div>
                  )}
                </div>
              </div>
            );

            return (
              <div key={notification.id}>
                {link ? (
                  <Link href={link}>{content}</Link>
                ) : (
                  content
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}