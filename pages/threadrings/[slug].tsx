import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
import { GetServerSideProps } from "next";
import { db } from "@/lib/db";
import PostItem, { Post } from "../../components/content/PostItem";
import ThreadRingStats from "../../components/ThreadRingStats";
import ThreadRingLineage from "../../components/ThreadRingLineage";
import RandomMemberDiscovery from "../../components/RandomMemberDiscovery";
import ThreadRingFeedScope from "../../components/ThreadRingFeedScope";
import ThreadRingActivePrompt from "../../components/ThreadRingActivePrompt";
import ThreadRing88x31Badge from "../../components/ThreadRing88x31Badge";
import { featureFlags } from "@/lib/feature-flags";
import { getRingHubClient } from "@/lib/ringhub-client";
import { transformRingDescriptorToThreadRing } from "@/lib/ringhub-transformers";
import Toast from "../../components/Toast";
import { useToast } from "../../hooks/useToast";
import { useCurrentUser } from "../../hooks/useCurrentUser";

// Helper function to count total descendants recursively
function countTotalDescendants(descendants: any[]): number {
  if (!Array.isArray(descendants)) return 0;
  let count = descendants.length; // Count direct children
  for (const descendant of descendants) {
    if (descendant.children && Array.isArray(descendant.children)) {
      count += countTotalDescendants(descendant.children); // Count nested descendants
    }
  }
  return count;
}

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
  curatorNote?: string;
  joinType: string;
  visibility: string;
  memberCount: number;
  postCount: number;
  createdAt: string;
  // Hierarchical fields for The Spool architecture
  parentId?: string | null;
  directChildrenCount?: number;
  totalDescendantsCount?: number;
  lineageDepth?: number;
  lineagePath?: string;
  isSystemRing?: boolean;
  currentPrompt?: string;
  // Badge
  badge?: {
    id: string;
    title: string;
    subtitle?: string;
    templateId?: string;
    backgroundColor: string;
    textColor: string;
    imageUrl?: string;
    isActive: boolean;
  };
  curator: {
    id: string;
    handles: Array<{ handle: string; host: string }>;
    profile: {
      displayName?: string;
      avatarUrl?: string;
    };
  } | null;
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

