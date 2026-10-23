import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/ui/layout/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { SITE_NAME } from "@/lib/config/site/constants";
import { getPublicRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { raceHubCall, HUB_TIMEOUT } from "@/lib/api/ringhub/ringhub-ssr";
import { readAllRingMembers } from "@/lib/api/ringhub/ring-members";
import { transformRingMembersBatchWithUserResolution } from "@/lib/api/ringhub/ringhub-transformers";
import { readRingAs } from "@/lib/domain/threadrings/ring-access";
import ThreadRingInviteForm from "@/components/ui/forms/ThreadRingInviteForm";
import UserMention from "@/components/ui/navigation/UserMention";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { badgeHandlesFor } from "@/lib/pixel-homes/house-badge";
import { calendarDate } from "@/lib/utils/dates";
import PageMeta from "@/components/ui/layout/PageMeta";

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    handles: Array<{ handle: string; host: string }>;
    profileUrl?: string;
    profile: {
      displayName?: string | null;
      avatarUrl?: string | null;
    };
  };
  /** Their pixel home's handle, when the viewer may see it: shows the house badge */
  homeHandle?: string | null;
  /** From another instance (decided on the server, see UserMention) */
  external?: boolean;
}

interface ThreadRingMembersPageProps {
  siteConfig: SiteConfig;
  ring: {
    name: string;
    slug: string;
    memberCount: number;
  } | null;
  members: Member[];
  /** What Ring Hub lets the viewer do here (lib/domain/threadrings/ring-access.ts) */
  rights: {
    /** Change roles: the Host, or a site admin signing as this site */
    roles: boolean;
    /** Remove: the Host anyone, a moderator plain members */
    remove: "any" | "members" | null;
    /** Hand the ring over: the Host, or a site admin */
    handOver: boolean;
    /** Invite: the Host and moderators */
    invite: boolean;
  };
  viewerId: string | null;
  error?: string;
}

const NO_RIGHTS: ThreadRingMembersPageProps["rights"] = { roles: false, remove: null, handOver: false, invite: false };

