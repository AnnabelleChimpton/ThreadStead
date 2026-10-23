import type { ReactNode } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import ButtonLink from "@/components/ui/ButtonLink";
import { PixelIcon } from "@/components/ui/PixelIcon";
import type { RingPageRing } from "@/lib/rings/page-data";
import type { RingViewer } from "./useRingViewer";

/** Where a signed-out visitor goes to act, and comes back to this ring after. */
export function signInHref(slug: string) {
  return `/login?next=${encodeURIComponent(`/tr/${slug}`)}`;
}

const ICON = "inline-block align-[-3px] mr-1.5";
const QUIET = "text-sm text-nb-ink-mid";

/**
 * The one row of things to do in a ring, in its header card: a member writes
 * and walks the ring street; anyone else joins, accepts an invite, or reads
 * why they can't; a signed-out visitor signs in first. Hosts and moderators
 * get Manage. Managing is separate from membership, so a site admin who
 * isn't in the ring gets Manage and Join.
 */
export default function RingActions({ ring, viewer, signedIn }: { ring: RingPageRing; viewer: RingViewer; signedIn: boolean }) {
  const slug = encodeURIComponent(ring.slug);
  const hostName = ring.host ? ring.host.displayName || ring.host.username : "the host";
  const manage = (viewer.canManage || viewer.canModerate) && (
    <ButtonLink href={`/tr/${slug}/manage`} variant="secondary" className="flex-1 sm:flex-none text-center">
      <PixelIcon name="sliders" size={16} className={ICON} />Manage
    </ButtonLink>
  );

  if (viewer.role) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <ButtonLink href={`/post/new?threadRing=${slug}`} className="w-full sm:w-auto text-center">
          <PixelIcon name="edit" size={16} className={ICON} />Write in this ring
        </ButtonLink>
        <ButtonLink href={`/neighborhood/ring/${slug}`} variant="secondary" className="flex-1 sm:flex-none text-center">
          <PixelIcon name="buildings" size={16} className={ICON} />Ring street
        </ButtonLink>
        {manage}
        {/* A host hands the ring over in Manage before leaving it */}
        {viewer.role !== "curator" && (
          <span className={`${QUIET} sm:ml-auto`}>
            {viewer.role === "moderator" ? "You're a moderator" : "You're a member"}
            <span aria-hidden="true" className="px-1.5">·</span>
            <button type="button" onClick={viewer.leave} disabled={viewer.busy} className="ts-bare ts-text-button !text-nb-ink-mid decoration-dotted">
              {viewer.busy ? "Leaving..." : "Leave"}
            </button>
          </span>
        )}
      </div>
    );
  }

  let join: ReactNode;
  if (!signedIn && ring.joinType !== "closed") {
    join = (
      <>
        <ButtonLink href={signInHref(ring.slug)} className="w-full sm:w-auto text-center px-5">
          Sign in to join
        </ButtonLink>
        <span className={`${QUIET} w-full sm:w-auto text-center sm:text-left`}>
          New here? <Link href="/signup" className="text-nb-ink">Sign up</Link>
        </span>
      </>
    );
  } else if (signedIn && ring.joinType === "open") {
    join = (
      <Button onClick={viewer.join} disabled={viewer.busy} className="w-full sm:w-auto">
        {viewer.busy ? "Joining..." : `Join ${ring.name}`}
      </Button>
    );
  } else if (viewer.invite) {
    join = (
      <>
        <span className={QUIET}>{viewer.invite.inviterName ? `${viewer.invite.inviterName} invited you.` : "You're invited."}</span>
        <Button onClick={viewer.join} disabled={viewer.busy} className="w-full sm:w-auto">
          {viewer.busy ? "Joining..." : "Accept invite"}
        </Button>
      </>
    );
  } else if (ring.joinType === "invite") {
    join = <p className={`${QUIET} m-0`}>Invite only. Ask {hostName} if you&apos;d like in.</p>;
  } else {
    join = <p className={`${QUIET} m-0`}>Not taking new members right now.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {join}
      {manage}
    </div>
  );
}
