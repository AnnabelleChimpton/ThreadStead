import Link from "next/link";
import { MarkdownWithEmojis } from "@/lib/comment-markup";
import type { RingPageRing } from "@/lib/rings/page-data";
import ThreadRing88x31Badge from "./ThreadRing88x31Badge";
import RingActions from "./RingActions";
import type { RingViewer } from "./useRingViewer";

const JOINING: Record<string, string> = { open: "Anyone can join", invite: "Invite only", closed: "Not taking new members" };

/** Between two facts: stays with the one before, and the line can break after it. */
function Dot() {
  return (
    <>
      <span aria-hidden="true" className="pl-1.5 pr-0.5 text-nb-ink-mid">·</span>{" "}
    </>
  );
}

/**
 * The top of a ring's page: what it is, who hosts it, and the one thing to do
 * here. A thin line in the ring's colour runs along the top, like the coloured
 * tab on its badge.
 */
export default function RingHeader({ ring, viewer, signedIn }: { ring: RingPageRing; viewer: RingViewer; signedIn: boolean }) {
  return (
    <section className="tr-header-card thread-module p-5 sm:p-6 !mt-0 !mb-5 !border-t-4 !border-t-[color:var(--ring-accent)]">
      {ring.bannerUrl && (
        <img src={ring.bannerUrl} alt="" className="block w-full h-32 sm:h-48 object-cover rounded-md border border-thread-sage/30 mb-4" />
      )}
      <div className="flex items-start justify-between gap-4">
        <h1 className="tr-title thread-headline !text-[color:var(--ring-accent)] text-3xl sm:text-4xl font-bold m-0 min-w-0 break-words">
          {ring.name}
        </h1>
        <div className="shrink-0 mt-1 flex flex-col items-end gap-1">
          <ThreadRing88x31Badge title={ring.name} slug={ring.slug} themeColor={ring.themeColor} imageUrl={ring.badge?.imageUrl ?? undefined} />
          {/* Until its host saves one of the new badges */}
          {ring.oldBadge && viewer.role === "curator" && (
            <p className="!text-xs text-nb-ink-mid text-right max-w-[11rem] !m-0">
              There are new badge styles. <Link href={`/tr/${encodeURIComponent(ring.slug)}/manage?tab=badge`} className="text-nb-ink">Try one</Link>
            </p>
          )}
        </div>
      </div>
      {ring.description && (
        <div className="text-lg text-nb-ink leading-relaxed mt-3 [&_p]:m-0">
          <MarkdownWithEmojis markdown={ring.description} />
        </div>
      )}
      <p className="text-sm text-nb-ink-mid mt-3 mb-0">
        {ring.host && (
          <>
            <span className="whitespace-nowrap">
              Hosted by <Link href={`/resident/${encodeURIComponent(ring.host.username)}`} className="text-nb-ink">{ring.host.displayName || ring.host.username}</Link>
            </span>
            <Dot />
          </>
        )}
        <span className="whitespace-nowrap">{viewer.memberCount} member{viewer.memberCount !== 1 ? "s" : ""}</span>
        <Dot />
        <span className="whitespace-nowrap">{ring.postCount} post{ring.postCount !== 1 ? "s" : ""}</span>
        <Dot />
        <span className="whitespace-nowrap">{JOINING[ring.joinType] ?? JOINING.closed}</span>
      </p>

      <div className="mt-5 pt-4 border-t-2 border-dotted border-nb-ink-mid/30">
        <RingActions ring={ring} viewer={viewer} signedIn={signedIn} />
      </div>
    </section>
  );
}