// Special component for The Spool landing page
function SpoolLandingPage({ ring, siteConfig }: { ring: ThreadRing; siteConfig: SiteConfig }) {
  const [showSpoolBadgeOptions, setShowSpoolBadgeOptions] = useState(false);
  const [lineageData, setLineageData] = useState({
    lineage: [],
    directChildrenCount: 0,
    totalDescendantsCount: 0,
    lineageDepth: 0,
    lineagePath: ""
  });
  const [lineageLoading, setLineageLoading] = useState(false);
  
  // Toast notifications
  const { toasts, showSuccess, hideToast } = useToast();
  
  // Fetch stats data for The Spool using Ring Hub stats endpoint
  useEffect(() => {
    if (!ring) return;
    
    const fetchStats = async () => {
      try {
        setLineageLoading(true);
        const response = await fetch(`/api/threadrings/stats`);
        
        if (response.ok) {
          const stats = await response.json();
          // Transform Ring Hub stats to lineage data format
          setLineageData({
            lineage: [], // Not used for Spool
            directChildrenCount: stats.totalRings - 1, // Total rings minus The Spool itself
            totalDescendantsCount: stats.totalRings, // All rings for total communities
            lineageDepth: 0,
            lineagePath: "Root"
          });
          console.log(`Loaded Ring Hub stats for ${ring.slug}:`, {
            totalRings: stats.totalRings,
            directChildren: stats.totalRings - 1,
            totalCommunities: stats.totalRings
          });
        } else {
          console.error('Failed to fetch Ring Hub stats:', response.status);
        }
      } catch (error) {
        console.error('Error fetching Ring Hub stats:', error);
      } finally {
        setLineageLoading(false);
      }
    };
    
    fetchStats();
  }, [ring]);

  return (
    <Layout siteConfig={siteConfig}>
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center py-12 mb-12">
          <div className="mb-6">
            <div className="text-6xl mb-4">🧵</div>
            <h1 className="text-5xl font-bold text-thread-pine mb-4">{ring.name}</h1>
            <p className="text-xl text-thread-sage max-w-2xl mx-auto leading-relaxed mb-6">
              {ring.description}
            </p>
            
            {/* Prominent Spool Badge */}
            {ring.badge && ring.badge.isActive && (
              <div className="bg-white border-2 border-thread-pine shadow-lg rounded-lg p-6 max-w-md mx-auto">
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    {ring.badge.imageUrl ? (
                      <div 
                        onClick={() => setShowSpoolBadgeOptions(!showSpoolBadgeOptions)}
                        className="cursor-pointer transform transition-transform hover:scale-105"
                        title="Click to show copy options"
                      >
                        <ThreadRing88x31Badge
                          templateId={ring.badge.templateId}
                          title={ring.badge.title}
                          subtitle={ring.badge.subtitle}
                          backgroundColor={ring.badge.backgroundColor}
                          textColor={ring.badge.textColor}
                          imageUrl={ring.badge.imageUrl}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-[88px] h-[31px] bg-gray-100 border border-gray-400 text-gray-600 text-xs">
                        No badge
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-bold text-thread-pine mb-2">🌐 The Spool Official Badge</div>
                  <p className="text-xs text-thread-sage mb-3">
                    {showSpoolBadgeOptions ? 
                      "The genesis badge representing the root of all ThreadRing communities" :
                      "Click the badge to get HTML code for your website!"
                    }
                  </p>
                  
                  {showSpoolBadgeOptions ? (
                    <div className="animate-in slide-in-from-top duration-200 bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="flex justify-center gap-2 mb-2">
                        <button 
                          onClick={() => {
                            const badgeHtml = `<a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/threadrings/${ring.slug}" target="_blank" rel="noopener"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" alt="${ring.badge?.title || ring.name}" width="88" height="31" style="border: 1px solid #ccc;" /></a>`;
                            navigator.clipboard.writeText(badgeHtml);
                            showSuccess('Spool badge HTML copied to clipboard!');
                          }}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                        >
                          📋 Copy HTML
                        </button>
                        <button 
                          onClick={() => {
                            const badgeUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/threadrings/${ring.slug}`;
                            navigator.clipboard.writeText(badgeUrl);
                            showSuccess('Spool URL copied to clipboard!');
                          }}
                          className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                        >
                          🔗 Copy Link
                        </button>
                        <button 
                          onClick={() => setShowSpoolBadgeOptions(false)}
                          className="text-xs bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition-colors"
                        >
                          ✕ Close
                        </button>
                      </div>
                      <p className="text-xs text-thread-sage">
                        Share The Spool&apos;s genesis badge on your website
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="border border-black bg-thread-cream shadow-[4px_4px_0_#000] p-6 text-center">
            <div className="text-3xl font-bold text-thread-pine mb-2">
              {lineageData.totalDescendantsCount || ring.totalDescendantsCount || 0}
            </div>
            <div className="text-thread-sage font-medium">Total Communities</div>
            <div className="text-sm text-thread-sage mt-1">
              All ThreadRings in existence
            </div>
          </div>
          
          <div className="border border-black bg-thread-cream shadow-[4px_4px_0_#000] p-6 text-center">
            <div className="text-3xl font-bold text-thread-pine mb-2">
              {lineageData.directChildrenCount || ring.directChildrenCount || 0}
            </div>
            <div className="text-thread-sage font-medium">Direct Descendants</div>
            <div className="text-sm text-thread-sage mt-1">
              Communities born from The Spool
            </div>
          </div>
          
          <div className="border border-black bg-thread-cream shadow-[4px_4px_0_#000] p-6 text-center">
            <div className="text-3xl font-bold text-thread-pine mb-2">∞</div>
            <div className="text-thread-sage font-medium">Lineage Depth</div>
            <div className="text-sm text-thread-sage mt-1">
              The root of all genealogy
            </div>
          </div>
        </div>

        {/* Curator's Note / Welcome Message */}
        {(ring.curatorNote || ring.currentPrompt) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-12">
            <div className="flex items-start">
              <div className="text-yellow-600 mr-3 text-xl">📌</div>
              <div>
                <p className="font-medium text-yellow-800 mb-2">Welcome to The Spool</p>
                <p className="text-yellow-700 leading-relaxed">
                  {ring.curatorNote || ring.currentPrompt}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Genealogy Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Genealogy Explorer */}
          <div className="border border-black bg-white shadow-[4px_4px_0_#000] p-6">
            <h2 className="text-2xl font-bold text-thread-pine mb-4 flex items-center">
              <span className="mr-2">🌳</span>
              Genealogy Explorer
            </h2>
            <p className="text-thread-sage mb-6">
              Explore the complete family tree of all ThreadRing communities. See how every ring traces its lineage back to The Spool.
            </p>
            
            <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 text-center mb-4">
              <div className="text-4xl mb-2">🌳</div>
              <p className="text-gray-700 font-medium">Interactive genealogy tree is now available!</p>
              <p className="text-sm text-gray-600 mt-1">Visualize the entire ThreadRing ecosystem</p>
            </div>
            
            <button 
              onClick={() => window.location.href = '/threadrings/genealogy'}
              className="w-full border border-black px-4 py-2 bg-green-100 hover:bg-green-200 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium"
            >
              🌳 Explore Family Tree
            </button>
          </div>

          {/* Community Discovery */}
          <div className="border border-black bg-white shadow-[4px_4px_0_#000] p-6">
            <h2 className="text-2xl font-bold text-thread-pine mb-4 flex items-center">
              <span className="mr-2">🔍</span>
              Discover Communities
            </h2>
            <p className="text-thread-sage mb-6">
              Browse all ThreadRing communities that have grown from The Spool. Find your people and join the conversation.
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => window.location.href = '/threadrings'}
                className="w-full border border-black px-4 py-2 bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium"
              >
                📍 Discover Communities
              </button>
              
              <button 
                onClick={() => window.location.href = '/threadrings/create'}
                className="w-full border border-black px-4 py-2 bg-green-100 hover:bg-green-200 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium"
              >
                ➕ Create New Community
              </button>
            </div>
          </div>
        </div>

        {/* About The Spool */}
        <div className="border border-black bg-thread-paper shadow-[4px_4px_0_#000] p-8 mb-12">
          <h2 className="text-2xl font-bold text-thread-pine mb-4 text-center">
            About The Spool
          </h2>
          <div className="max-w-3xl mx-auto text-thread-sage leading-relaxed space-y-4">
            <p>
              The Spool represents the symbolic origin of all ThreadRing communities. Unlike regular ThreadRings, 
              The Spool doesn&apos;t host posts or have traditional members - instead, it serves as the genealogical 
              root that connects every community in a unified family tree.
            </p>
            <p>
              Every ThreadRing community, whether created directly or forked from another, can trace its lineage 
              back to The Spool. This creates a rich genealogy that shows how communities evolve, split, and grow 
              over time.
            </p>
            <p>
              Think of The Spool as the trunk of a vast tree, with every ThreadRing as a branch that grows in its 
              own direction while staying connected to the whole.
            </p>
          </div>
        </div>

        {/* Technical Info (for admins/curious users) */}
        <div className="border border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <strong>System Information:</strong>
              <ul className="mt-1 space-y-1">
                <li>• System Ring: {ring.isSystemRing ? 'Yes' : 'No'}</li>
                <li>• Lineage Depth: {lineageData.lineageDepth || ring.lineageDepth || 0}</li>
                <li>• Created: {new Date(ring.createdAt).toLocaleDateString()}</li>
              </ul>
            </div>
            <div>
              <strong>Genealogy Stats:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Direct Children: {lineageData.directChildrenCount || ring.directChildrenCount || 0}</li>
                <li>• Total Descendants: {lineageData.totalDescendantsCount || ring.totalDescendantsCount || 0}</li>
                <li>• Lineage Path: {lineageData.lineagePath || ring.lineagePath || 'Root'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Toast Notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </Layout>
  );
}

export default function ThreadRingPage({ siteConfig, ring, error }: ThreadRingPageProps) {
  const router = useRouter();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [showBadgeOptions, setShowBadgeOptions] = useState(false);
  const [feedScope, setFeedScope] = useState<'current' | 'parent' | 'children' | 'family'>('current');
  const [ringInfoCollapsed, setRingInfoCollapsed] = useState(true);
  const [badgeInfoCollapsed, setBadgeInfoCollapsed] = useState(true);
  const [statsCollapsed, setStatsCollapsed] = useState(true);
  const [lineageCollapsed, setLineageCollapsed] = useState(true);
  const [membersCollapsed, setMembersCollapsed] = useState(true);
  const [discoveryCollapsed, setDiscoveryCollapsed] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [isPublicMemberInfo, setIsPublicMemberInfo] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [lineageData, setLineageData] = useState({
    lineage: [],
    directChildrenCount: 0,
    totalDescendantsCount: 0,
    lineageDepth: 0,
    lineagePath: ""
  });
  const [lineageLoading, setLineageLoading] = useState(false);
  const { user: currentUser } = useCurrentUser();
  
  // Toast notifications
  const { toasts, showError, showSuccess, showWarning, hideToast } = useToast();

  // Fetch members using user-authenticated API
  useEffect(() => {
    if (!ring) return;
    
    const fetchMembers = async () => {
      try {
        setMembersLoading(true);
        const response = await fetch(`/api/threadrings/${ring.slug}/members`);
        
        if (response.ok) {
          const data = await response.json();
          setMembers(data.members);
          setIsPublicMemberInfo(data.isPublicInfo || false);
          console.log(`Loaded ${data.members.length} members for ${ring.slug}` + (data.isPublicInfo ? ' (public info only)' : ''));
        } else {
          console.error('Failed to fetch members:', response.status);
          // Keep existing members if fetch fails
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        // Keep existing members if fetch fails
      } finally {
        setMembersLoading(false);
      }
    };

    // Always fetch members for Ring Hub rings to get proper user resolution
    if (featureFlags.ringhub()) {
      fetchMembers();
    } else if (ring.members && ring.members.length > 0) {
      // For non-Ring Hub rings, use the server-side members
      setMembers(ring.members);
    }
  }, [ring]);

  // Update membership status when members data or current user changes
  useEffect(() => {
    if (!currentUser || !members) {
      setIsMember(false);
      setCurrentUserRole(null);
      return;
    }

    // Find current user in members list
    const userMembership = members.find(member => member.userId === currentUser.id);
    
    if (userMembership) {
      setIsMember(true);
      setCurrentUserRole(userMembership.role);
      console.log(`User is a member with role: ${userMembership.role}`);
    } else {
      setIsMember(false);
      setCurrentUserRole(null);
      console.log(`User is not a member of ${ring?.slug}`);
    }
  }, [members, currentUser, ring?.slug]);

  // Fetch lineage data using user-authenticated API
  useEffect(() => {
    if (!ring) return;
    
    const fetchLineage = async () => {
      try {
        setLineageLoading(true);
        const response = await fetch(`/api/threadrings/${ring.slug}/lineage`);
        
        if (response.ok) {
          const data = await response.json();
          setLineageData(data);
          console.log(`Loaded lineage for ${ring.slug}${data.fullGenealogy ? ' [Full Genealogy Tree]' : ' [Public Lineage]'}:`, {
            lineageDepth: data.lineageDepth,
            childrenCount: data.directChildrenCount,
            authenticated: data.authenticated
          });
        } else {
          console.error('Failed to fetch lineage:', response.status);
        }
      } catch (error) {
        console.error('Error fetching lineage:', error);
      } finally {
        setLineageLoading(false);
      }
    };

    // Always fetch lineage for Ring Hub rings
    if (featureFlags.ringhub()) {
      fetchLineage();
    }
  }, [ring]);

  // Fetch posts using user-authenticated API
  useEffect(() => {
    if (!ring) return;
    
    const fetchPosts = async () => {
      try {
        setPostsLoading(true);
        setLoadError(null); // Clear previous errors
        const response = await fetch(`/api/threadrings/${ring.slug}/posts?scope=${feedScope}`);
        
        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts || []);
          setHasMore(data.hasMore || false);
          console.log(`Loaded ${data.posts?.length || 0} posts for ${ring.slug} (scope: ${feedScope})${data.enhanced ? ' [Enhanced Data]' : ' [Public Data]'}`);
        } else {
          console.error('Failed to fetch posts:', response.status);
          if (response.status === 403) {
            setLoadError("You don't have permission to view posts in this ThreadRing");
          } else {
            setLoadError("Failed to load posts");
          }
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
        setLoadError("Failed to load posts");
      } finally {
        setPostsLoading(false);
      }
    };

    // Always fetch posts for Ring Hub rings
    if (featureFlags.ringhub()) {
      fetchPosts();
    }
  }, [ring, feedScope]);

  // Check membership and ownership when ring loads
  useEffect(() => {
    if (!ring) return;
    checkMembership();
  }, [ring]);

  const checkMembership = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const authData = await response.json();
        if (authData.loggedIn && authData.user && ring) {
          const userId = authData.user.id;
          
          // Check Ring Hub ownership first (for rings that were forked/created via Ring Hub)
          try {
            const ownershipResponse = await fetch(`/api/threadrings/${ring.slug}/ownership`);
            if (ownershipResponse.ok) {
              const ownershipData = await ownershipResponse.json();
              if (ownershipData.isOwner || ownershipData.isCurator) {
                setIsMember(true);
                setCurrentUserRole("curator");
                console.log('User is owner/curator via:', ownershipData.ownershipSource);
                return;
              }
            }
          } catch (ownershipError) {
            console.warn('Error checking Ring Hub ownership:', ownershipError);
          }
          
          // Check if user is the local curator
          if (ring.curator && userId === ring.curator.id) {
            setIsMember(true);
            setCurrentUserRole("curator");
            return;
          }
          
          // Check if user is a member of this ring
          const member = members.find(m => m.user.id === userId);
          
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
        // Handle error gracefully with toast instead of throwing
        showError(data.error || "Failed to join ThreadRing");
        return;
      }

      // Update local state
      setIsMember(true);
      setCurrentUserRole("member");
      
      // Reload the page to get updated member list
      window.location.reload();
      
    } catch (error: any) {
      console.error("Error joining ThreadRing:", error);
      showError(error.message || "Failed to join ThreadRing");
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
        // Handle error gracefully with toast instead of throwing
        showError(data.error || "Failed to leave ThreadRing");
        return;
      }

      // Update local state
      setIsMember(false);
      setCurrentUserRole(null);
      
      // Show success message and reload
      showSuccess(data.message);
      setTimeout(() => window.location.reload(), 1000); // Brief delay to show the toast
      
    } catch (error: any) {
      console.error("Error leaving ThreadRing:", error);
      showError(error.message || "Failed to leave ThreadRing");
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

  // Check if this is The Spool and feature flag is enabled
  if (ring.isSystemRing && featureFlags.threadrings()) {
    return <SpoolLandingPage ring={ring} siteConfig={siteConfig} />;
  }

  const curatorHandle = ring.curator?.handles.find(h => h.host === "local")?.handle || 
                       ring.curator?.handles[0]?.handle || 
                       "unknown";

  return (
    <Layout siteConfig={siteConfig}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content area - posts feed */}
        <div className="lg:col-span-3">
          <div className="border border-black p-6 mb-6 bg-white shadow-[2px_2px_0_#000]" style={{ minWidth: 'auto' }}>
            <div className="mb-4">
              <div className="flex items-start justify-between gap-4 flex-wrap lg:flex-nowrap">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <h1 className="thread-headline text-3xl font-bold">{ring.name}</h1>
                    {ring.badge && ring.badge.isActive && (
                      <div className="flex-shrink-0">
                        <ThreadRing88x31Badge
                          templateId={ring.badge.templateId}
                          title={ring.badge.title}
                          subtitle={ring.badge.subtitle}
                          backgroundColor={ring.badge.backgroundColor}
                          textColor={ring.badge.textColor}
                          imageUrl={ring.badge.imageUrl}
                        />
                      </div>
                    )}
                  </div>
                  {ring.description && (
                    <p className="text-thread-sage leading-relaxed mb-3">
                      {ring.description}
                    </p>
                  )}
                  {ring.curatorNote && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3">
                      <div className="flex items-start">
                        <div className="text-yellow-600 mr-2">📌</div>
                        <div>
                          <p className="text-sm font-medium text-yellow-800 mb-1">Curator&apos;s Note</p>
                          <p className="text-sm text-yellow-700">{ring.curatorNote}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {ring.curator && (
                      <>
                        <span>Curated by @{curatorHandle}</span>
                        <span>•</span>
                      </>
                    )}
                    
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
                        {currentUserRole === "curator" && (
                          <button
                            onClick={() => router.push(`/threadrings/${ring.slug}/settings`)}
                            className="text-sm border border-black px-4 py-2 bg-blue-100 hover:bg-blue-200 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all"
                            title="Manage ThreadRing settings"
                          >
                            ⚙️ Settings
                          </button>
                        )}
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
          {/* Active Prompt/Challenge */}
          <ThreadRingActivePrompt 
            threadRingSlug={ring.slug}
            isMember={isMember}
          />

          {/* Feed Scope Selector */}
          {featureFlags.threadrings() && (ring.parentId || (lineageData.directChildrenCount || ring.directChildrenCount || 0) > 0) && (
            <ThreadRingFeedScope
              threadRingSlug={ring.slug}
              hasParent={!!ring.parentId}
              hasChildren={(lineageData.directChildrenCount || ring.directChildrenCount || 0) > 0}
              currentScope={feedScope}
              onScopeChange={(newScope) => setFeedScope(newScope)}
            />
          )}
          
          <div className="border border-black p-4 bg-white shadow-[2px_2px_0_#000]">
            <h2 className="text-xl font-bold mb-4">
              {feedScope === 'current' ? 'Recent Posts' :
               feedScope === 'parent' ? 'Posts from Parent Ring' :
               feedScope === 'children' ? 'Posts from Child Rings' :
               feedScope === 'family' ? 'Family Feed' : 'Recent Posts'}
            </h2>
            
            {postsLoading ? (
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
                    isOwner={currentUser?.id === post.author?.id}
                    onChanged={handlePostChanged}
                    threadRingContext={{ slug: ring.slug, name: ring.name }}
                    canModerateRing={currentUserRole === "curator" || currentUserRole === "moderator"}
                    currentUser={currentUser}
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
        <div className="lg:col-span-1 space-y-4">
          {/* Ring Info */}
          <div className="border border-black bg-white shadow-[2px_2px_0_#000]">
            <button
              onClick={() => setRingInfoCollapsed(!ringInfoCollapsed)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-bold">Ring Info</h3>
              <span className="text-sm">{ringInfoCollapsed ? '▼' : '▲'}</span>
            </button>
            {!ringInfoCollapsed && (
              <div className="px-4 pb-4 space-y-2 text-sm border-t border-gray-200">
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
            )}
          </div>

          {/* Official ThreadRing Badge */}
          {ring.badge && ring.badge.isActive && (
            <div className="border border-black bg-white shadow-[2px_2px_0_#000]">
              <button
                onClick={() => setBadgeInfoCollapsed(!badgeInfoCollapsed)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">🌐 Official Badge</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">88x31</span>
                </div>
                <span className="text-sm">{badgeInfoCollapsed ? '▼' : '▲'}</span>
              </button>
              {!badgeInfoCollapsed && (
                <div className="px-4 pb-4 border-t border-gray-200">
              
              <div className="text-center mb-3">
                {ring.badge.imageUrl ? (
                  <div 
                    onClick={() => setShowBadgeOptions(!showBadgeOptions)}
                    className="cursor-pointer transform transition-transform hover:scale-105 inline-block"
                    title="Click to show copy options"
                  >
                    <ThreadRing88x31Badge
                      templateId={ring.badge.templateId}
                      title={ring.badge.title}
                      subtitle={ring.badge.subtitle}
                      backgroundColor={ring.badge.backgroundColor}
                      textColor={ring.badge.textColor}
                      imageUrl={ring.badge.imageUrl}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-[88px] h-[31px] bg-gray-100 border border-gray-400 text-gray-600 text-xs mx-auto">
                    No badge
                  </div>
                )}
              </div>

              <p className="text-xs text-center text-gray-600 mb-3">
                {showBadgeOptions ? 
                  "Classic webring badge for your website" :
                  "Click badge to get HTML code"
                }
              </p>
              
              {showBadgeOptions && (
                <div className="animate-in slide-in-from-top duration-200">
                  <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-2">
                    <button 
                      onClick={() => {
                        const badgeHtml = `<a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/threadrings/${ring.slug}" target="_blank" rel="noopener"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" alt="${ring.badge?.title || ring.name}" width="88" height="31" style="border: 1px solid #ccc;" /></a>`;
                        navigator.clipboard.writeText(badgeHtml);
                        showSuccess('Badge HTML copied to clipboard!');
                      }}
                      className="w-full text-xs bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                      📋 Copy HTML Code
                    </button>
                    <button 
                      onClick={() => {
                        const badgeUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/threadrings/${ring.slug}`;
                        navigator.clipboard.writeText(badgeUrl);
                        showSuccess('ThreadRing URL copied to clipboard!');
                      }}
                      className="w-full text-xs bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors"
                    >
                      🔗 Copy ThreadRing Link
                    </button>
                    <button 
                      onClick={() => setShowBadgeOptions(false)}
                      className="w-full text-xs bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 transition-colors"
                    >
                      ✕ Close
                    </button>
                    <div className="text-xs text-gray-600 text-center pt-1">
                      <p>Embed the badge on your website to link back!</p>
                    </div>
                  </div>
                </div>
              )}
                </div>
              )}
            </div>
          )}

          {/* Random Member Discovery */}
          {featureFlags.threadrings() && ring.memberCount > 1 && (
            <div className="border border-black bg-white shadow-[2px_2px_0_#000]">
              <button
                onClick={() => setDiscoveryCollapsed(!discoveryCollapsed)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-bold">🎲 Discover Members</h3>
                <span className="text-sm">{discoveryCollapsed ? '▼' : '▲'}</span>
              </button>
              {!discoveryCollapsed && (
                <div className="border-t border-gray-200">
                  <RandomMemberDiscovery 
                    threadRingSlug={ring.slug}
                    threadRingName={ring.name}
                    enableLineageDiscovery={(lineageData.totalDescendantsCount || ring.totalDescendantsCount || 0) > 0 || (lineageData.lineageDepth || ring.lineageDepth || 0) > 0}
                  />
                </div>
              )}
            </div>
          )}

          {/* Members */}
          <div className="border border-black bg-white shadow-[2px_2px_0_#000]">
            <button
              onClick={() => setMembersCollapsed(!membersCollapsed)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-bold">👥 Members ({ring.memberCount || members.length})</h3>
                {membersLoading && <span className="text-xs text-gray-500">Loading...</span>}
              </div>
              <span className="text-sm">{membersCollapsed ? '▼' : '▲'}</span>
            </button>
            {!membersCollapsed && (
              <div className="px-4 pb-4 border-t border-gray-200">
                {isPublicMemberInfo && (
                  <div className="text-xs text-gray-500 mb-3">
                    Join to see all members
                  </div>
                )}
            <div className="space-y-2">
              {members.map((member) => {
                const memberHandle = member.user?.handles?.find((h: any) => h.host === "local")?.handle || 
                                   member.user?.handles?.[0]?.handle || 
                                   member.user?.id?.split(':').pop() || 
                                   "unknown";
                const displayName = member.user?.profile?.displayName || memberHandle;
                
                return (
                  <div key={member.id} className="flex items-center gap-2 text-sm">
                    {member.user?.profile?.avatarUrl && (
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
                    {isPublicMemberInfo && (
                      <span className="text-xs text-gray-400">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                );
              })}
              {members.length === 0 && !membersLoading && (
                <div className="text-sm text-gray-500 italic">
                  No members to display
                </div>
              )}
            </div>
              </div>
            )}
          </div>

          {/* Fork Lineage */}
          <div className="border border-black bg-white shadow-[2px_2px_0_#000]">
            <button
              onClick={() => setLineageCollapsed(!lineageCollapsed)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-bold">🌳 Fork Lineage</h3>
              <span className="text-sm">{lineageCollapsed ? '▼' : '▲'}</span>
            </button>
            {!lineageCollapsed && (
              <div className="border-t border-gray-200">
                <ThreadRingLineage 
                  threadRingSlug={ring.slug} 
                  ringName={ring.name}
                />
              </div>
            )}
          </div>

          {/* ThreadRing Statistics */}
          <div className="border border-black bg-white shadow-[2px_2px_0_#000]">
            <button
              onClick={() => setStatsCollapsed(!statsCollapsed)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-bold">📊 Statistics</h3>
              <span className="text-sm">{statsCollapsed ? '▼' : '▲'}</span>
            </button>
            {!statsCollapsed && (
              <div className="border-t border-gray-200">
                <ThreadRingStats threadRingSlug={ring.slug} />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Toast Notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => hideToast(toast.id)}
        />
      ))}
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
    let ring = null;

    // Use Ring Hub if enabled
    console.log('Environment NEXT_PUBLIC_USE_RING_HUB:', process.env.NEXT_PUBLIC_USE_RING_HUB);
    console.log('Ring Hub feature flag:', featureFlags.ringhub());
    if (featureFlags.ringhub()) {
      const client = getRingHubClient();
      console.log('Ring Hub client available:', !!client);
      if (client) {
        try {
          console.log('Fetching ring from Ring Hub:', slug);
          const ringDescriptor = await client.getRing(slug as string);
          console.log('Ring Hub response:', ringDescriptor ? 'found' : 'not found');
          if (ringDescriptor) {
            // Transform Ring Hub descriptor to expected format
            const transformedRing = transformRingDescriptorToThreadRing(ringDescriptor);
            console.log('Ring Hub descriptor curatorNotes:', ringDescriptor.curatorNotes);
            console.log('Transformed ring curatorNote:', transformedRing.curatorNote);
            // For The Spool, use Ring Hub stats for efficient counting
            let ringHubStats = null;
            let lineageData = null;
            
            if (slug === 'spool') {
              try {
                console.log('Fetching Ring Hub stats for Spool...');
                ringHubStats = await client.getStats();
                console.log('Ring Hub stats received:', ringHubStats);
              } catch (error) {
                console.error('Error fetching Ring Hub stats:', error);
              }
            }
            
            // For non-spool rings, fetch lineage data
            if (slug !== 'spool') {
              try {
                lineageData = await client.getRingLineage(slug as string);
              } catch (error) {
                console.error('Error fetching lineage from Ring Hub:', error);
              }
            }

            ring = {
              ...transformedRing,
              curator: null, // Ring Hub doesn't provide curator details
              members: [], // Members will be fetched client-side with user authentication
              parentId: null,
              // Use Ring Hub stats for Spool, lineage data for other rings
              directChildrenCount: slug === 'spool' 
                ? (ringHubStats ? ringHubStats.totalRings - 1 : 0) // Total rings minus The Spool itself for direct children
                : (lineageData?.descendants?.length || 0),
              totalDescendantsCount: slug === 'spool'
                ? (ringHubStats ? ringHubStats.totalRings : 0) // All rings for total communities
                : (lineageData ? countTotalDescendants(lineageData.descendants || []) : 0),
              lineageDepth: 0,
              lineagePath: "",
              isSystemRing: slug === 'spool'
            };
            console.log('Using Ring Hub data for ring:', ring.name, 'with lineage counts:', {
              directChildren: ring.directChildrenCount,
              totalDescendants: ring.totalDescendantsCount
            });
          }
        } catch (error) {
          console.error("Error fetching ring from Ring Hub:", error);
          // Fall through to local database as fallback
        }
      }
    }

    // Fallback to local database if Ring Hub is not available or failed
    if (!ring) {
      console.log('Falling back to local database for ring:', slug);
      ring = await db.threadRing.findUnique({
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
          badge: {
            select: {
              id: true,
              title: true,
              subtitle: true,
              templateId: true,
              backgroundColor: true,
              textColor: true,
              imageUrl: true,
              isActive: true,
            },
          },
        },
      });
    }

    if (!ring) {
      return {
        props: {
          siteConfig,
          ring: null,
          error: "ThreadRing not found",
        },
      };
    }

    // Serialize the data for Next.js - convert undefined to null for JSON serialization
    const serializedRing = JSON.parse(JSON.stringify({
      ...ring,
      createdAt: typeof ring.createdAt === 'string' ? ring.createdAt : ring.createdAt.toISOString(),
      updatedAt: typeof ring.updatedAt === 'string' ? ring.updatedAt : ring.updatedAt.toISOString(),
      members: ring.members.map(member => ({
        ...member,
        joinedAt: typeof member.joinedAt === 'string' ? member.joinedAt : member.joinedAt.toISOString(),
      })),
    }, (key, value) => value === undefined ? null : value));

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