export default function ThreadRingMembersPage({
  siteConfig,
  ring,
  members: initialMembers,
  rights = NO_RIGHTS,
  viewerId,
  error
}: ThreadRingMembersPageProps) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  // A reload (after handing the ring over) brings a fresh list.
  useEffect(() => setMembers(initialMembers), [initialMembers]);
  const [managing, setManaging] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();

  if (error || !ring) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center text-red-600">
            {error || "Ring not found"}
          </div>
        </div>
      </Layout>
    );
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setManaging(userId);

    try {
      const response = await csrfFetch(`/api/threadrings/${ring.slug}/members/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Couldn't change their role. Try again.");
      }

      // Update local state
      setMembers(prev => prev.map(member =>
        member.user.id === userId
          ? { ...member, role: newRole }
          : member
      ));

      showSuccess(data.message);
    } catch (error: any) {
      console.error("Error updating role:", error);
      showError(error.message || "Couldn't change their role. Try again.");
    } finally {
      setManaging(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const member = members.find(m => m.user.id === userId);
    if (!member) return;

    const memberHandle = member.user.handles.find(h => h.host === SITE_NAME)?.handle ||
      member.user.handles[0]?.handle ||
      "unknown";

    if (!(await confirm({
      title: `Remove ${memberHandle} from ${ring.name}?`,
      confirmText: "Remove",
      variant: "danger",
    }))) return;

    setManaging(userId);

    try {
      const response = await csrfFetch(`/api/threadrings/${ring.slug}/members/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Couldn't remove them. Try again.");
      }

      // Update local state
      setMembers(prev => prev.filter(member => member.user.id !== userId));

      showSuccess(data.message);
    } catch (error: any) {
      console.error("Error removing member:", error);
      showError(error.message || "Couldn't remove them. Try again.");
    } finally {
      setManaging(null);
    }
  };

  const handleMakeOwner = async (member: Member) => {
    const handle = getMemberHandle(member);
    if (!(await confirm({
      title: `Hand ${ring.name} to @${handle}?`,
      message: `@${handle} becomes the Host and runs the ring. The current Host stays on as a member, and only @${handle} can hand it back.`,
      confirmText: "Hand it over",
    }))) return;

    setManaging(member.user.id);
    try {
      const response = await csrfFetch(`/api/threadrings/${ring.slug}/transfer-ownership`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newOwnerUserId: member.user.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Couldn't hand the ring over. Try again.");
      }
      showSuccess(data.message);
      // Who can manage the ring changed: reload it from the server.
      await router.replace(router.asPath);
    } catch (error) {
      showError(error instanceof Error && error.message ? error.message : "Couldn't hand the ring over. Try again.");
    } finally {
      setManaging(null);
    }
  };

  const getMemberDisplayName = (member: Member) => {
    const handle = member.user.handles.find(h => h.host === SITE_NAME)?.handle ||
      member.user.handles[0]?.handle ||
      "unknown";
    return member.user.profile?.displayName || `@${handle}`;
  };

  const getMemberHandle = (member: Member) => {
    return member.user.handles.find(h => h.host === SITE_NAME)?.handle ||
      member.user.handles[0]?.handle ||
      "unknown";
  };

  return (
    <Layout siteConfig={siteConfig}>
      <PageMeta title={`${ring.name} members`} path={`/tr/${ring.slug}/members`} />
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Members</h1>
            <button
              onClick={() => router.push(`/tr/${ring.slug}`)}
              className="border border-black px-4 py-2 bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000]"
            >
              Back to the ring
            </button>
          </div>
          <p className="text-gray-600">
            <strong>{ring.name}</strong> • {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>

        {rights.invite && (
          <div className="bg-white border border-black p-4 shadow-[2px_2px_0_#000] mb-6">
            <h2 className="font-bold mb-3">Invite someone</h2>
            <ThreadRingInviteForm threadRingSlug={ring.slug} threadRingName={ring.name} />
          </div>
        )}

        {/* Members List */}
        <div className="bg-white border border-black shadow-[2px_2px_0_#000]">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">All Members</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {members.map((member) => {
              const isCurator = member.role === "curator";
              const isViewer = member.user.id === viewerId;
              const canRemove = !isCurator && !isViewer &&
                (rights.remove === "any" || (rights.remove === "members" && member.role === "member"));
              const removeButton = (
                <button
                  onClick={() => handleRemoveMember(member.user.id)}
                  disabled={managing === member.user.id}
                  className="text-xs border border-black px-3 py-1 bg-red-100 hover:bg-red-200 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all disabled:opacity-50"
                >
                  {managing === member.user.id ? "..." : "Remove"}
                </button>
              );

              return (
                <div key={member.user.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {member.user.profile?.avatarUrl && (
                      <img
                        src={member.user.profile.avatarUrl}
                        alt={getMemberDisplayName(member)}
                        className="w-10 h-10 rounded-full border border-gray-300"
                      />
                    )}
                    <div>
                      <div className="font-medium">
                        <UserMention
                          username={getMemberHandle(member)}
                          displayName={member.user.profile?.displayName || undefined}
                          handleHost={member.user.handles[0]?.host}
                          profileUrl={member.user.profileUrl}
                          external={member.external}
                        />
                      </div>
                      <div className="text-sm text-gray-600">
                        Joined {calendarDate(member.joinedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {member.homeHandle && (
                      <a href={`/home/${encodeURIComponent(member.homeHandle)}`} className="ts-house-badge-link block shrink-0" title={`${getMemberDisplayName(member)}'s house`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/home/${encodeURIComponent(member.homeHandle)}/badge`}
                          alt={`${getMemberDisplayName(member)}'s house`}
                          width={88}
                          height={31}
                          loading="lazy"
                          style={{ imageRendering: "pixelated", display: "block" }}
                        />
                      </a>
                    )}
                    {/* Role Badge */}
                    <span className={`text-xs px-3 py-1 border border-black rounded ${member.role === "curator" ? "bg-yellow-200" :
                        member.role === "moderator" ? "bg-blue-200" :
                          "bg-gray-200"
                      }`}>
                      {member.role === "curator" ? "Host" :
                        member.role === "moderator" ? "Moderator" :
                          "Member"}
                    </span>

                    {/* Management Controls */}
                    {!isCurator && !isViewer && (rights.roles || rights.handOver || canRemove) && (
                      <div className="flex items-center gap-2">
                        {/* Role Toggle */}
                        {rights.roles && (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user.id, e.target.value)}
                          disabled={managing === member.user.id}
                          className="text-xs border border-black px-2 py-1 bg-white disabled:opacity-50"
                        >
                          <option value="member">Member</option>
                          <option value="moderator">Moderator</option>
                        </select>
                        )}

                        {/* Hand the ring over: residents here only (others show by DID) */}
                        {rights.handOver && !member.user.id.startsWith("did:") && (
                          <button
                            onClick={() => handleMakeOwner(member)}
                            disabled={managing === member.user.id}
                            className="text-xs border border-black px-3 py-1 bg-white hover:bg-gray-100 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all disabled:opacity-50"
                          >
                            Make Host
                          </button>
                        )}

                        {canRemove && removeButton}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {members.length === 0 && (
            <div className="p-8 text-center text-gray-600">
              Nobody here yet.
            </div>
          )}
        </div>

        {rights.remove === "members" && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded">
            <p className="text-sm text-yellow-800">
              Only the Host changes roles. You can remove members and invite people.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

const UNREACHABLE = "We can't reach Ring Hub right now, so the members can't be shown. Try again in a minute.";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const siteConfig = await getSiteConfig();
  const { slug } = context.params!;
  if (typeof slug !== "string") return { notFound: true };

  const viewer = await getSessionUser(context.req as any);
  const failed = { props: { siteConfig, ring: null, members: [], rights: NO_RIGHTS, viewerId: viewer?.id ?? null, error: UNREACHABLE } };

  // Signed as the viewer, so a private ring's members see it. No local fallback.
  const access = await raceHubCall(readRingAs(viewer, slug));
  if (access === HUB_TIMEOUT) return failed;
  if (!access) return { notFound: true };

  const reader = viewer && access.viewerDid ? createAuthenticatedRingHubClient(viewer.id) : getPublicRingHubClient();
  const read = reader ? await readAllRingMembers(reader, slug) : HUB_TIMEOUT;
  if (read === HUB_TIMEOUT) return failed;

  const resolved = await transformRingMembersBatchWithUserResolution(read.members, slug, db, viewer?.id ?? null);
  const members = resolved.map((m) => ({
    id: m.id,
    role: m.role,
    joinedAt: m.joinedAt,
    user: {
      id: m.user.id,
      handles: m.user.handles,
      profileUrl: m.user.profileUrl,
      profile: { displayName: m.user.displayName, avatarUrl: m.user.avatarUrl },
    },
  }));

  const isAdmin = viewer?.role === "admin";
  return {
    props: {
      siteConfig,
      ring: { name: access.ring.name, slug: access.ring.slug, memberCount: access.ring.memberCount ?? members.length },
      members: markExternal(await withHouseBadges(members, viewer?.id)),
      rights: {
        roles: access.manageAs !== null,
        remove: access.isHost ? "any" : access.isSteward ? "members" : null,
        handOver: access.isHost || isAdmin,
        invite: access.isSteward,
      },
      viewerId: viewer?.id ?? null,
    },
  };
};

/** Each member's house badge handle, for homes this viewer may see. Never fails the page. */
async function withHouseBadges<T extends { user: { id: string } }>(members: T[], viewerId: string | undefined) {
  try {
    const handles = await badgeHandlesFor(db, members.map((m) => m.user.id), viewerId, SITE_NAME);
    return members.map((m) => ({ ...m, homeHandle: handles.get(m.user.id) ?? null }));
  } catch (error) {
    console.error("House badges skipped:", error);
    return members.map((m) => ({ ...m, homeHandle: null }));
  }
}

/** Flags members from other instances here, where SITE_NAME is known. */
function markExternal<T extends { user: { handles: Array<{ host: string }> } }>(members: T[]) {
  return members.map((m) => {
    const host = m.user.handles[0]?.host;
    return { ...m, external: !!host && host !== SITE_NAME };
  });
}
