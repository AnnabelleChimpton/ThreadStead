import Link from "next/link";
import Button from "@/components/ui/Button";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { calendarDate } from "@/lib/utils/dates";
import type { RingPageRing } from "@/lib/rings/page-data";
import ThreadRing88x31Badge from "./ThreadRing88x31Badge";
import RingPeople from "./RingPeople";
import type { RingViewer } from "./useRingViewer";
import type { RelativeRing, RingFamily } from "./useRingFamily";

const CARD = "thread-module p-4 sm:p-5 !mt-0 !mb-5";
const HEADING = "thread-headline !text-[1.05rem] !leading-snug font-bold !text-nb-ink m-0";
const BLURB = "text-sm text-nb-ink-mid mt-1 mb-3";

interface RingSidebarProps {
  ring: RingPageRing;
  viewer: RingViewer;
  viewerId: string | null;
  family: RingFamily;
  onGetStrip: () => void;
}

function Relative({ ring }: { ring: RelativeRing }) {
  return (
    <Link href={`/tr/${encodeURIComponent(ring.slug)}`} className="flex items-center gap-3 no-underline">
      <ThreadRing88x31Badge title={ring.name} slug={ring.slug} themeColor={ring.themeColor} imageUrl={ring.badgeImageUrl ?? undefined} className="shrink-0" />
      <span className="text-nb-ink underline decoration-dotted min-w-0 break-words">{ring.name}</span>
    </Link>
  );
}

/**
 * Everything beside a ring's posts, once: on a phone it stacks under them.
 * Who's here, the ring on your own site, and its branches; a member who can
 * start a branch finds the link at the bottom.
 */
export default function RingSidebar({ ring, viewer, viewerId, family, onGetStrip }: RingSidebarProps) {
  const slug = encodeURIComponent(ring.slug);
  const hasFamily = !!family.parent || family.branches.length > 0;
  const startBranch = viewer.isMember && (
    <Link href={`/tr/${slug}/fork`} className="text-nb-ink">Start a branch</Link>
  );
  const started = <p className="text-xs text-nb-ink-mid mt-3 mb-0">{ring.name} started on {calendarDate(ring.createdAt)}.</p>;

  return (
    <aside className="tr-sidebar col-span-1">
      <RingPeople ring={ring} viewer={viewer} viewerId={viewerId} />

      {ring.visibility === "public" && (
        <section className={CARD}>
          <h2 className={HEADING}>On your own site</h2>
          <p className={BLURB}>Each member is a stop on this webring: their own site if they&apos;ve added one, their pixel home if not.</p>
          <div className="flex items-center gap-3 mb-3">
            <ThreadRing88x31Badge title={ring.name} slug={ring.slug} themeColor={ring.themeColor} imageUrl={ring.badge?.imageUrl ?? undefined} className="shrink-0" />
            <span className="text-sm text-nb-ink-mid">The ring&apos;s badge, for your page</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button variant="secondary" size="sm" onClick={onGetStrip} className="inline-flex items-center gap-1.5">
              <PixelIcon name="clipboard" size={14} /> Get a strip
            </Button>
            <a href={`/ring/${slug}/random`} className="text-sm text-nb-ink">Random stop</a>
          </div>
        </section>
      )}

      {hasFamily ? (
        <section className={CARD}>
          <h2 className={HEADING}>Branches</h2>
          {family.parent && (
            <>
              <p className={BLURB}>Started from</p>
              <Relative ring={family.parent} />
            </>
          )}
          {family.branches.length > 0 && (
            <>
              <p className={`${BLURB} ${family.parent ? "!mt-4" : ""}`}>Rings started from this one.</p>
              <ul className="list-none !m-0 !p-0 flex flex-col gap-2">
                {family.branches.map((branch) => (
                  <li key={branch.id} className="!m-0 !p-0"><Relative ring={branch} /></li>
                ))}
              </ul>
            </>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-sm">
            <Link href="/threadrings/genealogy" className="text-nb-ink">Family tree</Link>
            {startBranch}
          </div>
          {started}
        </section>
      ) : (
        <div className="px-4 sm:px-0 text-sm">
          {startBranch}
          {started}
        </div>
      )}
    </aside>
  );
}
