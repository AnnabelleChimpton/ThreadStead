import { useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";
import UserQuickView from "@/components/ui/feedback/UserQuickView";
import ExternalUserPopup from "@/components/ui/feedback/ExternalUserPopup";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { signInHref } from "./RingActions";
import type { RingMemberView, RingViewer } from "./useRingViewer";

const SHOWN = 8;

/**
 * A few of the ring's members. Signed out, the hub only says who hosts and
 * moderates, and those can't be opened as anyone here, so they're shown,
 * not linked.
 */
export default function RingMembersPreview({ slug, viewer, signedIn }: { slug: string; viewer: RingViewer; signedIn: boolean }) {
  const [quickView, setQuickView] = useState<string | null>(null);
  const [external, setExternal] = useState<RingMemberView | null>(null);
  const shown = viewer.members.slice(0, SHOWN);
  const more = viewer.memberCount - shown.length;

  return (
    <div className="bg-thread-paper rounded-cozy shadow-cozy-sm border border-thread-sage/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm flex items-center gap-1"><PixelIcon name="users" size={14} /> Members ({viewer.memberCount})</h3>
        {signedIn && (
          <Link href={`/tr/${encodeURIComponent(slug)}/members`} className="text-xs">
            {viewer.canManage || viewer.canModerate ? "Manage" : "See all"}
          </Link>
        )}
      </div>

      {viewer.membersLoading ? (
        <LoadingSpinner size="sm" layout="row" className="justify-start" />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {shown.map((member) => {
              const handle = member.user?.handles?.[0]?.handle ?? null;
              const name = member.user?.profile?.displayName || handle || "Member";
              const avatarUrl = member.user?.profile?.avatarUrl;
              const isExternal = member.userId?.startsWith("did:");
              const face = (
                <>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="w-full aspect-square rounded-md border border-nb-ink-mid/40 hover:border-nb-ink-mid" />
                  ) : (
                    <div className="w-full aspect-square rounded-md border border-nb-ink-mid/40 bg-thread-cream flex items-center justify-center text-xs">
                      {name[0]?.toUpperCase()}
                    </div>
                  )}
                  {member.role === "curator" && (
                    <div className="absolute -top-1 -right-1 text-xs" title="Host"><PixelIcon name="trophy" size={12} /></div>
                  )}
                </>
              );
              if (!handle && !isExternal) {
                return <div key={member.id} className="relative" title={name}>{face}</div>;
              }
              return (
                <button
                  key={member.id}
                  onClick={() => (isExternal ? setExternal(member) : setQuickView(handle))}
                  className="relative group cursor-pointer"
                  title={name}
                >
                  {face}
                </button>
              );
            })}
          </div>

          {more > 0 && (
            <div className="text-xs text-nb-ink-mid text-center">+{more} more</div>
          )}

          {viewer.isPublicInfo && (
            <div className="text-xs text-nb-ink-mid mt-2 p-2 border-2 border-dotted border-nb-ink-mid/60 rounded-md">
              <Link href={signInHref(slug)}>Sign in</Link> to see everyone
            </div>
          )}
        </>
      )}

      {quickView && (
        <UserQuickView username={quickView} isOpen onClose={() => setQuickView(null)} />
      )}
      {external && (
        <ExternalUserPopup
          displayName={external.user?.profile?.displayName || "Member"}
          actorDid={external.userId}
          role={external.role || "member"}
          joinedAt={external.joinedAt || new Date().toISOString()}
          profileUrl={external.user?.profileUrl}
          avatarUrl={external.user?.profile?.avatarUrl ?? undefined}
          isOpen
          onClose={() => setExternal(null)}
        />
      )}
    </div>
  );
}
