import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Button from "@/components/ui/Button";
import ErrorDisplay from "@/components/ui/feedback/ErrorDisplay";
import ThreadRingInviteForm from "@/components/ui/forms/ThreadRingInviteForm";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { calendarDate } from "@/lib/utils/dates";
import { ringAccentHex } from "@/lib/rings/theme";
import type { RingSettings } from "@/lib/api/ringhub/ringhub-transformers";
import type { ManageMember, ManageRights } from "@/lib/rings/manage";
import type { ManageRing } from "@/pages/tr/[slug]/manage";
import { HELP, Heading, ROWS, SELECT } from "./form";

const ROLE_NAMES = { host: "Host", moderator: "Moderator", member: "Member" };

interface PeopleTabProps {
  ring: ManageRing;
  settings: RingSettings;
  rights: ManageRights;
  /** null when the hub didn't answer in time */
  people: ManageMember[] | null;
  viewerId: string;
  onChange: (people: ManageMember[]) => void;
}

function inviteHelp(ring: ManageRing, joinType: RingSettings["joinType"]): string {
  if (joinType === "open") return `Anyone can join ${ring.name}, so sharing the link works too. An invite also lands in their notifications.`;
  if (joinType === "invite") return "An invite is the way in. It lands in their notifications.";
  return "The ring takes nobody new for now, but an invite still lets someone in. It lands in their notifications.";
}

/** Who's in the ring: inviting, roles and removing, as far as Ring Hub lets this person. */
export default function PeopleTab({ ring, settings, rights, people, viewerId, onChange }: PeopleTabProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const accent = ringAccentHex(settings.themeColor, ring.slug);
  const hostName = people?.find((p) => p.role === "host")?.name ?? "the host";

  const call = async (person: ManageMember, init: RequestInit, fallback: string) => {
    setBusy(person.key);
    try {
      const res = await csrfFetch(`/api/threadrings/${encodeURIComponent(ring.slug)}/members/${encodeURIComponent(person.key)}`, {
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || fallback);
      if (data.message) showSuccess(data.message);
      return true;
    } catch (error) {
      showError(error instanceof Error && error.message ? error.message : fallback);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const setRole = async (person: ManageMember, role: "member" | "moderator") => {
    if (!people) return;
    const ok = await call(person, { method: "PUT", body: JSON.stringify({ role }) }, "Couldn't change their role. Try again.");
    if (ok) onChange(people.map((p) => (p.key === person.key ? { ...p, role } : p)));
  };

  const remove = async (person: ManageMember) => {
    if (!people) return;
    const yes = await confirm({
      title: `Remove ${person.name} from ${ring.name}?`,
      message: "They can only come back if they're invited.",
      confirmText: "Remove",
      variant: "danger",
    });
    if (!yes) return;
    const ok = await call(person, { method: "DELETE" }, "Couldn't remove them. Try again.");
    if (ok) onChange(people.filter((p) => p.key !== person.key));
  };

  return (
    <div className="space-y-8">
      {rights.invite && (
        <div>
          <Heading>Invite someone</Heading>
          <p className={HELP}>{inviteHelp(ring, settings.joinType)}</p>
          <ThreadRingInviteForm threadRingSlug={ring.slug} />
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <Heading>Members</Heading>
          {people && <span className="text-sm text-nb-ink-mid">{people.length}</span>}
        </div>
        {!rights.roles && rights.remove === "members" && (
          <p className="text-sm text-nb-ink-mid mt-1 mb-0">
            You can invite people and remove members. Only {hostName} changes roles. If {hostName} has gone quiet,{" "}
            <Link href="/help/contact" className="underline text-nb-ink">write to me</Link> and I&apos;ll hand the ring over.
          </p>
        )}

        {people === null ? (
          <ErrorDisplay
            title="I can't list the members right now"
            message="Ring Hub didn't answer in time. Try again in a minute."
            onRetry={() => router.replace(router.asPath, undefined, { scroll: false })}
            className="mt-3"
          />
        ) : (
          <ul className={`${ROWS} mt-2`}>
            {people.map((person) => {
              const isViewer = person.key === viewerId;
              const isHost = person.role === "host";
              const canRemove = !isHost && !isViewer && (rights.remove === "any" || (rights.remove === "members" && person.role === "member"));
              const canRole = rights.roles && !isHost && !isViewer;
              return (
                <li key={person.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                  <Face person={person} />
                  <div className="min-w-0 flex-1">
                    {person.profileHref ? (
                      <a href={person.profileHref} className="font-semibold text-nb-ink underline decoration-dotted" rel={person.local ? undefined : "ugc nofollow"}>
                        {person.name}
                      </a>
                    ) : (
                      <span className="font-semibold text-nb-ink">{person.name}</span>
                    )}{" "}
                    {person.handle && <span className="text-sm text-nb-ink-mid break-all">{person.handle}</span>}
                    <div className="text-sm text-nb-ink-mid">
                      <span className={isHost ? "font-semibold" : ""} style={isHost ? { color: accent } : undefined}>
                        {ROLE_NAMES[person.role]}
                      </span>{" "}
                      · joined {calendarDate(person.joinedAt)}
                    </div>
                  </div>
                  {person.homeHandle && (
                    <a href={`/home/${encodeURIComponent(person.homeHandle)}`} className="ts-house-badge-link hidden sm:block shrink-0" title={`${person.name}'s house`}>
                      { }
                      <img
                        src={`/api/home/${encodeURIComponent(person.homeHandle)}/badge`}
                        alt={`${person.name}'s house`}
                        width={88}
                        height={31}
                        loading="lazy"
                        style={{ imageRendering: "pixelated", display: "block" }}
                      />
                    </a>
                  )}
                  {isViewer ? (
                    <span className="w-full sm:w-auto text-sm text-nb-ink-mid sm:min-w-[11.5rem] sm:text-right pl-[52px] sm:pl-0">That&apos;s you</span>
                  ) : (
                    (canRole || canRemove) && (
                      <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[11.5rem] sm:justify-end pl-[52px] sm:pl-0">
                        {canRole && (
                          <select
                            value={person.role}
                            onChange={(e) => setRole(person, e.target.value as "member" | "moderator")}
                            disabled={busy === person.key}
                            aria-label={`${person.name}'s role`}
                            className={`${SELECT} min-w-[8.5rem]`}
                          >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                          </select>
                        )}
                        {canRemove && (
                          <Button variant="secondary" size="sm" onClick={() => remove(person)} disabled={busy === person.key}>
                            Remove
                          </Button>
                        )}
                      </div>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {(rights.remove || rights.invite) && (
          <p className="text-sm text-nb-ink-mid mt-3 mb-0">Someone you remove can only come back if they&apos;re invited.</p>
        )}
      </div>
    </div>
  );
}

function Face({ person }: { person: ManageMember }) {
  if (person.avatarUrl) {
     
    return <img src={person.avatarUrl} alt="" width={40} height={40} className="w-10 h-10 rounded-full border border-nb-ink-mid/35 object-cover shrink-0" />;
  }
  return (
    <span
      aria-hidden="true"
      className="w-10 h-10 rounded-full border border-nb-ink-mid/35 bg-nb-surface text-nb-ink-mid font-mono text-[15px] inline-flex items-center justify-center shrink-0"
    >
      {person.name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
