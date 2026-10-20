// The showcase: pages people wrote in their own HTML and share the source
// of, each shown live in a little preview, with a way to look at the source
// or start your own page from it. Which pages are listed, and why only
// public ones, is in lib/domain/profile/showcase.ts.
import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import type { GetServerSideProps, NextApiRequest } from "next";
import Layout from "@/components/ui/layout/Layout";
import PageHeader from "@/components/ui/layout/PageHeader";
import ButtonLink from "@/components/ui/ButtonLink";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/feedback/EmptyState";
import LivePagePreview from "@/components/features/profile/LivePagePreview";
import { useToast } from "@/contexts/ToastContext";
import { getSiteConfig, type SiteConfig } from "@/lib/config/site/dynamic";
import { startFromHref } from "@/lib/domain/profile/start-from-link";
import { listShowcase, type ShowcaseList, type ShowcasePage } from "@/lib/domain/profile/showcase";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/config/database/connection";

interface ShowcaseProps {
  siteConfig: SiteConfig;
  initial: ShowcaseList;
  signedIn: boolean;
  viewerUsername: string | null;
}

/** The live preview at the card's own width, so it fits a phone too */
function FittedPreview({ username, label }: { username: string; label: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(288);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.floor(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="w-full">
      <LivePagePreview username={username} width={width} label={label} />
    </div>
  );
}

function ShowcaseCard({
  page,
  signedIn,
  viewerUsername,
}: {
  page: ShowcasePage;
  signedIn: boolean;
  viewerUsername: string | null;
}) {
  const name = page.displayName || page.username;
  const isOwn = viewerUsername !== null && viewerUsername.toLowerCase() === page.username.toLowerCase();
  const handle = encodeURIComponent(page.username);

  return (
    <li className="thread-module p-3 sm:p-4 flex flex-col gap-3 min-w-0">
      <FittedPreview username={page.username} label={`${name}'s page`} />
      <div className="min-w-0">
        <h2 className="font-bold text-thread-pine truncate">{name}</h2>
        <p className="text-sm text-thread-sage truncate">@{page.username}</p>
      </div>
      <div className="flex flex-wrap gap-2 mt-auto">
        <ButtonLink href={`/resident/${handle}`} variant="secondary" size="sm">
          Visit
        </ButtonLink>
        <ButtonLink href={`/resident/${handle}/source`} variant="secondary" size="sm">
          View source
        </ButtonLink>
        {!isOwn && (
          <ButtonLink href={startFromHref(viewerUsername, signedIn, page.username)} size="sm">
            Start from this page
          </ButtonLink>
        )}
      </div>
    </li>
  );
}

export default function Showcase({ siteConfig, initial, signedIn, viewerUsername }: ShowcaseProps) {
  const { showError } = useToast();
  const [pages, setPages] = useState<ShowcasePage[]>(initial.pages);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/showcase?offset=${pages.length}`);
      if (!res.ok) throw new Error(String(res.status));
      const next: ShowcaseList = await res.json();
      // Someone saving moves their page to the top, so a page can come round twice
      setPages((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...next.pages.filter((p) => !seen.has(p.id))];
      });
      setHasMore(next.hasMore);
    } catch {
      showError("Couldn't load more pages. Try again in a bit.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <>
      <Head>
        <title>{`Showcase | ${siteConfig.site_name}`}</title>
        <meta
          name="description"
          content="Pages people here wrote in their own HTML and share the source of. Look at how they're made, or start your own page from one."
        />
      </Head>
      <Layout siteConfig={siteConfig}>
        <div className="space-y-6">
          <PageHeader title="Showcase" back={{ href: "/build", label: "Build your page" }}>
            <p>
              These are pages people here wrote themselves and left the source open on. If one catches your eye,
              have a look at how it&apos;s made, or start your own page from it.
            </p>
            <p>
              Starting from one puts a copy in your editor with a note at the top saying whose it was. Nothing on
              your page changes until you save.
            </p>
            <p className="text-base text-thread-sage">
              Want yours in here? Tick &ldquo;Visitors can view my source&rdquo; in your HTML editor.
            </p>
          </PageHeader>

          {pages.length === 0 ? (
            <EmptyState
              title="No shared pages yet"
              description={
                <p>
                  When someone writes their own page and turns on &ldquo;Visitors can view my source&rdquo;, it
                  shows up here.
                </p>
              }
              actionLabel={viewerUsername ? "Open your HTML editor" : undefined}
              actionHref={viewerUsername ? `/resident/${encodeURIComponent(viewerUsername)}/template-editor` : undefined}
            />
          ) : (
            <>
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 list-none p-0 m-0">
                {pages.map((page) => (
                  <ShowcaseCard key={page.id} page={page} signedIn={signedIn} viewerUsername={viewerUsername} />
                ))}
              </ul>
              {hasMore && (
                <div className="text-center">
                  <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading…" : "Show more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<ShowcaseProps> = async ({ req }) => {
  const viewer = await getSessionUser(req as NextApiRequest);
  const [siteConfig, initial] = await Promise.all([getSiteConfig(), listShowcase(db, viewer?.id)]);

  return {
    props: {
      siteConfig,
      initial,
      signedIn: viewer !== null,
      viewerUsername: viewer?.primaryHandle?.split("@")[0] ?? null,
    },
  };
};
