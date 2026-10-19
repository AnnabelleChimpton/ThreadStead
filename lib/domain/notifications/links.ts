/**
 * Where a notification goes when you click it. Shared by the bell
 * (NotificationDropdown), the /notifications page (NotificationList) and the
 * template NotificationCenter, so the three can't drift apart again.
 *
 * Client-safe: no db imports.
 */

type LinkableNotification = {
  type: string;
  data?: {
    postId?: string;
    commentId?: string;
    postAuthorHandle?: string;
    mediaId?: string;
    mediaOwnerHandle?: string;
    guestbookEntryId?: string;
    /** Added by GET /api/notifications: whose guestbook was signed (the recipient). */
    guestbookOwnerHandle?: string | null;
    /** Added by GET /api/notifications: null when the entry is gone or hidden. */
    excerpt?: string | null;
  } | null;
  actor?: { handle?: string | null } | null;
};

/** "alice@sitename" → "alice" */
export function usernameFromHandle(handle: string | null | undefined): string | null {
  if (!handle) return null;
  return handle.split("@")[0] || null;
}

/** The id a guestbook entry carries on the page, so links can jump to it. */
export function guestbookEntryAnchor(entryId: string): string {
  return `guestbook-entry-${entryId}`;
}

/**
 * The profile's guestbook tab, scrolled to one entry when there is one.
 *
 * The house mailbox shows the same entries (both are components/shared/
 * Guestbook), but it's a modal on /home with no URL of its own. The profile
 * tab already has one (?tab=guestbook, checked server-side), has the owner's
 * delete controls, and the anchor also works on advanced templates that place
 * a <Guestbook /> anywhere on the page.
 */
export function guestbookHref(ownerUsername: string, entryId?: string | null): string {
  const base = `/resident/${encodeURIComponent(ownerUsername)}?tab=guestbook`;
  return entryId ? `${base}#${guestbookEntryAnchor(entryId)}` : base;
}

export function notificationHref(notification: LinkableNotification): string | null {
  const data = notification.data ?? {};
  const actorProfile = (() => {
    const actor = usernameFromHandle(notification.actor?.handle);
    return actor ? `/resident/${actor}` : null;
  })();

  switch (notification.type) {
    case "comment":
    case "reply": {
      // The post page with comments open and the comment highlighted
      const author = usernameFromHandle(data.postAuthorHandle);
      if (author && data.postId) {
        const params = new URLSearchParams({
          comments: "open",
          ...(data.commentId && { highlight: data.commentId }),
        });
        return `/resident/${author}/post/${data.postId}?${params.toString()}`;
      }
      return actorProfile;
    }
    case "photo_comment":
    case "photo_reply": {
      // The photo in its owner's media gallery
      const owner = usernameFromHandle(data.mediaOwnerHandle);
      if (owner && data.mediaId) {
        const params = new URLSearchParams({
          photo: data.mediaId,
          ...(data.commentId && { comment: data.commentId }),
        });
        return `/resident/${owner}/media?${params.toString()}`;
      }
      return actorProfile;
    }
    case "guestbook": {
      const owner = usernameFromHandle(data.guestbookOwnerHandle);
      if (!owner) return actorProfile;
      // A deleted or hidden entry has no excerpt; open the tab without the jump
      const entryId = typeof data.excerpt === "string" ? data.guestbookEntryId : null;
      return guestbookHref(owner, entryId);
    }
    case "follow":
    case "friend":
      return actorProfile;
    default:
      return null;
  }
}
