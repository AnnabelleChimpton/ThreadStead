import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
import { GetServerSideProps } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { SITE_NAME } from "@/lib/site-config";
import { featureFlags } from "@/lib/feature-flags";
import { getRingHubClient } from "@/lib/ringhub-client";

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    handles: Array<{ handle: string; host: string }>;
    profile: {
      displayName?: string | null;
      avatarUrl?: string | null;
    };
  };
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
  error?: string;
}

export default function ThreadRingMembersPage({ 
  siteConfig, 
  ring, 
  members: initialMembers,
  canManage,
  error 
}: ThreadRingMembersPageProps) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [managing, setManaging] = useState<string | null>(null);

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
      const response = await fetch(`/api/threadrings/${ring.slug}/members/${userId}`, {
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

      alert(data.message);
    } catch (error: any) {
      console.error("Error updating role:", error);
      alert(error.message || "Failed to update role");
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

    if (!confirm(`Remove ${memberHandle} from ${ring.name}?`)) return;

    setManaging(userId);
    
    try {
      const response = await fetch(`/api/threadrings/${ring.slug}/members/${userId}`, {
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

      alert(data.message);
    } catch (error: any) {
      console.error("Error removing member:", error);
      alert(error.message || "Failed to remove member");
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
              onClick={() => router.push(`/threadrings/${ring.slug}`)}
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
                        {getMemberDisplayName(member)}
                      </div>
                      <div className="text-sm text-gray-600">
                        @{getMemberHandle(member)}
                        {" • "}
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Role Badge */}
                    <span className={`text-xs px-3 py-1 border border-black rounded ${
                      member.role === "curator" ? "bg-yellow-200" :
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
                        Ring owner
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
          const ringDescriptor = await client.getRing(slug as string);
          if (ringDescriptor) {
            // Get Ring Hub members
            const ringHubMembers = await client.getRingMembers(slug as string);
            
            // Check if viewer owns this Ring Hub ring locally
            let canManage = false;
            if (viewer) {
              const ownership = await db.ringHubOwnership.findUnique({
                where: { ringSlug: slug as string },
              });
              canManage = ownership?.ownerUserId === viewer.id;
            }

            // Convert Ring Hub members to local format
            // Note: Ring Hub members only have DIDs, so we can't show full user profiles
            // This is a limitation until we integrate user mapping
            const members = ringHubMembers.members.map((member, index) => ({
              id: member.actorDid,
              role: member.role,
              joinedAt: member.joinedAt || new Date().toISOString(),
              user: {
                id: member.actorDid,
                handles: [{ handle: member.actorDid.replace('did:key:', ''), host: 'ringhub' }],
                profile: {
                  displayName: `Ring Hub User`,
                  avatarUrl: null,
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
                members,
                canManage,
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

    // Check if viewer can manage (curator only)
    const canManage = viewer?.id === ring.curatorId;

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
        members: serializedMembers,
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