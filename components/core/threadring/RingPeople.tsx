import Link from "next/link";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { MarkdownWithEmojis } from "@/lib/comment-markup";
import type { RingPageRing } from "@/lib/rings/page-data";
import { signInHref } from "./RingActions";
import { ROLE_LABELS, type RingMemberView, type RingRole, type RingViewer } from "./useRingViewer";

const SHOWN = 8;
const RANK: Record<string, number> = { curator: 0, moderator: 1 };

function Person({ member, isYou }: { member: RingMemberView; isYou: boolean }) {
  const handle = member.user?.handles?.[0]?.handle ?? null;
  const name = member.user?.profile?.displayName || handle || "Member";
  const avatarUrl = member.user?.profile?.avatarUrl;
  const role = ROLE_LABELS[member.role as RingRole];
  const local = handle && !member.userId?.startsWith("did:");
  const elsewhere = !local && member.user?.profileUrl;
  return (
    <li className="flex items-center gap-2 !m-0 !p-0">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full border border-nb-ink-mid/35 object-cover shrink-0" />
      ) : (
        <span aria-hidden="true" className="w-7 h-7 rounded-full bg-thread-cream border border-nb-ink-mid/35 inline-flex items-center justify-center font-mono text-xs text-nb-ink-mid shrink-0">
          {name[0]?.toUpperCase()}
        </span>
      )}
      {local ? (
        <Link href={`/resident/${encodeURIComponent(handle)}`} className="text-nb-ink decoration-dotted truncate min-w-0">{name}</Link>
      ) : elsewhere ? (
        <a href={member.user!.profileUrl} rel="ugc noopener" className="text-nb-ink decoration-dotted truncate min-w-0">{name}</a>
      ) : (
        <span className="text-nb-ink truncate min-w-0">{name}</span>
      )}
      {member.role !== "member" && role ? (
        <span className={`ml-auto shrink-0 text-xs font-semibold ${member.role === "curator" ? "text-[color:var(--ring-accent)]" : "text-nb-ink-mid"}`}>{role}</span>
      ) : isYou ? (
        <span className="ml-auto shrink-0 text-xs font-semibold text-nb-ink-mid">you</span>
      ) : null}
    </li>
  );
}

/**
 * "Who's here": the host's note, then the ring's people by name, host and
 * moderators first. Signed out, the hub only says who hosts and moderates,
 * so those are shown and the rest counted. The ring street is the full list.
 */
export default function RingPeople({ ring, viewer, viewerId }: { ring: RingPageRing; viewer: RingViewer; viewerId: string | null }) {
  const people = [...viewer.members].sort((a, b) => (RANK[a.role] ?? 2) - (RANK[b.role] ?? 2));
  const shown = people.slice(0, SHOWN);
  const more = viewer.memberCount - shown.length;
  const hostName = ring.host ? ring.host.displayName || ring.host.username : null;

  return (
    <section className="thread-module p-4 sm:p-5 !mt-0 !mb-5">
      <h2 className="thread-headline !text-[1.05rem] !leading-snug font-bold !text-nb-ink m-0">Who&apos;s here</h2>
      {ring.curatorNote && (
        <div className="mt-3 mb-4 border-l-[3px] border-[color:var(--ring-accent)] py-1 pl-3">
          <p className="text-sm text-nb-ink-mid m-0 mb-1">{hostName ? `A note from ${hostName}, the host` : "A note from the host"}</p>
          <div className="text-nb-ink [&_p]:m-0">
            <MarkdownWithEmojis markdown={ring.curatorNote} />
          </div>
        </div>
      )}

      {viewer.membersLoading ? (
        <LoadingSpinner size="sm" layout="row" className="justify-start mt-3" />
      ) : (
        <>
          <ul className="list-none !mx-0 !mb-0 mt-3 !p-0 flex flex-col gap-2">
            {shown.map((member, i) => (
              <Person key={member.userId && member.userId !== "external" ? member.userId : `${member.id}-${i}`} member={member} isYou={!!viewerId && member.userId === viewerId} />
            ))}
          </ul>
          {more > 0 && (
            <p className="text-sm text-nb-ink-mid mt-3 mb-0">
              and {more} more.
              {viewer.isPublicInfo && <> <Link href={signInHref(ring.slug)} className="text-nb-ink">Sign in</Link> to see everyone.</>}
            </p>
          )}
        </>
      )}

      <p className="text-sm mt-4 mb-0">
        <Link href={`/neighborhood/ring/${encodeURIComponent(ring.slug)}`} className="text-nb-ink">
          <PixelIcon name="buildings" size={14} className="inline-block align-[-2px] mr-1" />Everyone&apos;s homes on the ring street
        </Link>
      </p>
    </section>
  );
}
