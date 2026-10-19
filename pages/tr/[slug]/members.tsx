import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/ui/layout/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { SITE_NAME } from "@/lib/config/site/constants";
import { featureFlags } from "@/lib/utils/features/feature-flags";
import { ringOwnerSource } from "@/lib/domain/threadrings/ring-owner";
import { getRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { raceHubCall, HUB_TIMEOUT } from "@/lib/api/ringhub/ringhub-ssr";
import { readAllRingMembers } from "@/lib/api/ringhub/ring-members";
import UserMention from "@/components/ui/navigation/UserMention";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { badgeHandlesFor } from "@/lib/pixel-homes/house-badge";

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
}

interface ThreadRingMembersPageProps {
  siteConfig: SiteConfig;
  ring: {
    id: string;
    name: string;
    slug: string;
    memberCount: number;
    curatorId: string;
  } | null;
  members: Member[];
  canManage: boolean;
  /** A Ring Hub ring: only those can be handed to a new owner. */
  hubRing?: boolean;
  error?: string;
}

export default function ThreadRingMembersPage({
  siteConfig,
  ring,
  members: initialMembers,
  canManage,
  hubRing = false,
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
            {error || "ThreadRing not found"}
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
        throw new Error(data.error || "Failed to update role");
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
      showError(error.message || "Failed to update role");
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
        throw new Error(data.error || "Failed to remove member");
      }

      // Update local state
      setMembers(prev => prev.filter(member => member.user.id !== userId));

      showSuccess(data.message);
    } catch (error: any) {
      console.error("Error removing member:", error);
      showError(error.message || "Failed to remove member");
    } finally {
      setManaging(null);
    }
  };

  const handleMakeOwner = async (member: Member) => {
    const handle = getMemberHandle(member);
    if (!(await confirm({
      title: `Hand ${ring.name} to @${handle}?`,
      message: `@${handle} becomes the owner and can manage the ring. The current owner stays on as a member, and only @${handle} can hand it back.`,
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
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">ThreadRing Members</h1>
            <button
              onClick={() => router.push(`/tr/${ring.slug}`)}
              className="border border-black px-4 py-2 bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000]"
            >
              Back to ThreadRing
            </button>
          </div>
          <p className="text-gray-600">
            Managing members for <strong>{ring.name}</strong> • {members.length} total members
          </p>
        </div>

        {/* Members List */}
        <div className="bg-white border border-black shadow-[2px_2px_0_#000]">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">All Members</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {members.map((member) => {
              const isCurrentUser = member.user.id === ring.curatorId; // We could pass current user ID
              const isCurator = member.role === "curator";

              return (
                <div key={member.id} className="p-4 flex items-center justify-between">
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
                        />
                      </div>
                      <div className="text-sm text-gray-600">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
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
                      {member.role === "curator" ? "Curator" :
                        member.role === "moderator" ? "Moderator" :
                          "Member"}
                    </span>

                    {/* Management Controls */}
                    {canManage && !isCurator && (
                      <div className="flex items-center gap-2">
                        {/* Role Toggle */}
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user.id, e.target.value)}
                          disabled={managing === member.user.id}
                          className="text-xs border border-black px-2 py-1 bg-white disabled:opacity-50"
                        >
                          <option value="member">Member</option>
                          <option value="moderator">Moderator</option>
                        </select>

                        {/* Hand the ring over: residents here only (others show by DID) */}
                        {hubRing && !member.user.id.startsWith("did:") && (
                          <button
                            onClick={() => handleMakeOwner(member)}
                            disabled={managing === member.user.id}
                            className="text-xs border border-black px-3 py-1 bg-white hover:bg-gray-100 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all disabled:opacity-50"
                          >
                            Make owner
                          </button>
                        )}

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveMember(member.user.id)}
                          disabled={managing === member.user.id}
                          className="text-xs border border-black px-3 py-1 bg-red-100 hover:bg-red-200 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all disabled:opacity-50"
                        >
                          {managing === member.user.id ? "..." : "Remove"}
                        </button>
                      </div>
                    )}

                    {isCurator && canManage && (
                      <span className="text-xs text-gray-500 italic">
                        Curator
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {members.length === 0 && (
            <div className="p-8 text-center text-gray-600">
              No members found.
            </div>
          )}
        </div>

        {!canManage && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded">
            <p className="text-sm text-yellow-800">
              Only the curator can manage member roles and remove members.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const siteConfig = await getSiteConfig();
  const { slug } = context.params!;

  if (typeof slug !== "string") {
    return {
      props: {
        siteConfig,
        ring: null,
        members: [],
        canManage: false,
        error: "Invalid ThreadRing URL",
      },
    };
  }

  const viewer = await getSessionUser(context.req as any);

  try {
    // Use Ring Hub if enabled
    if (featureFlags.ringhub()) {
      const client = getRingHubClient();
      if (client) {
        try {
          // Short SSR deadline so a hung hub doesn't block TTFB; timeout -> local fallback.
          const ringDescriptor = await raceHubCall(client.getRing(slug as string));
          if (ringDescriptor === HUB_TIMEOUT) {
            throw new Error('Ring Hub SSR timeout (getRing)');
          }
          if (ringDescriptor) {
            // Every page of Ring Hub members
            const ringHubMembers = await readAllRingMembers(client, slug as string);
            if (ringHubMembers === HUB_TIMEOUT) {
              throw new Error('Ring Hub SSR timeout (getRingMembers)');
            }

            // Check if viewer owns this Ring Hub ring locally
            let canManage = false;
            if (viewer) {
              if (viewer.role === 'admin') {
                canManage = true;
              } else {
                const ownership = await db.ringHubOwnership.findUnique({
                  where: { ringSlug: slug as string },
                });
                canManage = ownership?.ownerUserId === viewer.id;
              }
            }

            // Convert Ring Hub members to local format with batched user resolution (no N+1)
            const { transformRingMembersBatchWithUserResolution } = await import('@/lib/api/ringhub/ringhub-transformers')

            const resolvedMembers = await transformRingMembersBatchWithUserResolution(
              ringHubMembers.members,
              slug as string,
              db
            )

            const members = resolvedMembers.map((transformedMember) => ({
              id: transformedMember.id,
              role: transformedMember.role,
              joinedAt: transformedMember.joinedAt,
              user: {
                id: transformedMember.user.id,
                handles: transformedMember.user.handles,
                profileUrl: transformedMember.user.profileUrl,
                profile: {
                  displayName: transformedMember.user.displayName,
                  avatarUrl: transformedMember.user.avatarUrl,
                },
              },
            }));

            const ring = {
              id: ringDescriptor.slug,
              name: ringDescriptor.name,
              slug: ringDescriptor.slug,
              memberCount: ringDescriptor.memberCount,
              curatorId: '',
            };

            return {
              props: {
                siteConfig,
                ring,
                members: await withHouseBadges(members, viewer?.id),
                canManage,
                hubRing: true,
              },
            };
          }
        } catch (ringHubError) {
          console.error("Ring Hub error in members page:", ringHubError);
          // Fall through to local database
        }
      }
    }

    // Fall back to local database
    const ring = await db.threadRing.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        memberCount: true,
        curatorId: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                handles: {
                  select: {
                    handle: true,
                    host: true,
                  },
                },
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy: [
            { role: "desc" }, // Curator first, then moderators, then members
            { joinedAt: "asc" },
          ],
        },
      },
    });

    if (!ring) {
      return {
        props: {
          siteConfig,
          ring: null,
          members: [],
          canManage: false,
          error: "ThreadRing not found",
        },
      };
    }

    // Curator (Ring Hub off) or the hub's owner (Ring Hub on and the hub
    // didn't answer), or an admin. See ring-owner.ts.
    const canManage = viewer?.role === 'admin' ||
      (!!viewer && (await ringOwnerSource(slug as string, viewer.id)) !== null);

    // Serialize the data
    const serializedMembers = ring.members.map(member => ({
      ...member,
      joinedAt: member.joinedAt.toISOString(),
    }));

    return {
      props: {
        siteConfig,
        ring: {
          id: ring.id,
          name: ring.name,
          slug: ring.slug,
          memberCount: ring.memberCount,
          curatorId: ring.curatorId,
        },
        members: await withHouseBadges(serializedMembers, viewer?.id),
        canManage,
      },
    };
  } catch (error: any) {
    console.error("Members page error:", error);
    return {
      props: {
        siteConfig,
        ring: null,
        members: [],
        canManage: false,
        error: "Failed to load ThreadRing",
      },
    };
  }
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
