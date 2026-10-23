import Link from "next/link";
import Button from "@/components/ui/Button";
import ButtonLink from "@/components/ui/ButtonLink";
import { PixelIcon } from "@/components/ui/PixelIcon";
import type { RingPageRing } from "@/lib/rings/page-data";
import { ROLE_LABELS, type RingViewer } from "./useRingViewer";

const ROLE_ICONS = { curator: "trophy", moderator: "shield", member: "user" } as const;

/** Where a signed-out visitor goes to act, and comes back to this ring after. */
export function signInHref(slug: string) {
  return `/login?next=${encodeURIComponent(`/tr/${slug}`)}`;
}

/**
 * The ring's actions for whoever's looking: a member writes, explores and can
 * leave; anyone else joins, accepts an invite, or sees why they can't; a
 * signed-out visitor is sent to sign in. Managing is separate from
 * membership, so a site admin who isn't in the ring gets Settings and Join.
 */
export default function RingActions({ ring, viewer, signedIn }: { ring: RingPageRing; viewer: RingViewer; signedIn: boolean }) {
  const slug = encodeURIComponent(ring.slug);
  // Moderators run the ring's prompts from its settings page
  const settingsLink = (viewer.canManage || viewer.canModerate) && (
    <ButtonLink href={`/tr/${slug}/settings`} variant="secondary" className="thread-button-secondary w-full text-center">
      <PixelIcon name="sliders" size={16} className="inline-block align-[-3px] mr-1.5" />{viewer.canManage ? "Manage Settings" : "Ring Prompts"}
    </ButtonLink>
  );
  const branchLink = (
    <ButtonLink href={`/tr/${slug}/fork`} variant="secondary" className="thread-button-secondary w-full text-center">
      <PixelIcon name="external-link" size={14} className="inline-block align-[-2px] mr-1.5" />Branch This Ring
    </ButtonLink>
  );

  return (
    <div className="tr-sidebar-section tr-primary-actions bg-thread-paper rounded-cozy shadow-cozy-sm border border-thread-sage/30 p-3 sm:p-4">
      {viewer.role ? (
        <div className="space-y-3">
          <div className="tr-member-status badge badge--butter block px-3 py-2 text-center">
            <span className="tr-role-indicator font-semibold text-nb-ink flex items-center justify-center gap-1">
              <PixelIcon name={ROLE_ICONS[viewer.role]} size={14} /> {ROLE_LABELS[viewer.role]}
            </span>
          </div>

          <ButtonLink
            href={`/post/new?threadRing=${slug}`}
            className="thread-button w-full text-center"
          >
            <PixelIcon name="edit" size={16} className="inline-block align-[-3px] mr-1.5" />Write in this ring
          </ButtonLink>

          <ButtonLink
            href={`/neighborhood/ring/${slug}`}
            variant="secondary"
            className="thread-button-secondary w-full text-center"
            title="Explore member homes in Ring Streets"
          >
            <PixelIcon name="buildings" size={16} className="inline-block align-[-3px] mr-1.5" />Ring Neighborhood
          </ButtonLink>

          {settingsLink}

          <div className="pt-2 border-t-2 border-dotted border-nb-ink-mid/30 space-y-2">
            {branchLink}
            <Button
              variant="secondary"
              onClick={viewer.leave}
              disabled={viewer.busy}
              className="thread-button-secondary w-full flex items-center justify-center gap-2"
              title={viewer.role === "curator" ? "As host, hand the ring over first (unless you're the only member)" : undefined}
            >
              {viewer.busy ? "Leaving..." : "Leave Ring"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {!signedIn && ring.joinType !== "closed" ? (
            <div className="space-y-2">
              <ButtonLink href={signInHref(ring.slug)} className="thread-button w-full text-center">
                Sign in to join
              </ButtonLink>
              <p className="text-xs text-nb-ink-mid text-center m-0">
                New here? <Link href="/signup">Sign up</Link>
              </p>
            </div>
          ) : ring.joinType === "open" ? (
            <Button onClick={viewer.join} disabled={viewer.busy} className="thread-button w-full flex items-center justify-center gap-2">
              {viewer.busy ? "Joining..." : "Join Ring"}
            </Button>
          ) : viewer.invite ? (
            <div className="space-y-2">
              <p className="text-sm text-center m-0">
                {viewer.invite.inviterName
                  ? <><span className="font-semibold">{viewer.invite.inviterName}</span> invited you to this ring.</>
                  : "You're invited to this ring."}
              </p>
              <Button onClick={viewer.join} disabled={viewer.busy} className="thread-button w-full flex items-center justify-center gap-2">
                {viewer.busy ? "Joining..." : "Accept invite"}
              </Button>
            </div>
          ) : ring.joinType === "invite" ? (
            <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md px-4 py-3 text-center font-medium flex items-center justify-center gap-2">
              <PixelIcon name="lock" size={16} /> Invite Only
            </div>
          ) : (
            <div className="border-2 border-nb-rose rounded-md px-4 py-3 text-center font-medium text-nb-rose-ink flex items-center justify-center gap-2">
              <PixelIcon name="alert" size={16} /> Closed to new members
            </div>
          )}

          {settingsLink}

          {ring.visibility !== "private" && (
            <div className="pt-2 border-t-2 border-dotted border-nb-ink-mid/30 space-y-2">
              <ButtonLink
                href={`/neighborhood/ring/${slug}`}
                variant="secondary"
                className="thread-button-secondary w-full text-center"
                title="Explore member homes in Ring Streets"
              >
                <PixelIcon name="buildings" size={14} className="inline-block align-[-2px] mr-1.5" />Explore Homes
              </ButtonLink>
              {branchLink}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
