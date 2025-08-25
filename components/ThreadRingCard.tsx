import Link from "next/link";
import { useState } from "react";

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
      setJoinError(error?.message || "Failed to join ThreadRing");
    } finally {
      setJoining(false);
    }
  };

  const canJoin = showJoinButton && 
                  !threadRing.viewerMembership && 
                  threadRing.joinType === "open";

  return (
    <div className="border border-black p-4 bg-white shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <Link 
            href={`/tr/${threadRing.slug}`}
            className="text-lg font-bold text-black hover:text-blue-700 hover:underline block"
          >
            {threadRing.name}
          </Link>
          {threadRing.curator && (
            <div className="text-sm text-gray-600 mt-1">
              curated by{" "}
              <span className="font-medium">
                {threadRing.curator.displayName || `@${threadRing.curator.handle}`}
              </span>
            </div>
          )}
        </div>

        {/* Join Status / Button */}
        <div className="flex-shrink-0">
          {threadRing.viewerMembership ? (
            <span className="text-xs bg-green-200 px-2 py-1 border border-black rounded">
              {threadRing.viewerMembership.role === "curator" ? "Curator" : "Member"}
            </span>
          ) : canJoin ? (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="text-xs bg-yellow-200 hover:bg-yellow-300 border border-black px-3 py-1 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all"
            >
              {joining ? "Joining..." : "Join"}
            </button>
          ) : threadRing.joinType === "invite" ? (
            <span className="text-xs bg-gray-200 px-2 py-1 border border-black rounded">
              Invite Only
            </span>
          ) : threadRing.joinType === "closed" ? (
            <span className="text-xs bg-red-200 px-2 py-1 border border-black rounded">
              Closed
            </span>
          ) : null}
        </div>
      </div>

      {/* Description */}
      {threadRing.description && (
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
          {threadRing.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span>{threadRing.memberCount} member{threadRing.memberCount !== 1 ? 's' : ''}</span>
        <span>•</span>
        <span>{threadRing.postCount} post{threadRing.postCount !== 1 ? 's' : ''}</span>
        <span>•</span>
        <span className="capitalize">{threadRing.joinType} joining</span>
        {threadRing.visibility === "unlisted" && (
          <>
            <span>•</span>
            <span className="text-orange-600">Unlisted</span>
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