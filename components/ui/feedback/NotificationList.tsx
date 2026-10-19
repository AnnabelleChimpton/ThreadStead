import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import ImprovedBadgeDisplay from "../../shared/ImprovedBadgeDisplay";
import UserMention from "@/components/ui/navigation/UserMention";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { notificationHref, usernameFromHandle } from "@/lib/domain/notifications/links";
import { PixelIcon, type PixelIconName } from '@/components/ui/PixelIcon';
import { useToast } from "@/contexts/ToastContext";
import LoadingSpinner from "./LoadingSpinner";
import EmptyState from "./EmptyState";
import ErrorDisplay from "./ErrorDisplay";
import Button from "@/components/ui/Button";

export type NotificationData = {
  id: string;
  type: "comment" | "reply" | "photo_comment" | "photo_reply" | "follow" | "friend" | "guestbook";
  status: "unread" | "read" | "dismissed";
  data?: {
    postId?: string;
    commentId?: string;
    parentCommentId?: string;
    postAuthorHandle?: string;
    guestbookEntryId?: string;
    mediaId?: string;
    mediaTitle?: string;
    mediaOwnerHandle?: string;
    /** Guestbook notes: the start of the note, added by GET /api/notifications */
    excerpt?: string | null;
    /** Guestbook notes: whose guestbook it is (yours), added by GET /api/notifications */
    guestbookOwnerHandle?: string | null;
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
  const [loadError, setLoadError] = useState(false);
  const { showError } = useToast();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const loadNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        status: filter,
      });
      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) throw new Error(`Failed to load notifications: ${res.status}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setLoadError(false);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [limit, filter]);

  useEffect(() => {
    loadNotifications();
  }, [limit, filter, loadNotifications]);

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const res = await csrfFetch("/api/notifications", {
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
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await csrfFetch("/api/notifications", {
        method: "POST",
      });

      if (!res.ok) throw new Error(`Failed to mark all read: ${res.status}`);
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          status: "read" as const,
          readAt: new Date().toISOString()
        }))
      );
      onNotificationUpdate?.();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      showError("Couldn't mark them read. Try again.");
    }
  };


  const getNotificationMessage = (notification: NotificationData): React.ReactNode => {
    const actorName = notification.actor.displayName || notification.actor.handle || "Someone";
    const username = usernameFromHandle(notification.actor.handle);

    const ActorComponent = username ? (
      <UserMention
        username={username}
        displayName={actorName}
        className="font-semibold text-thread-pine"
      />
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
      case "photo_comment":
        return (
          <span>
            {ActorComponent} commented on your photo{notification.data?.mediaTitle ? ` "${notification.data.mediaTitle}"` : ""}
          </span>
        );
      case "photo_reply":
        return (
          <span>
            {ActorComponent} replied to your comment on a photo
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

  if (loading) {
    return <LoadingSpinner message="Loading notifications..." className="py-8" />;
  }

  const unreadCount = notifications.filter(n => n.status === "unread").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="thread-headline text-xl font-bold">Notifications</h2>
        <div className="flex items-center gap-2">
          {showStatus && (
            <div className="flex gap-1">
              <button
                onClick={() => setFilter("all")}
                aria-pressed={filter === "all"}
                className="ts-chip text-sm"
              >
                All
              </button>
              <button
                onClick={() => setFilter("unread")}
                aria-pressed={filter === "unread"}
                className="ts-chip text-sm"
              >
                Unread ({unreadCount})
              </button>
            </div>
          )}
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-2">
        {loadError ? (
          <ErrorDisplay title="Failed to load notifications" onRetry={() => { setLoading(true); loadNotifications(); }} />
        ) : notifications.length === 0 ? (
          <EmptyState
            variant="plain"
            title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
          />
        ) : (
          notifications.map((notification) => {
            const link = notificationHref(notification);
            const isUnread = notification.status === "unread";

            const content = (
              <div
                className={`p-4 border-2 rounded-cozy cursor-pointer transition-colors text-nb-ink ${
                  isUnread
                    ? "bg-thread-cream border-nb-ink-mid border-l-8 border-l-thread-sunset"
                    : "bg-nb-paper border-nb-ink-mid/40 hover:border-nb-ink-mid"
                }`}
                onClick={() => {
                  if (isUnread) {
                    markAsRead([notification.id]);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  {notification.actor.avatarUrl ? (
                    <Image
                      src={notification.actor.avatarUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full border-2 border-thread-sage/30"
                      unoptimized={notification.actor.avatarUrl?.endsWith('.gif')}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-thread-sage/20 flex items-center justify-center">
                      <PixelIcon name={getNotificationIcon(notification.type)} />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-relaxed">
                      {getNotificationMessage(notification)}
                    </div>
                    {notification.type === "guestbook" && notification.data?.excerpt && (
                      <p className="text-sm text-nb-ink italic mt-1 mb-0 line-clamp-2">
                        &ldquo;{notification.data.excerpt}&rdquo;
                      </p>
                    )}
                    
                    {/* User badges */}
                    <div className="mt-1 mb-1">
                      <ImprovedBadgeDisplay 
                        userId={notification.actor.id} 
                        context="comments" 
                        layout="compact"
                      />
                    </div>
                    
                    <div className="text-xs text-nb-ink-mid">
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