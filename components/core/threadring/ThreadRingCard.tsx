import Link from "next/link";
import { useState } from "react";
import ThreadRing88x31Badge from "./ThreadRing88x31Badge";
import UserMention from "@/components/ui/navigation/UserMention";

interface ThreadRingCardProps {
  threadRing: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    visibility: string;
    joinType: string;
    memberCount: number;
    postCount: number;
    createdAt: string;
    curator: {
      handle: string;
      displayName?: string | null;
      avatarUrl?: string | null;
    } | null;
    viewerMembership?: {
      role: string;
      joinedAt: string;
    } | null;
    badge?: {
      id: string;
      title: string;
      subtitle?: string | null;
      backgroundColor: string;
      textColor: string;
      templateId?: string | null;
      imageUrl?: string | null;
      isActive: boolean;
    } | null;
    badgeImageUrl?: string | null;
    badgeImageHighResUrl?: string | null;
  };
  showJoinButton?: boolean;
  onJoin?: (ringSlug: string) => Promise<void>;
}

export default function ThreadRingCard({
  threadRing,
  showJoinButton = true,
  onJoin
}: ThreadRingCardProps) {
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!onJoin || threadRing.viewerMembership) return;

    setJoining(true);
    setJoinError(null);

    try {
      await onJoin(threadRing.slug);
    } catch (error: any) {
      setJoinError(error?.message || "Failed to join Ring");
    } finally {
      setJoining(false);
    }
  };

  const canJoin = showJoinButton &&
    !threadRing.viewerMembership &&
    threadRing.joinType === "open";

  // Determine badge source - prioritize local badge over RingHub badge
  const hasBadge = threadRing.badge || threadRing.badgeImageUrl;
  const badgeImageUrl = threadRing.badge?.imageUrl || threadRing.badgeImageUrl;

  return (
    <div className="threadring-card border border-thread-sage p-4 bg-thread-paper rounded-cozy shadow-cozySm hover:shadow-cozy hover:-translate-y-0.5 transition-all duration-150">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/tr/${threadRing.slug}`}
            className="threadring-card-title text-lg font-headline font-bold text-thread-pine hover:text-thread-sunset hover:underline block transition-colors"
          >
            {threadRing.name}
          </Link>
          {/* Badge Display - directly below the name */}
          {hasBadge && (
            <div className="mt-2 mb-2">
              <ThreadRing88x31Badge
                title={threadRing.badge?.title || threadRing.name}
                subtitle={threadRing.badge?.subtitle || undefined}
                templateId={threadRing.badge?.templateId || undefined}
                backgroundColor={threadRing.badge?.backgroundColor}
                textColor={threadRing.badge?.textColor}
                imageUrl={badgeImageUrl || undefined}
                linkUrl={`/tr/${threadRing.slug}`}
              />
            </div>
          )}
          {threadRing.curator && (
            <div className="text-sm text-thread-sage mt-1">
              hosted by{" "}
              <UserMention
                username={threadRing.curator.handle.split('@')[0]}
                displayName={threadRing.curator.displayName || threadRing.curator.handle.split('@')[0]}
                className="font-medium text-thread-pine"
              />
            </div>
          )}
        </div>

        {/* Join Status / Button */}
        <div className="flex-shrink-0">
          {threadRing.viewerMembership ? (
            <span className="pill badge--lav text-xs bg-thread-meadow/20 text-thread-pine px-2.5 py-1 border border-thread-sage rounded-full font-medium">
              {threadRing.viewerMembership.role === "owner" || threadRing.viewerMembership.role === "curator"
                ? "Ring Host"
                : threadRing.viewerMembership.role === "moderator"
                  ? "Moderator"
                  : "Member"}
            </span>
          ) : canJoin ? (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="text-xs bg-thread-sunset text-thread-paper hover:bg-thread-sunset/90 border border-thread-pine px-3.5 py-1 rounded-full shadow-cozySm hover:shadow-cozy transition-all font-medium disabled:opacity-60"
            >
              {joining ? "Joining…" : "Join"}
            </button>
          ) : threadRing.joinType === "application" ? (
            <span className="pill text-xs bg-thread-sky/25 text-thread-pine px-2.5 py-1 border border-thread-sage rounded-full font-medium">
              Apply to Join
            </span>
          ) : threadRing.joinType === "invite" ? (
            <span className="pill text-xs bg-thread-stone/25 text-thread-charcoal px-2.5 py-1 border border-thread-sage rounded-full font-medium">
              Invite Only
            </span>
          ) : threadRing.joinType === "closed" ? (
            <span className="pill badge--rose text-xs bg-thread-sunset/15 text-thread-pine px-2.5 py-1 border border-thread-sage rounded-full font-medium">
              Closed
            </span>
          ) : null}
        </div>
      </div>

      {/* Description */}
      {threadRing.description && (
        <p className="text-sm text-thread-charcoal mb-3 line-clamp-2">
          {threadRing.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-thread-sage">
        <span>{threadRing.memberCount} member{threadRing.memberCount !== 1 ? 's' : ''}</span>
        <span>•</span>
        <span>{threadRing.postCount} post{threadRing.postCount !== 1 ? 's' : ''}</span>
        <span>•</span>
        <span>{threadRing.joinType === 'open' ? 'Open joining' :
          threadRing.joinType === 'application' ? 'Apply to join' :
            threadRing.joinType === 'invite' ? 'Invite only' :
              threadRing.joinType === 'closed' ? 'Closed' :
                threadRing.joinType}</span>
        {threadRing.visibility === "unlisted" && (
          <>
            <span>•</span>
            <span className="text-thread-sunset font-medium">Unlisted</span>
          </>
        )}
      </div>

      {/* Join Error */}
      {joinError && (
        <div className="mt-2 text-xs text-red-600">
          {joinError}
        </div>
      )}
    </div>
  );
}