import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import type { FeedPageUpdate } from "@/lib/feed/page-updates";
import LivePagePreview from "@/components/features/profile/LivePagePreview";
import UserMention from "@/components/ui/navigation/UserMention";
import ButtonLink from "@/components/ui/ButtonLink";
import { PixelIcon } from "@/components/ui/PixelIcon";

const MAX_PREVIEW_WIDTH = 560;

/** The card's inner width, so the preview fills it (and fits a phone) */
function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0) setWidth(Math.min(MAX_PREVIEW_WIDTH, el.clientWidth));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

/**
 * "<Name> updated their page" in the feed: the owner ticked "Share this
 * update in the feed" when they saved. The preview is the live page, so it
 * always shows what's there now. A page that isn't public gets no preview:
 * the preview is what a signed-out visitor sees, which would be a "this
 * page is private" notice.
 */
export default function PageUpdateCard({ update }: { update: FeedPageUpdate }) {
  const name = update.displayName || update.username;
  const pageHref = `/resident/${encodeURIComponent(update.username)}`;
  const { ref, width } = useWidth(320);
  const when = formatDistanceToNow(new Date(update.sharedAt), { addSuffix: true });

  return (
    <article className="bg-thread-paper border-y sm:border border-thread-sage/30 p-5 sm:p-8 mb-6 sm:rounded-cozy shadow-cozy-sm">
      <header className="flex items-center gap-4 mb-4">
        {update.avatarUrl ? (
          <Image
            src={update.avatarUrl}
            alt=""
            width={48}
            height={48}
            className="w-12 h-12 rounded-full border-2 border-thread-sage/20 shadow-sm"
            unoptimized={update.avatarUrl.endsWith(".gif")}
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-thread-cream border-2 border-thread-sage/20 flex items-center justify-center shadow-sm" aria-hidden="true">
            <span className="text-thread-sage font-mono text-lg">{name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-thread-charcoal">
            <UserMention
              username={update.username}
              displayName={name}
              className="font-bold text-thread-pine hover:text-thread-sunset transition-colors"
            />{" "}
            updated their page
          </p>
          <time dateTime={update.sharedAt} className="text-thread-sage text-sm">
            {when}
          </time>
        </div>
        <PixelIcon name="paint-bucket" size={20} className="text-thread-sage flex-shrink-0" aria-hidden="true" />
      </header>

      <div ref={ref} className="w-full">
        {update.publicPage && (
          <Link href={pageHref} className="block w-fit mb-4" aria-label={`${name}'s page`}>
            <LivePagePreview username={update.username} width={width} label={`${name}'s page`} />
          </Link>
        )}
      </div>

      <ButtonLink href={pageHref} variant="secondary" size="sm">
        Visit their page
      </ButtonLink>
    </article>
  );
}
