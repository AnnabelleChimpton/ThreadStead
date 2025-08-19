import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
import { GetServerSideProps } from "next";
import { db } from "@/lib/db";

interface ThreadRingPageProps {
  siteConfig: SiteConfig;
  ring: ThreadRing | null;
  error?: string;
}

interface ThreadRing {
  id: string;
  name: string;
  slug: string;
  description?: string;
  joinType: string;
  visibility: string;
  memberCount: number;
  postCount: number;
  createdAt: string;
  curator: {
    id: string;
    handles: Array<{ handle: string; host: string }>;
    profile: {
      displayName?: string;
      avatarUrl?: string;
    };
  };
  members: Array<{
    id: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      handles: Array<{ handle: string; host: string }>;
      profile: {
        displayName?: string;
        avatarUrl?: string;
      };
    };
  }>;
}

export default function ThreadRingPage({ siteConfig, ring, error }: ThreadRingPageProps) {
  if (error || !ring) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="text-center py-8 text-red-600">
          {error || "ThreadRing not found"}
        </div>
      </Layout>
    );
  }

  const curatorHandle = ring.curator.handles.find(h => h.host === "local")?.handle || 
                       ring.curator.handles[0]?.handle || 
                       "unknown";

  return (
    <Layout siteConfig={siteConfig}>
      <div className="thread-module p-6 mb-6">
        <div className="mb-4">
          <h1 className="thread-headline text-3xl font-bold mb-2">{ring.name}</h1>
          {ring.description && (
            <p className="text-thread-sage leading-relaxed mb-3">
              {ring.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Curated by @{curatorHandle}</span>
            <span>•</span>
            <span>{ring.memberCount} member{ring.memberCount !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{ring.postCount} post{ring.postCount !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span className="capitalize">{ring.joinType} joining</span>
          </div>
        </div>
        <div className="thread-divider"></div>
        <div className="mt-6">
          <span className="thread-label">threadring • {ring.slug}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area - placeholder for posts */}
        <div className="lg:col-span-2">
          <div className="border border-black p-4 bg-white shadow-[2px_2px_0_#000]">
            <h2 className="text-xl font-bold mb-4">Recent Posts</h2>
            <div className="text-gray-600 text-center py-8">
              No posts yet. Posts from members will appear here.
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Ring Info */}
          <div className="border border-black p-4 bg-white shadow-[2px_2px_0_#000]">
            <h3 className="font-bold mb-3">Ring Info</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Created:</span>{" "}
                {new Date(ring.createdAt).toLocaleDateString()}
              </div>
              <div>
                <span className="font-semibold">Visibility:</span>{" "}
                <span className="capitalize">{ring.visibility}</span>
              </div>
              <div>
                <span className="font-semibold">Join Type:</span>{" "}
                <span className="capitalize">{ring.joinType}</span>
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="border border-black p-4 bg-white shadow-[2px_2px_0_#000]">
            <h3 className="font-bold mb-3">Members ({ring.memberCount})</h3>
            <div className="space-y-2">
              {ring.members.map((member) => {
                const memberHandle = member.user.handles.find(h => h.host === "local")?.handle || 
                                   member.user.handles[0]?.handle || 
                                   "unknown";
                const displayName = member.user.profile.displayName || memberHandle;
                
                return (
                  <div key={member.id} className="flex items-center gap-2 text-sm">
                    {member.user.profile.avatarUrl && (
                      <img 
                        src={member.user.profile.avatarUrl} 
                        alt={displayName}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="flex-1">{displayName}</span>
                    {member.role !== "member" && (
                      <span className="text-xs bg-yellow-200 px-2 py-1 rounded capitalize">
                        {member.role}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
        error: "Invalid ThreadRing URL",
      },
    };
  }

  try {
    const ring = await db.threadRing.findUnique({
      where: { slug },
      include: {
        curator: {
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
          error: "ThreadRing not found",
        },
      };
    }

    // Serialize the data for Next.js
    const serializedRing = {
      ...ring,
      createdAt: ring.createdAt.toISOString(),
      updatedAt: ring.updatedAt.toISOString(),
      members: ring.members.map(member => ({
        ...member,
        joinedAt: member.joinedAt.toISOString(),
      })),
    };

    return {
      props: {
        siteConfig,
        ring: serializedRing,
      },
    };
  } catch (error: any) {
    console.error("ThreadRing fetch error:", error);
    return {
      props: {
        siteConfig,
        ring: null,
        error: "Failed to load ThreadRing",
      },
    };
  }
};