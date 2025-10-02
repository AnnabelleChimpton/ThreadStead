import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/ui/layout/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import { db } from "@/lib/config/database/connection";
import PostItem from "../../components/core/content/PostItem";
import ThreadRingStats from "../../components/core/threadring/ThreadRingStats";
import ThreadRingLineage from "../../components/core/threadring/ThreadRingLineage";
import RandomMemberDiscovery from "../../components/shared/RandomMemberDiscovery";
import ThreadRingFeedScope from "../../components/core/threadring/ThreadRingFeedScope";
import ThreadRingActivePrompt from "../../components/core/threadring/ThreadRingActivePrompt";
import ThreadRing88x31Badge from "../../components/core/threadring/ThreadRing88x31Badge";
import { featureFlags } from "@/lib/utils/features/feature-flags";
import { getRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { transformRingDescriptorToThreadRing } from "@/lib/api/ringhub/ringhub-transformers";
import Toast from "../../components/ui/feedback/Toast";
import { useToast } from "../../hooks/useToast";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import WelcomeRingGuide from "../../components/features/onboarding/WelcomeRingGuide";
import { useWelcomeTracking } from "../../hooks/useWelcomeTracking";
import { useWelcomeRingTracking } from "../../hooks/useWelcomeRingTracking";
import { contentMetadataGenerator } from "@/lib/utils/metadata/content-metadata";

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
          // Ring Hub stats loaded successfully
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
      <div className="tr-spool-landing max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="tr-spool-hero text-center py-12 mb-12">
          <div className="tr-spool-header mb-6">
            <div className="tr-spool-icon text-6xl mb-4">🧵</div>
            <h1 className="tr-spool-title text-5xl font-bold text-thread-pine mb-4">{ring.name}</h1>
            <p className="tr-spool-description text-xl text-thread-sage max-w-2xl mx-auto leading-relaxed mb-6">
              {ring.description}
            </p>
            
            {/* Prominent Spool Badge */}
            {ring.badge && ring.badge.isActive && (
              <div className="tr-spool-badge-container bg-white border-2 border-thread-pine shadow-lg rounded-lg p-6 max-w-md mx-auto">
                <div className="tr-spool-badge-content text-center">
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
                            const badgeHtml = `<a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/tr/${ring.slug}" target="_blank" rel="noopener"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" alt="${ring.badge?.title || ring.name}" width="88" height="31" style="border: 1px solid #ccc;" /></a>`;
                            navigator.clipboard.writeText(badgeHtml);
                            showSuccess('Spool badge HTML copied to clipboard!');
                          }}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                        >
                          📋 Copy HTML
                        </button>
                        <button 
                          onClick={() => {
                            const badgeUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/tr/${ring.slug}`;
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
        <div className="tr-spool-stats grid md:grid-cols-3 gap-6 mb-12">
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

        {/* Ring Host&apos;s Note / Welcome Message */}
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
            
            <Link 
              href="/threadrings/genealogy"
              className="block w-full text-center border border-black px-4 py-2 bg-green-100 hover:bg-green-200 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium"
            >
              🌳 Explore Family Tree
            </Link>
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
                onClick={() => window.location.href = '/tr/spool/fork'}
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
  // Generate metadata for ThreadRing page
  const adaptedRing = ring ? {
    slug: ring.slug,
    name: ring.name,
    description: ring.description,
    curatorNote: ring.curatorNote,
    memberCount: ring.memberCount,
    postCount: ring.postCount,
    visibility: ring.visibility,
    curator: ring.curator ? {
      handle: ring.curator.handles.find(h => h.host === "local")?.handle || ring.curator.handles[0]?.handle || "unknown",
      displayName: ring.curator.profile?.displayName
    } : undefined,
    createdAt: ring.createdAt
  } : null;
  const ringMetadata = adaptedRing ? contentMetadataGenerator.generateThreadRingMetadata(adaptedRing) : null;

  const router = useRouter();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isMember, setIsMember] = useState(false);
  
  // Track welcome progress
  useWelcomeTracking();
  const { trackCommentCreated } = useWelcomeRingTracking(ring?.slug);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [showBadgeOptions, setShowBadgeOptions] = useState(false);
  const [feedScope, setFeedScope] = useState<'current' | 'parent' | 'children' | 'family'>('current');
  const [sidebarTab, setSidebarTab] = useState<'stats' | 'lineage' | 'discovery'>('stats');
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
          // Members data loaded successfully
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
      // User membership confirmed
    } else {
      setIsMember(false);
      setCurrentUserRole(null);
      // User is not a member
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
          // Lineage data loaded successfully
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
          // Posts data loaded successfully
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
                // User ownership confirmed
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
      
      // Track joining for Welcome Ring progress
      if (ring.slug === 'welcome') {
        const { updateWelcomeProgress } = await import('@/lib/welcome/progress');
        const { celebrateAction } = await import('@/lib/welcome/celebrations');
        updateWelcomeProgress({ joinedRing: true });
        celebrateAction('joinedRing');
        
        // Give time for the toast to show before reloading
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // Reload immediately for non-welcome rings
        window.location.reload();
      }
      
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
      ? "As Ring Host, you can only leave if you're the last member. Are you sure you want to leave this ThreadRing?"
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
        const prevPostCount = posts.reduce((total, post) => total + (post.commentCount || 0), 0);
        const newPostCount = data.posts.reduce((total: number, post: any) => total + (post.commentCount || 0), 0);
        
        // If comment count increased, track comment creation for Welcome Ring
        if (newPostCount > prevPostCount && ring.slug === 'welcome') {
          trackCommentCreated();
        }
        
        setPosts(data.posts);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Error refetching posts:", error);
    }
  };

  if (error || !ring) {
    return (
      <>
        <Head>
          <title>ThreadRing Not Found | ThreadStead</title>
          <meta name="description" content="The requested ThreadRing could not be found." />
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <Layout siteConfig={siteConfig}>
          <div className="text-center py-8 text-red-600">
            {error || "ThreadRing not found"}
          </div>
        </Layout>
      </>
    );
  }

  // Check if this is The Spool
  if (ring.isSystemRing) {
    return <SpoolLandingPage ring={ring} siteConfig={siteConfig} />;
  }

  const curatorHandle = ring.curator?.handles.find(h => h.host === "local")?.handle ||
                       ring.curator?.handles[0]?.handle ||
                       "unknown";

  return (
    <>
      <Head>
        {ringMetadata && (
          <>
            <title>{ringMetadata.title}</title>
            <meta name="description" content={ringMetadata.description} />
            {ringMetadata.keywords && (
              <meta name="keywords" content={ringMetadata.keywords.join(', ')} />
            )}
            <link rel="canonical" href={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}${ringMetadata.url}`} />
            <meta name="robots" content="index, follow" />

            {/* OpenGraph meta tags */}
            <meta property="og:title" content={ringMetadata.title} />
            <meta property="og:description" content={ringMetadata.description} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}${ringMetadata.url}`} />
            <meta property="og:site_name" content="ThreadStead" />
            <meta property="og:locale" content="en_US" />

            {/* Social media card meta tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={ringMetadata.title} />
            <meta name="twitter:description" content={ringMetadata.description} />

            {/* Structured data */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(ringMetadata.structuredData, null, 0)
              }}
            />
          </>
        )}
      </Head>

      <Layout siteConfig={siteConfig}>
      {/* Welcome Ring Guide - shows only on welcome ring */}
      {ring.slug === 'welcome' && (
        <WelcomeRingGuide ringSlug={ring.slug} viewer={currentUser} ring={ring} />
      )}
      
      <div className="tr-page-container grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area - posts feed */}
        <div className="tr-main-content lg:col-span-2">
          <div className="tr-header-card border border-black bg-white shadow-[3px_3px_0_#000]">
            <div className="p-6 border-b-2 border-gray-200">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="tr-title text-3xl sm:text-4xl font-bold text-thread-pine" title={ring.name}>
                  {ring.name}
                </h1>
                {ring.badge && ring.badge.isActive && (
                  <div className="tr-badge-wrapper flex-shrink-0 bg-white p-1 border border-gray-300 shadow-sm">
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
                <p className="tr-description text-gray-700 text-lg leading-relaxed mb-4">
                  {ring.description}
                </p>
              )}

              <div className="tr-meta-info flex flex-wrap items-center gap-3 text-sm text-gray-600">
                {ring.curator && (
                  <>
                    <span className="tr-curator-info font-medium">Hosted by @{curatorHandle}</span>
                    <span className="text-gray-400">•</span>
                  </>
                )}
                <span className="tr-member-count">{ring.memberCount} member{ring.memberCount !== 1 ? 's' : ''}</span>
                <span className="text-gray-400">•</span>
                <span className="tr-post-count">{ring.postCount} post{ring.postCount !== 1 ? 's' : ''}</span>
                <span className="text-gray-400">•</span>
                <span className="tr-join-type capitalize">{ring.joinType} joining</span>
              </div>
            </div>

            {ring.curatorNote && (
              <div className="tr-curator-note bg-gradient-to-r from-yellow-50 to-orange-50 border-b-2 border-gray-200 p-4">
                <div className="tr-curator-note-content flex items-start gap-3">
                  <div className="tr-curator-note-icon text-2xl">📌</div>
                  <div className="tr-curator-note-text flex-1">
                    <p className="tr-curator-note-label text-sm font-bold text-yellow-900 mb-1">Ring Host&apos;s Note</p>
                    <p className="tr-curator-note-message text-sm text-yellow-800 leading-relaxed">{ring.curatorNote}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="tr-footer px-6 py-3 bg-gray-50">
              <span className="tr-slug text-xs text-gray-500 font-mono">threadring/{ring.slug}</span>
            </div>
          </div>

          {/* Active Prompt/Challenge */}
          <div className="mt-6">
            <ThreadRingActivePrompt
              threadRingSlug={ring.slug}
              isMember={isMember}
            />
          </div>

          {/* Feed Scope Selector */}
          {(ring.parentId || (lineageData.directChildrenCount || ring.directChildrenCount || 0) > 0) && (
            <div className="mt-6">
              <ThreadRingFeedScope
                threadRingSlug={ring.slug}
                hasParent={!!ring.parentId}
                hasChildren={(lineageData.directChildrenCount || ring.directChildrenCount || 0) > 0}
                currentScope={feedScope}
                onScopeChange={(newScope) => setFeedScope(newScope)}
              />
            </div>
          )}

          <div className="tr-posts-container mt-6 border border-black bg-white shadow-[2px_2px_0_#000]">
            <div className="border-b-2 border-gray-200 px-6 py-4 bg-gray-50">
              <h2 className="tr-posts-title text-xl font-bold">
                {feedScope === 'current' ? 'Recent Posts' :
                 feedScope === 'parent' ? 'Posts from Parent Ring' :
                 feedScope === 'children' ? 'Posts from Child Rings' :
                 feedScope === 'family' ? 'Family Feed' : 'Recent Posts'}
              </h2>
            </div>

            <div className="p-6">
              {postsLoading ? (
                <div className="tr-posts-loading text-gray-600 text-center py-8">
                  Loading posts...
                </div>
              ) : loadError ? (
                <div className="tr-posts-error text-red-600 text-center py-8">
                  {loadError}
                </div>
              ) : posts.length === 0 ? (
                <div className="tr-posts-empty text-gray-600 text-center py-12">
                  <div className="text-4xl mb-3">📝</div>
                  <p className="font-medium">No posts yet</p>
                  <p className="text-sm mt-1">Posts from members will appear here</p>
                </div>
              ) : (
                <div className="tr-posts-list space-y-6">
                {posts.map((post, index) => (
                  <PostItem
                    key={post.id}
                    post={post}
                    isOwner={currentUser?.id === post.author?.id}
                    onChanged={handlePostChanged}
                    threadRingContext={{ slug: ring.slug, name: ring.name }}
                    canModerateRing={currentUserRole === "curator" || currentUserRole === "moderator"}
                    currentUser={currentUser}
                    userRole={currentUserRole as any}
                    isUserMember={isMember}
                    viewContext="ring"
                  />
                ))}
                
                  {hasMore && (
                    <div className="text-center pt-6 mt-6 border-t border-gray-200">
                      <button
                        className="border border-black px-6 py-2 bg-white hover:bg-yellow-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all text-sm font-medium"
                        onClick={() => {
                          // TODO: Implement load more functionality
                          // Loading more posts
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
        </div>

        {/* Sidebar */}
        <div className="tr-sidebar lg:col-span-1 space-y-4">
          {/* Primary Actions - Always Visible */}
          <div className="tr-sidebar-section tr-primary-actions border border-black bg-white shadow-[2px_2px_0_#000] p-4">
            {isMember ? (
              <div className="space-y-3">
                {/* Member Status */}
                <div className="tr-member-status bg-green-50 px-3 py-2 border border-green-300 text-center">
                  <span className="tr-role-indicator font-semibold text-green-800">
                    {currentUserRole === "curator" ? "👑 Ring Host" :
                     currentUserRole === "moderator" ? "🛡️ Moderator" : "👤 Member"}
                  </span>
                </div>

                {/* Primary Action Buttons */}
                <button
                  onClick={() => router.push(`/neighborhood/ring/${ring.slug}`)}
                  className="w-full border border-black px-4 py-2.5 bg-yellow-200 hover:bg-yellow-300 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium"
                  title="Explore member homes in Ring Streets"
                >
                  🏘️ Ring Neighborhood
                </button>

                {/* Ring Host Settings Button */}
                {currentUserRole === "curator" && (
                  <button
                    onClick={() => router.push(`/tr/${ring.slug}/settings`)}
                    className="w-full border border-black px-4 py-2 bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all"
                  >
                    ⚙️ Manage Settings
                  </button>
                )}

                {/* Secondary Actions */}
                <div className="pt-2 border-t border-gray-200 space-y-2">
                  <button
                    onClick={() => router.push(`/tr/${ring.slug}/fork`)}
                    className="w-full text-sm border border-black px-3 py-2 bg-white hover:bg-purple-50 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all"
                  >
                    🍴 Branch This Ring
                  </button>

                  <button
                    onClick={handleLeave}
                    disabled={joining}
                    className="w-full text-sm border border-black px-3 py-2 bg-white hover:bg-red-50 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                    title={currentUserRole === "curator"
                      ? "As Ring Host, you must transfer ownership first (unless you're the only member)"
                      : "Leave this Ring"}
                  >
                    {joining ? "Leaving..." : "Leave Ring"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Join Button for Non-Members */}
                {ring.joinType === "open" ? (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full border border-black px-4 py-3 bg-yellow-200 hover:bg-yellow-300 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg join-button"
                  >
                    {joining ? "Joining..." : "Join Ring"}
                  </button>
                ) : ring.joinType === "invite" ? (
                  <div className="bg-gray-100 px-4 py-3 border border-gray-400 text-center font-medium">
                    🔒 Invite Only
                  </div>
                ) : ring.joinType === "closed" ? (
                  <div className="bg-red-100 px-4 py-3 border border-red-400 text-center font-medium">
                    🚫 Closed to New Members
                  </div>
                ) : null}

                {/* Secondary Actions for Non-Members */}
                <div className="pt-2 border-t border-gray-200 space-y-2">
                  {ring.visibility !== "private" && (
                    <button
                      onClick={() => router.push(`/neighborhood/ring/${ring.slug}`)}
                      className="w-full text-sm border border-black px-3 py-2 bg-white hover:bg-yellow-50 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all"
                      title="Explore member homes in Ring Streets"
                    >
                      🏘️ Explore Homes
                    </button>
                  )}

                  {ring.visibility !== "private" && (
                    <button
                      onClick={() => router.push(`/tr/${ring.slug}/fork`)}
                      className="w-full text-sm border border-black px-3 py-2 bg-white hover:bg-purple-50 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all"
                    >
                      🍴 Branch This Ring
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Official ThreadRing Badge - Always Visible */}
          {ring.badge && ring.badge.isActive && (
            <div className="border border-black bg-gradient-to-br from-blue-50 to-purple-50 shadow-[2px_2px_0_#000] p-4">
              <div className="flex items-center justify-center mb-3">
                <div className="bg-white p-2 border border-gray-300 shadow-sm">
                  {ring.badge.imageUrl ? (
                    <div
                      onClick={() => setShowBadgeOptions(!showBadgeOptions)}
                      className="cursor-pointer transform transition-transform hover:scale-110"
                      title="Click for embed code"
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
              </div>

              <div className="text-center mb-2">
                <div className="text-xs font-bold text-gray-700 mb-1">🌐 Official Badge</div>
                <p className="text-xs text-gray-600">
                  {showBadgeOptions ? "Classic webring badge" : "Click for embed code"}
                </p>
              </div>

              {showBadgeOptions && (
                <div className="animate-in slide-in-from-top duration-200 space-y-2 mt-3">
                  <button
                    onClick={() => {
                      const badgeHtml = `<a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/tr/${ring.slug}" target="_blank" rel="noopener"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" alt="${ring.badge?.title || ring.name}" width="88" height="31" style="border: 1px solid #ccc;" /></a>`;
                      navigator.clipboard.writeText(badgeHtml);
                      showSuccess('Badge HTML copied!');
                    }}
                    className="w-full text-xs bg-blue-600 text-white px-3 py-2 border border-black shadow-[1px_1px_0_#000] hover:bg-blue-700 transition-colors font-medium"
                  >
                    📋 Copy HTML
                  </button>
                  <button
                    onClick={() => {
                      const badgeUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/tr/${ring.slug}`;
                      navigator.clipboard.writeText(badgeUrl);
                      showSuccess('URL copied!');
                    }}
                    className="w-full text-xs bg-green-600 text-white px-3 py-2 border border-black shadow-[1px_1px_0_#000] hover:bg-green-700 transition-colors font-medium"
                  >
                    🔗 Copy Link
                  </button>
                  <button
                    onClick={() => setShowBadgeOptions(false)}
                    className="w-full text-xs bg-white px-3 py-2 border border-black shadow-[1px_1px_0_#000] hover:bg-gray-100 transition-colors"
                  >
                    ✕ Close
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Member Preview - Always Visible */}
          <div className="border border-black bg-white shadow-[2px_2px_0_#000] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">👥 Members ({ring.memberCount})</h3>
              {isMember && currentUserRole === "curator" && (
                <button
                  onClick={() => router.push(`/tr/${ring.slug}/members`)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Manage
                </button>
              )}
            </div>

            {membersLoading ? (
              <div className="text-xs text-gray-500">Loading...</div>
            ) : (
              <>
                {/* Avatar Grid - First 8 members */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {members.slice(0, 8).map((member) => {
                    const memberHandle = member.user?.handles?.find((h: any) => h.host === "local")?.handle ||
                                       member.user?.handles?.[0]?.handle ||
                                       "unknown";
                    const displayName = member.user?.profile?.displayName || memberHandle;

                    return (
                      <div
                        key={member.id}
                        className="relative group"
                        title={displayName}
                      >
                        {member.user?.profile?.avatarUrl ? (
                          <img
                            src={member.user.profile.avatarUrl}
                            alt={displayName}
                            className="w-full aspect-square rounded border border-gray-300 hover:border-black transition-colors"
                          />
                        ) : (
                          <div className="w-full aspect-square rounded border border-gray-300 bg-gray-100 flex items-center justify-center text-xs">
                            {displayName[0]?.toUpperCase()}
                          </div>
                        )}
                        {member.role === "curator" && (
                          <div className="absolute -top-1 -right-1 text-xs">👑</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {ring.memberCount > 8 && (
                  <div className="text-xs text-gray-600 text-center">
                    +{ring.memberCount - 8} more members
                  </div>
                )}

                {isPublicMemberInfo && (
                  <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 border border-gray-200">
                    Join to see all members
                  </div>
                )}
              </>
            )}
          </div>

          {/* Ring Info & Insights - Tabbed Interface */}
          <div className="border border-black bg-white shadow-[2px_2px_0_#000]">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-300">
              <button
                onClick={() => setSidebarTab('stats')}
                className={`flex-1 px-3 py-2 text-sm font-medium border-r border-gray-300 transition-colors ${
                  sidebarTab === 'stats'
                    ? 'bg-yellow-100 text-black'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                📊 Stats
              </button>
              <button
                onClick={() => setSidebarTab('lineage')}
                className={`flex-1 px-3 py-2 text-sm font-medium border-r border-gray-300 transition-colors ${
                  sidebarTab === 'lineage'
                    ? 'bg-yellow-100 text-black'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                🌳 Tree
              </button>
              <button
                onClick={() => setSidebarTab('discovery')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  sidebarTab === 'discovery'
                    ? 'bg-yellow-100 text-black'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                🎲 Discover
              </button>
            </div>

            {/* Tab Content */}
            <div className={sidebarTab === 'discovery' ? '' : 'p-4'}>
              {sidebarTab === 'stats' && (
                <div className="-m-4">
                  <ThreadRingStats threadRingSlug={ring.slug} className="border-none shadow-none" />
                </div>
              )}

              {sidebarTab === 'lineage' && (
                <div className="-m-4">
                  <ThreadRingLineage
                    threadRingSlug={ring.slug}
                    ringName={ring.name}
                    className="border-none shadow-none"
                  />
                </div>
              )}

              {sidebarTab === 'discovery' && ring.memberCount > 1 && (
                <div className="-m-4 -mt-0">
                  <RandomMemberDiscovery
                    threadRingSlug={ring.slug}
                    threadRingName={ring.name}
                    enableLineageDiscovery={(lineageData.totalDescendantsCount || ring.totalDescendantsCount || 0) > 0 || (lineageData.lineageDepth || ring.lineageDepth || 0) > 0}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Quick Info - Always Visible */}
          <div className="border border-black bg-gray-50 shadow-[2px_2px_0_#000] p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span className="font-medium">{new Date(ring.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Visibility:</span>
              <span className="font-medium capitalize">{ring.visibility}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Join Type:</span>
              <span className="font-medium capitalize">{ring.joinType}</span>
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
    </>
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
    // Ring Hub feature checks
    if (featureFlags.ringhub()) {
      const client = getRingHubClient();
      // Ring Hub client check
      if (client) {
        try {
          // Fetching ring from Ring Hub
          const ringDescriptor = await client.getRing(slug as string);
          // Ring Hub response received
          if (ringDescriptor) {
            // Transform Ring Hub descriptor to expected format
            const transformedRing = transformRingDescriptorToThreadRing(ringDescriptor);
            // Ring transformation complete
            // For The Spool, use Ring Hub stats for efficient counting
            let ringHubStats = null;
            let lineageData = null;
            
            if (slug === 'spool') {
              try {
                // Fetching Ring Hub stats for Spool
                ringHubStats = await client.getStats();
                // Ring Hub stats received
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
            // Using Ring Hub data with lineage counts
          }
        } catch (error) {
          console.error("Error fetching ring from Ring Hub:", error);
          // Fall through to local database as fallback
        }
      }
    }

    // Fallback to local database if Ring Hub is not available or failed
    if (!ring) {
      // Falling back to local database
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