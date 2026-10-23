import { useState } from "react";
import Link from "next/link";
import { getSiteBaseUrl } from "@/lib/config/site-url";
import Layout from "@/components/ui/layout/Layout";
import type { SiteConfig } from "@/lib/config/site/dynamic";
import type { RingPageRing } from "@/lib/rings/page-data";
import { calendarDate } from "@/lib/utils/dates";
import { useToast } from "@/contexts/ToastContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PixelIcon } from "@/components/ui/PixelIcon";
import Button from "@/components/ui/Button";
import ButtonLink from "@/components/ui/ButtonLink";
import StripBuilder from "@/components/features/rings/StripBuilder";
import ThreadRing88x31Badge from "./ThreadRing88x31Badge";

/** The Spool's page: the root every ring grows from, with no posts or members of its own. */
export default function SpoolLandingPage({ ring, siteConfig }: { ring: RingPageRing; siteConfig: SiteConfig }) {
  const [showSpoolBadgeOptions, setShowSpoolBadgeOptions] = useState(false);
  const [stripOpen, setStripOpen] = useState(false);
  const { user: spoolViewer } = useCurrentUser();
  const { showSuccess } = useToast();
  // From the hub, at render: every ring but the Spool, and the ones branched straight from it
  const totalRings = ring.totalRings ?? 0;
  const directChildren = ring.directChildrenCount ?? 0;

  return (
    <Layout siteConfig={siteConfig} fullWidth={true}>
      <div className="tr-spool-landing max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="tr-spool-hero text-center py-12 mb-12">
          <div className="tr-spool-header mb-6">
            <h1 className="tr-spool-title text-5xl font-bold text-thread-pine mb-4">{ring.name}</h1>
            <p className="tr-spool-description text-xl text-thread-sage max-w-2xl mx-auto leading-relaxed mb-6">
              {ring.description}
            </p>

            {/* Prominent Spool Badge */}
            {ring.badge && ring.badge.isActive && (
              <div className="tr-spool-badge-container thread-module max-w-md mx-auto">
                <div className="tr-spool-badge-content text-center">
                  <div className="flex justify-center mb-3">
                    <div
                      onClick={() => setShowSpoolBadgeOptions(!showSpoolBadgeOptions)}
                      className="cursor-pointer"
                      title="Click to show copy options"
                    >
                      <ThreadRing88x31Badge
                        themeColor={ring.themeColor}
                        slug={ring.slug}
                        title={ring.badge.title}
                        imageUrl={ring.badge.imageUrl ?? undefined}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-bold text-thread-pine mb-2 flex items-center justify-center gap-1"><PixelIcon name="map" size={16} /> The Spool Official Badge</div>
                  <p className="text-xs text-thread-sage mb-3">
                    {showSpoolBadgeOptions ?
                      "The genesis badge representing the root of all ThreadRing communities" :
                      "Click the badge for a strip and a link for your website"
                    }
                  </p>

                  {showSpoolBadgeOptions ? (
                    <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3 mb-3">
                      <div className="flex justify-center gap-2 mb-2">
                        {ring.visibility === "public" && (
                          <Button
                            variant="secondary"
                            onClick={() => setStripOpen(true)}
                            className="thread-button-secondary text-xs flex items-center justify-center gap-1"
                          >
                            <PixelIcon name="clipboard" size={12} /> Get a strip
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          onClick={() => {
                            navigator.clipboard.writeText(`${getSiteBaseUrl()}/tr/${ring.slug}`);
                            showSuccess('Link copied.');
                          }}
                          className="thread-button-secondary text-xs flex items-center justify-center gap-1"
                        >
                          <PixelIcon name="link" size={12} /> Copy Link
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setShowSpoolBadgeOptions(false)}
                          className="thread-button-secondary text-xs flex items-center justify-center gap-1"
                        >
                          <PixelIcon name="close" size={12} /> Close
                        </Button>
                      </div>
                      <p className="text-xs text-thread-sage">
                        Share The Spool&apos;s genesis badge on your website
                      </p>
                      <StripBuilder isOpen={stripOpen} onClose={() => setStripOpen(false)} ring={ring} signedIn={!!spoolViewer} />
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="tr-spool-stats grid md:grid-cols-2 gap-6 mb-12">
          <div className="thread-module text-center">
            <div className="text-3xl font-bold text-thread-pine mb-2">{totalRings}</div>
            <div className="text-thread-sage font-medium">Total Communities</div>
            <div className="text-sm text-thread-sage mt-1">
              Every ring under The Spool
            </div>
          </div>

          <div className="thread-module text-center">
            <div className="text-3xl font-bold text-thread-pine mb-2">{directChildren}</div>
            <div className="text-thread-sage font-medium">Direct Descendants</div>
            <div className="text-sm text-thread-sage mt-1">
              Communities born from The Spool
            </div>
          </div>
        </div>

        {/* Host's note / welcome message */}
        {ring.curatorNote && (
          <div className="border-l-4 border-nb-lav pl-4 py-2 mb-12">
            <div className="flex items-start">
              <div>
                <p className="font-medium text-nb-ink mb-2">Welcome to The Spool</p>
                <p className="text-nb-ink leading-relaxed">
                  {ring.curatorNote}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Genealogy Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Genealogy Explorer */}
          <div className="thread-module">
            <h2 className="thread-headline text-2xl font-bold mb-4">Genealogy Explorer
            </h2>
            <p className="text-thread-sage mb-6">
              Explore the complete family tree of all ThreadRing communities. See how every ring traces its lineage back to The Spool.
            </p>

            <Link
              href="/threadrings/genealogy"
              className="thread-button btn btn--primary w-full flex items-center justify-center gap-2"
            >
              Explore Family Tree
            </Link>
          </div>

          {/* Community Discovery */}
          <div className="thread-module">
            <h2 className="thread-headline text-2xl font-bold mb-4">Discover Communities
            </h2>
            <p className="text-thread-sage mb-6">
              Browse all ThreadRing communities that have grown from The Spool. Find your people and join the conversation.
            </p>

            <div className="space-y-3">
              <ButtonLink
                href="/threadrings"
                variant="secondary"
                className="thread-button-secondary w-full text-center"
              >
                <PixelIcon name="gps" size={16} className="inline-block align-[-3px] mr-1.5" />Discover Communities
              </ButtonLink>

              <ButtonLink
                href="/tr/spool/fork"
                className="thread-button w-full text-center"
              >
                <PixelIcon name="plus" size={16} className="inline-block align-[-3px] mr-1.5" />Create New Community
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* About The Spool */}
        <div className="thread-module mb-12">
          <h2 className="text-2xl font-bold text-thread-pine mb-4 text-center">
            About The Spool
          </h2>
          <div className="max-w-3xl mx-auto text-thread-sage leading-relaxed space-y-4">
            <p>
              The Spool represents the symbolic origin of all ThreadRing communities. Unlike regular ThreadRings,
              The Spool doesn&apos;t host posts or have traditional members - instead, it serves as the genealogical
              root that connects every community in a unified family tree.
            </p>
            <p>
              Every ThreadRing community, whether created directly or forked from another, can trace its lineage
              back to The Spool. This creates a rich genealogy that shows how communities evolve, split, and grow
              over time.
            </p>
            <p>
              Think of The Spool as the trunk of a vast tree, with every ThreadRing as a branch that grows in its
              own direction while staying connected to the whole.
            </p>
          </div>
        </div>

        <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4 text-sm text-nb-ink">
          <ul className="space-y-1">
            <li>• Created: {calendarDate(ring.createdAt)}</li>
            <li>• Direct Descendants: {directChildren}</li>
            <li>• Total Descendants: {totalRings}</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
