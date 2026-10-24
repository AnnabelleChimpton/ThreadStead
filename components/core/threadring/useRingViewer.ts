import { useEffect, useState } from "react";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usernameFromHandle } from "@/lib/domain/notifications/links";
import type { CurrentUser } from "@/hooks/useCurrentUser";

/** The hub's roles, as this site names them: 'curator' is the ring's Host. */
export type RingRole = "curator" | "moderator" | "member";

export interface RingMemberView {
  id: string;
  userId: string;
  role: string;
  joinedAt?: string;
  user?: {
    id?: string;
    handles?: Array<{ handle: string; host: string }>;
    profileUrl?: string;
    profile?: { displayName?: string | null; avatarUrl?: string | null } | null;
  };
}

export const ROLE_LABELS: Record<RingRole, string> = { curator: "Host", moderator: "Moderator", member: "Member" };

/**
 * Who the viewer is in a ring, from the hub's members list (read signed as
 * them), and joining and leaving. Membership and manage rights are separate:
 * a site admin can manage any ring, but is only a member of the rings they
 * joined. Join and leave update in place: the routes clear the hub's cached
 * reads, so the members list is read again rather than the page reloaded.
 */
export function useRingViewer(ring: { slug: string; joinType: string; memberCount: number }, viewer: CurrentUser | null) {
  const { showError, showSuccess } = useToast();
  const confirm = useConfirm();
  const [members, setMembers] = useState<RingMemberView[]>([]);
  const [isPublicInfo, setIsPublicInfo] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersVersion, setMembersVersion] = useState(0);
  // Set from a join or leave answer, ahead of the members list catching up
  const [roleOverride, setRoleOverride] = useState<{ role: RingRole | null } | null>(null);
  const [memberCountShift, setMemberCountShift] = useState(0);
  const [invite, setInvite] = useState<{ inviterName: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const slug = ring.slug;
  const viewerId = viewer?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    setMembersLoading(true);
    fetch(`/api/threadrings/${encodeURIComponent(slug)}/members`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setMembers(data.members || []);
        setIsPublicInfo(!!data.isPublicInfo);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, membersVersion]);

  // Invite-only ring: has someone invited the viewer? (The hub checks again on join.)
  useEffect(() => {
    if (ring.joinType !== "invite" || !viewerId) return;
    let cancelled = false;
    fetch(`/api/threadrings/${encodeURIComponent(slug)}/my-invite`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.invite) return;
        const inviter = data.invite.inviter;
        setInvite({ inviterName: inviter?.displayName || usernameFromHandle(inviter?.handle) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug, ring.joinType, viewerId]);

  const listed = viewer ? members.find((member) => member.userId === viewer.id) : undefined;
  const role: RingRole | null = !viewer
    ? null
    : roleOverride
      ? roleOverride.role
      : ((listed?.role as RingRole | undefined) ?? null);

  async function post(action: "join" | "leave") {
    const response = await csrfFetch(`/api/threadrings/${encodeURIComponent(slug)}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  }

  async function join() {
    if (busy) return;
    setBusy(true);
    try {
      const { ok, data } = await post("join");
      if (!ok) {
        showError(data.error || "Couldn't join. Try again in a minute.");
        return;
      }
      setRoleOverride({ role: (data.role as RingRole) || "member" });
      setMemberCountShift((shift) => shift + 1);
      setInvite(null);
      setMembersVersion((version) => version + 1);
      showSuccess(data.message || "You're in.");
    } catch {
      showError("Couldn't join. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (busy) return;
    const ok = await confirm({
      title: "Leave this ring?",
      message: role === "curator"
        ? "As its host, you can only leave if you're the last member."
        : "Your posts stay in it.",
      confirmText: "Leave ring",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { ok: left, data } = await post("leave");
      if (!left) {
        showError(data.error || "Couldn't leave. Try again in a minute.");
        return;
      }
      setRoleOverride({ role: null });
      setMemberCountShift((shift) => shift - 1);
      setMembersVersion((version) => version + 1);
      showSuccess(data.message || "You've left this ring.");
    } catch {
      showError("Couldn't leave. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  return {
    role,
    isMember: role !== null,
    /** Settings and the members page: the ring's host, or a site admin */
    canManage: role === "curator" || viewer?.role === "admin",
    /** Pin and take posts out of the ring */
    canModerate: role === "curator" || role === "moderator",
    invite: ring.joinType === "invite" ? invite : null,
    memberCount: Math.max(ring.memberCount + memberCountShift, 0),
    members,
    isPublicInfo,
    membersLoading,
    busy,
    join,
    leave,
  };
}

export type RingViewer = ReturnType<typeof useRingViewer>;
