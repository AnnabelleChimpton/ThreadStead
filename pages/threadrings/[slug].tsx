import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
import { GetServerSideProps } from "next";
import { db } from "@/lib/db";
import PostItem, { Post } from "../../components/content/PostItem";

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
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!ring) return;
    
    // Check if current user is a member
    checkMembership();
    
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/threadrings/${ring.slug}/posts`);
        
        if (!response.ok) {
          if (response.status === 403) {
            setLoadError("You don't have permission to view posts in this ThreadRing");
          } else {
            setLoadError("Failed to load posts");
          }
          return;
        }
        
        const data = await response.json();
        setPosts(data.posts);
        setHasMore(data.hasMore);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setLoadError("Failed to load posts");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [ring]);

  const checkMembership = async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const userData = await response.json();
        if (userData && ring) {
          // Check if user is a member of this ring
          const member = ring.members.find(m => m.user.id === userData.id);
          if (member) {
            setIsMember(true);
            setCurrentUserRole(member.role);
          }
        }
      }
    } catch (error) {
      console.error("Error checking membership:", error);
    }
  };

  const handleJoin = async () => {
    if (!ring) return;
    
    try {
      setJoining(true);
      
      const response = await fetch(`/api/threadrings/${ring.slug}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join ThreadRing");
      }

      // Update local state
      setIsMember(true);
      setCurrentUserRole("member");
      
      // Reload the page to get updated member list
      window.location.reload();
      
    } catch (error: any) {
      console.error("Error joining ThreadRing:", error);
      alert(error.message || "Failed to join ThreadRing");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!ring) return;
    
    const confirmMessage = currentUserRole === "curator" 
      ? "As curator, you can only leave if you're the last member. Are you sure you want to leave this ThreadRing?"
      : "Are you sure you want to leave this ThreadRing? Your posts will remain associated with it.";
    
    if (!confirm(confirmMessage)) return;
    
    try {
      setJoining(true); // Reuse the loading state
      
      const response = await fetch(`/api/threadrings/${ring.slug}/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to leave ThreadRing");
      }

      // Update local state
      setIsMember(false);
      setCurrentUserRole(null);
      
      // Show success message and reload
      alert(data.message);
      window.location.reload();
      
    } catch (error: any) {
      console.error("Error leaving ThreadRing:", error);
      alert(error.message || "Failed to leave ThreadRing");
    } finally {
      setJoining(false);
    }
  };

  const handlePostChanged = async () => {
    // Refetch posts when a post is updated/deleted
    if (!ring) return;
    
    try {
      const response = await fetch(`/api/threadrings/${ring.slug}/posts`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Error refetching posts:", error);
    }
  };

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
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
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
            
            {/* Join/Member Status Button */}
            <div className="flex-shrink-0">
              {isMember ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-sm bg-green-200 px-4 py-2 border border-black rounded">
                      {currentUserRole === "curator" ? "Curator" : 
                       currentUserRole === "moderator" ? "Moderator" : "Member"}
                    </div>
                    <button
                      onClick={handleLeave}
                      disabled={joining}
                      className="text-sm border border-black px-4 py-2 bg-white hover:bg-red-100 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title={currentUserRole === "curator" 
                        ? "As curator, you must transfer ownership first (unless you're the only member)" 
                        : "Leave this ThreadRing"}
                    >
                      {joining ? "..." : "Leave"}
                    </button>
                  </div>
                  <button
                    onClick={() => router.push(`/threadrings/${ring.slug}/fork`)}
                    className="text-sm border border-black px-4 py-2 bg-purple-100 hover:bg-purple-200 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all"
                    title="Create your own version of this ThreadRing"
                  >
                    🍴 Fork ThreadRing
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {ring.joinType === "open" ? (
                    <button
                      onClick={handleJoin}
                      disabled={joining}
                      className="border border-black px-6 py-2 bg-yellow-200 hover:bg-yellow-300 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {joining ? "Joining..." : "Join ThreadRing"}
                    </button>
                  ) : ring.joinType === "invite" ? (
                    <div className="text-sm bg-gray-200 px-4 py-2 border border-black rounded">
                      Invite Only
                    </div>
                  ) : ring.joinType === "closed" ? (
                    <div className="text-sm bg-red-200 px-4 py-2 border border-black rounded">
                      Closed
                    </div>
                  ) : null}
                  
                  {/* Fork button for non-members (if ring is public/unlisted) */}
                  {ring.visibility !== "private" && (
                    <button
                      onClick={() => router.push(`/threadrings/${ring.slug}/fork`)}
                      className="text-sm border border-black px-4 py-2 bg-purple-100 hover:bg-purple-200 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all"
                      title="Create your own version of this ThreadRing"
                    >
                      🍴 Fork ThreadRing
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="thread-divider"></div>
        <div className="mt-6">
          <span className="thread-label">threadring • {ring.slug}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area - posts feed */}
        <div className="lg:col-span-2">
          <div className="border border-black p-4 bg-white shadow-[2px_2px_0_#000]">
            <h2 className="text-xl font-bold mb-4">Recent Posts</h2>
            
            {loading ? (
              <div className="text-gray-600 text-center py-8">
                Loading posts...
              </div>
            ) : loadError ? (
              <div className="text-red-600 text-center py-8">
                {loadError}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-gray-600 text-center py-8">
                No posts yet. Posts from members will appear here.
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post, index) => (
                  <PostItem
                    key={post.id}
                    post={post}
                    isOwner={false} // We'll need to determine this based on current user
                    onChanged={handlePostChanged}
                  />
                ))}
                
                {hasMore && (
                  <div className="text-center py-4">
                    <button 
                      className="border border-black px-4 py-2 bg-white hover:bg-yellow-100 shadow-[2px_2px_0_#000] text-sm"
                      onClick={() => {
                        // TODO: Implement load more functionality
                        console.log("Load more posts");
                      }}
                    >
                      Load More Posts
                    </button>
                  </div>
                )}
              </div>
            )}
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