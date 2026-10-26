/**
 * Where a notification goes when you click it. Shared by the bell
 * (NotificationDropdown) and the /notifications page (NotificationList), so
 * they can't drift apart again.
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
    threadRingSlug?: string;
    /** Webmentions: the outside page that links to the post. */
    sourceUrl?: string;
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
    case "threadring_invite":
      // The ring page shows invited people an Accept button
      return data.threadRingSlug ? `/tr/${encodeURIComponent(data.threadRingSlug)}` : null;
    case "ring_site":
      // A site waiting for a yes: the host says yes in Manage › Stops. Anything else is about your own site.
      return (data as { event?: string }).event === "waiting" && data.threadRingSlug
        ? `/tr/${encodeURIComponent(data.threadRingSlug)}/manage?tab=stops`
        : "/settings?tab=sites";
    case "webmention":
      // The outside page that links to the post
      return data.sourceUrl ?? null;
    default:
      return null;
  }
}

/**
 * The words for a `ring_site` notification (lib/rings/notify.ts), which is
 * about a site rather than what the actor did. `actorName` only reads in
 * the events another person caused.
 */
export function ringSiteText(data: Record<string, unknown> | null | undefined, actorName: string): string {
  const site = (typeof data?.siteTitle === "string" && data.siteTitle) || hostOfUrl(data?.siteUrl) || "Your site";
  const ring = (typeof data?.threadRingName === "string" && data.threadRingName) || "a ring";
  switch (data?.event) {
    case "resting":
      return `I couldn't find ${site} the last two times I looked, so your rings walk to your pixel home until it's back.`;
    case "removed":
      return `${site} was resting for 30 days, so it's out of its rings. Check it again in Your sites once it's back.`;
    case "back":
      return `${site} is back, and your rings walk to it again.`;
    case "hidden":
      return `${actorName} hid ${site} from ${ring}. Your pixel home is your stop there.`;
    case "approved":
      return `${actorName} let ${site} into ${ring}.`;
    case "waiting":
      return `${actorName} would like ${site} to be their stop in ${ring}.`;
    default:
      return `News about ${site}.`;
  }
}

/** The words for a `webmention` notification (lib/webmentions/receive.ts): an outside page links to your post. */
export function webmentionText(data: Record<string, unknown> | null | undefined): string {
  const site = (typeof data?.sourceHost === "string" && data.sourceHost) || hostOfUrl(data?.sourceUrl) || "A website";
  const post = typeof data?.postTitle === "string" && data.postTitle ? `"${data.postTitle}"` : "";
  return post ? `${site} linked to your post ${post}` : `${site} linked to your post`;
}

function hostOfUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return null;
  }
}
