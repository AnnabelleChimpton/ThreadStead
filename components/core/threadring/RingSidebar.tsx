import { useState } from "react";
import { getSiteBaseUrl } from "@/lib/config/site-url";
import Button from "@/components/ui/Button";
import ButtonLink, { buttonClasses } from "@/components/ui/ButtonLink";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { useToast } from "@/contexts/ToastContext";
import { calendarDate } from "@/lib/utils/dates";
import type { RingPageRing } from "@/lib/rings/page-data";
import ThreadRingAboutWidget from "./ThreadRingAboutWidget";
import ThreadRing88x31Badge from "./ThreadRing88x31Badge";
import ThreadRingStats from "./ThreadRingStats";
import ThreadRingLineage, { type LineageData } from "./ThreadRingLineage";
import RingActions from "./RingActions";
import RingMembersPreview from "./RingMembersPreview";
import type { RingViewer } from "./useRingViewer";

interface RingSidebarProps {
  ring: RingPageRing;
  viewer: RingViewer;
  signedIn: boolean;
  /** The page's one lineage read; null while it loads */
  lineage: LineageData | null;
  onGetStrip: () => void;
  /** Phones show the ring's About at the top of the page instead */
  showAbout?: boolean;
}

/**
 * Everything beside a ring's posts, once: the desktop column and the phone's
 * "Ring info" sheet both render this.
 */
export default function RingSidebar({ ring, viewer, signedIn, lineage, onGetStrip, showAbout = true }: RingSidebarProps) {
  const { showSuccess } = useToast();
  const [showBadgeOptions, setShowBadgeOptions] = useState(false);
  const [tab, setTab] = useState<"stats" | "lineage">("stats");
  const slug = encodeURIComponent(ring.slug);
  const badge = ring.badge?.isActive ? ring.badge : null;

  return (
    <div className="space-y-4">
      {showAbout && <ThreadRingAboutWidget description={ring.description} curatorNote={ring.curatorNote} />}

      <RingActions ring={ring} viewer={viewer} signedIn={signedIn} />

      {ring.visibility === "public" && (
        <div className="widget-container bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy-sm p-4">
          <div className="text-sm font-bold text-nb-ink mb-1">Members&apos; own sites</div>
          <p className="text-xs text-nb-ink-mid mb-3">
            Members can make their own site, out on the web, their stop in this ring. Everyone else&apos;s stop is their pixel home.
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/tr/${slug}/sites`} variant="secondary" size="sm" className="thread-button-secondary text-xs flex-1 text-center">
              All the stops
            </ButtonLink>
            <a href={`/ring/${slug}/random`} className={`${buttonClasses("secondary", "sm")} thread-button-secondary text-xs flex-1 text-center`}>
              Random stop
            </a>
          </div>
          {!badge && (
            <Button
              variant="secondary"
              onClick={onGetStrip}
              className="thread-button-secondary text-xs w-full mt-2 flex items-center justify-center gap-1"
            >
              <PixelIcon name="clipboard" size={12} /> Get a strip for your site
            </Button>
          )}
        </div>
      )}

      {badge && (
        <div className="widget-container bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy-sm p-4">
          <div className="flex items-center justify-center mb-3">
            <div
              onClick={() => setShowBadgeOptions(!showBadgeOptions)}
              className="cursor-pointer"
              title="Ways to share this ring"
            >
              <ThreadRing88x31Badge
                themeColor={ring.themeColor}
                slug={ring.slug}
                title={badge.title}
                imageUrl={badge.imageUrl ?? undefined}
              />
            </div>
          </div>

          <div className="text-center mb-2">
            <div className="text-xs font-bold text-nb-ink mb-1 flex items-center justify-center gap-1"><PixelIcon name="map" size={12} /> Official Badge</div>
            <p className="text-xs text-nb-ink-mid">
              {showBadgeOptions ? "Classic webring badge" : "Click for the strip and link"}
            </p>
          </div>

          {showBadgeOptions && (
            <div className="space-y-2 mt-3">
              {ring.visibility === "public" && (
                <Button
                  variant="secondary"
                  onClick={onGetStrip}
                  className="thread-button-secondary text-xs w-full flex items-center justify-center gap-1"
                >
                  <PixelIcon name="clipboard" size={12} /> Get a strip for your site
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(`${getSiteBaseUrl()}/tr/${ring.slug}`);
                  showSuccess("Link copied.");
                }}
                className="thread-button-secondary text-xs w-full flex items-center justify-center gap-1"
              >
                <PixelIcon name="link" size={12} /> Copy Link
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowBadgeOptions(false)}
                className="thread-button-secondary text-xs w-full flex items-center justify-center gap-1"
              >
                <PixelIcon name="close" size={12} /> Close
              </Button>
            </div>
          )}

          {viewer.canManage && (
            <ButtonLink href={`/tr/${slug}/badge-manager`} variant="secondary" size="sm" className="thread-button-secondary text-xs w-full text-center mt-2">
              <PixelIcon name="sliders" size={12} className="inline-block align-[-2px] mr-1" />Edit badge
            </ButtonLink>
          )}
        </div>
      )}

      <RingMembersPreview slug={ring.slug} viewer={viewer} signedIn={signedIn} />

      <div className="widget-container bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy-sm p-0 overflow-hidden">
        <div className="flex border-b-2 border-dotted border-nb-ink-mid/40" role="tablist">
          <button
            onClick={() => setTab("stats")}
            role="tab"
            aria-selected={tab === "stats"}
            className="ts-tab flex-1 min-h-[44px] text-sm inline-flex items-center justify-center gap-1"
          >
            <PixelIcon name="chart" size={14} /> Stats
          </button>
          <button
            onClick={() => setTab("lineage")}
            role="tab"
            aria-selected={tab === "lineage"}
            className="ts-tab flex-1 min-h-[44px] text-sm inline-flex items-center justify-center gap-1"
          >
            <PixelIcon name="archive" size={14} /> Tree
          </button>
        </div>
        {tab === "stats" ? (
          <ThreadRingStats threadRingSlug={ring.slug} className="border-none shadow-none" />
        ) : (
          <ThreadRingLineage ringName={ring.name} data={lineage} className="border-none shadow-none" />
        )}
      </div>

      <div className="widget-container widget--flat bg-thread-paper border border-thread-sage rounded-cozy p-3 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-nb-ink-mid">Created:</span>
          <span className="font-medium">{calendarDate(ring.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-nb-ink-mid">Visibility:</span>
          <span className="font-medium capitalize">{ring.visibility}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-nb-ink-mid">Join Type:</span>
          <span className="font-medium capitalize">{ring.joinType}</span>
        </div>
      </div>
    </div>
  );
}
