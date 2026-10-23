import { getSiteBaseUrl } from '@/lib/config/site-url';
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Link from "next/link";
import PageMeta from "@/components/ui/layout/PageMeta";
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
import ThreadRingAboutWidget from "../../components/core/threadring/ThreadRingAboutWidget";
import { featureFlags } from "@/lib/utils/features/feature-flags";
import { calendarDate } from "@/lib/utils/dates";
import { getRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { raceHubCall, HUB_TIMEOUT } from "@/lib/api/ringhub/ringhub-ssr";
import { transformRingDescriptorToThreadRing } from "@/lib/api/ringhub/ringhub-transformers";
import { usernameFromHandle } from "@/lib/domain/notifications/links";
import UserQuickView from "../../components/ui/feedback/UserQuickView";
import ExternalUserPopup from "../../components/ui/feedback/ExternalUserPopup";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";
import EmptyState from "@/components/ui/feedback/EmptyState";
import ErrorDisplay from "@/components/ui/feedback/ErrorDisplay";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import WelcomeRingGuide from "../../components/features/onboarding/WelcomeRingGuide";
import { useWelcomeTracking } from "../../hooks/useWelcomeTracking";
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { useWelcomeRingTracking } from "../../hooks/useWelcomeRingTracking";
import { contentMetadataGenerator } from "@/lib/utils/metadata/content-metadata";
import { PixelIcon } from '@/components/ui/PixelIcon';
import Button from '@/components/ui/Button';
import ButtonLink, { buttonClasses } from '@/components/ui/ButtonLink';
import { serializeJsonLd } from "@/lib/utils/sanitization/json-ld";
import StripBuilder from "@/components/features/rings/StripBuilder";
import { cameFromSite } from "@/lib/rings/sites";
import { ringFeedUrl } from "@/lib/feeds/urls";

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
  /** A member's own site the visitor came from, through its ring strip's badge (?from=). */
  cameFrom?: { id: string; url: string; name: string } | null;
}

interface ThreadRing {
  id: string;
  name: string;
  slug: string;
  description?: string;

  curatorNote?: string;
  bannerUrl?: string;
  themeColor?: string;
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
  const [stripOpen, setStripOpen] = useState(false);
  const { user: spoolViewer } = useCurrentUser();
  const [lineageData, setLineageData] = useState({
    lineage: [],
    directChildrenCount: 0,
    totalDescendantsCount: 0,
    siblingsCount: 0,
    lineageDepth: 0,
    lineagePath: ""
  });
  const [lineageLoading, setLineageLoading] = useState(false);

  // Toast notifications
  const { showSuccess } = useToast();

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
            siblingsCount: 0, // The Spool has no siblings
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
    <Layout siteConfig={siteConfig} fullWidth={true}>
      <div className="tr-spool-landing max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="tr-spool-hero text-center py-12 mb-12">
          <div className="tr-spool-header mb-6">
                        <h1 className="tr-spool-title text-5xl font-bold text-thread-pine mb-4">{ring.name}</h1>
            <p className="tr-spool-description text-xl text-thread-sage max-w-2xl mx-auto leading-relaxed mb-6">
              {ring.description}
            </p>

            {/* Prominent Spool Badge */}
            {ring.badge && ring.badge.isActive && (
              <div className="tr-spool-badge-container thread-module max-w-md mx-auto">
                <div className="tr-spool-badge-content text-center">
                  <div className="flex justify-center mb-3">
                    <div
                      onClick={() => setShowSpoolBadgeOptions(!showSpoolBadgeOptions)}
                      className="cursor-pointer"
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
                  </div>
                  <div className="text-sm font-bold text-thread-pine mb-2 flex items-center justify-center gap-1"><PixelIcon name="map" size={16} /> The Spool Official Badge</div>
                  <p className="text-xs text-thread-sage mb-3">
                    {showSpoolBadgeOptions ?
                      "The genesis badge representing the root of all ThreadRing communities" :
                      "Click the badge to get HTML code for your website!"
                    }
                  </p>

                  {showSpoolBadgeOptions ? (
                    <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3 mb-3">
                      <div className="flex justify-center gap-2 mb-2">
                        {ring.visibility === "public" && (
                          <Button
                            variant="secondary"
                            onClick={() => setStripOpen(true)}
                            className="thread-button-secondary text-xs flex items-center justify-center gap-1"
                          >
                            <PixelIcon name="clipboard" size={12} /> Get a strip
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const badgeUrl = `${getSiteBaseUrl()}/tr/${ring.slug}`;
                            navigator.clipboard.writeText(badgeUrl);
                            showSuccess('Spool URL copied to clipboard!');
                          }}
                          className="thread-button-secondary text-xs flex items-center justify-center gap-1"
                        >
                          <PixelIcon name="link" size={12} /> Copy Link
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setShowSpoolBadgeOptions(false)}
                          className="thread-button-secondary text-xs flex items-center justify-center gap-1"
                        >
                          <PixelIcon name="close" size={12} /> Close
                        </Button>
                      </div>
                      <p className="text-xs text-thread-sage">
                        Share The Spool&apos;s genesis badge on your website
                      </p>
                      <StripBuilder isOpen={stripOpen} onClose={() => setStripOpen(false)} ring={ring} signedIn={!!spoolViewer} />
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="tr-spool-stats grid md:grid-cols-2 gap-6 mb-12">
          <div className="thread-module text-center">
            <div className="text-3xl font-bold text-thread-pine mb-2">
              {lineageData.totalDescendantsCount || ring.totalDescendantsCount || 0}
            </div>
            <div className="text-thread-sage font-medium">Total Communities</div>
            <div className="text-sm text-thread-sage mt-1">
              All ThreadRings in existence
            </div>
          </div>

          <div className="thread-module text-center">
            <div className="text-3xl font-bold text-thread-pine mb-2">
              {lineageData.directChildrenCount || ring.directChildrenCount || 0}
            </div>
            <div className="text-thread-sage font-medium">Direct Descendants</div>
            <div className="text-sm text-thread-sage mt-1">
              Communities born from The Spool
            </div>
          </div>
        </div>

        {/* Ring Host&apos;s Note / Welcome Message */}
        {(ring.curatorNote || ring.currentPrompt) && (
          <div className="border-l-4 border-nb-lav pl-4 py-2 mb-12">
            <div className="flex items-start">
              <div>
                <p className="font-medium text-nb-ink mb-2">Welcome to The Spool</p>
                <p className="text-nb-ink leading-relaxed">
                  {ring.curatorNote || ring.currentPrompt}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Genealogy Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Genealogy Explorer */}
          <div className="thread-module">
            <h2 className="thread-headline text-2xl font-bold mb-4">Genealogy Explorer
            </h2>
            <p className="text-thread-sage mb-6">
              Explore the complete family tree of all ThreadRing communities. See how every ring traces its lineage back to The Spool.
            </p>

            <Link
              href="/threadrings/genealogy"
              className="thread-button btn btn--primary w-full flex items-center justify-center gap-2"
            >
              Explore Family Tree
            </Link>
          </div>

          {/* Community Discovery */}
          <div className="thread-module">
            <h2 className="thread-headline text-2xl font-bold mb-4">Discover Communities
            </h2>
            <p className="text-thread-sage mb-6">
              Browse all ThreadRing communities that have grown from The Spool. Find your people and join the conversation.
            </p>

            <div className="space-y-3">
              <Button
                variant="secondary"
                onClick={() => window.location.href = '/threadrings'}
                className="thread-button-secondary w-full flex items-center justify-center gap-2"
              >
                <PixelIcon name="gps" size={16} /> Discover Communities
              </Button>

              <Button
                onClick={() => window.location.href = '/tr/spool/fork'}
                className="thread-button w-full flex items-center justify-center gap-2"
              >
                <PixelIcon name="plus" size={16} /> Create New Community
              </Button>
            </div>
          </div>
        </div>

        {/* About The Spool */}
        <div className="thread-module mb-12">
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
        <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4 text-sm text-nb-ink">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <strong>System Information:</strong>
              <ul className="mt-1 space-y-1">
                <li>• System Ring: {ring.isSystemRing ? 'Yes' : 'No'}</li>
                <li>• Lineage Depth: {lineageData.lineageDepth || ring.lineageDepth || 0}</li>
                <li>• Created: {calendarDate(ring.createdAt)}</li>
              </ul>
            </div>
            <div>
              <strong>Genealogy Stats:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Direct Descendants: {lineageData.directChildrenCount || ring.directChildrenCount || 0}</li>
                <li>• Total Descendants: {lineageData.totalDescendantsCount || ring.totalDescendantsCount || 0}</li>
                <li>• Lineage Path: {lineageData.lineagePath || ring.lineagePath || 'Root'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function ThreadRingPage({ siteConfig, ring, error, cameFrom = null }: ThreadRingPageProps) {
  // Generate metadata for ThreadRing page
  const adaptedRing = ring ? {
    slug: ring.slug,
    name: ring.name,
    description: ring.description,

    curatorNote: ring.curatorNote,
    bannerUrl: ring.bannerUrl,
    themeColor: ring.themeColor,
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
  // A new badge upload is a new file name, so previews cached elsewhere refresh
  const badgeFile = ring?.badge?.imageUrl?.startsWith('http') ? ring.badge.imageUrl.split('/').pop() : undefined;
  const shareImage = ring
    ? `${getSiteBaseUrl()}/api/share/ring/${ring.slug}.png${badgeFile ? `?v=${encodeURIComponent(badgeFile)}` : ''}`
    : undefined;
  const feedUrl = ring?.visibility === 'public' ? ringFeedUrl(ring.slug) : undefined;

  const router = useRouter();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [joining, setJoining] = useState(false);

  // Track welcome progress
  useWelcomeTracking();
  const { trackCommentCreated } = useWelcomeRingTracking(ring?.slug);
  const [showBadgeOptions, setShowBadgeOptions] = useState(false);
  const [stripOpen, setStripOpen] = useState(false);
  // Settings → Your sites links here with ?strip=<site id> to open the strip builder
  useEffect(() => {
    if (ring?.visibility === "public" && typeof router.query.strip === "string") setStripOpen(true);
  }, [ring?.visibility, router.query.strip]);
  const [feedScope, setFeedScope] = useState<'current' | 'parent' | 'children' | 'siblings' | 'family'>('current');
  const [sidebarTab, setSidebarTab] = useState<'stats' | 'lineage' | 'discovery'>('stats');
  const [showSidebarModal, setShowSidebarModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  // Which ring `members` came from, so a previous ring's list can't set the viewer's role here.
  const [membersSlug, setMembersSlug] = useState<string | null>(null);
  // Curator access from the access check (admin, ring owner, local curator), tagged with its ring.
  const [curatorAccessSlug, setCuratorAccessSlug] = useState<string | null>(null);
  // Set by join/leave until the page reloads.
  const [membershipOverride, setMembershipOverride] = useState<{ slug: string; role: string | null } | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  // An open hub invite for the viewer, tagged with its ring. Accepting is joining.
  const [pendingInvite, setPendingInvite] = useState<{
    slug: string;
    inviterName: string | null;
  } | null>(null);
  const [isPublicMemberInfo, setIsPublicMemberInfo] = useState(false);
  const [selectedMemberUsername, setSelectedMemberUsername] = useState<string | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [externalUserData, setExternalUserData] = useState<{
    displayName: string;
    actorDid: string;
    role: string;
    joinedAt: string;
    profileUrl?: string;
    avatarUrl?: string;
  } | null>(null);
  const [isExternalPopupOpen, setIsExternalPopupOpen] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  // Where the next hub page starts (the API's nextOffset; it counts PostRefs, not shown posts)
  const [nextOffset, setNextOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lineageData, setLineageData] = useState({
    lineage: [],
    directChildrenCount: 0,
    totalDescendantsCount: 0,
    siblingsCount: 0,
    lineageDepth: 0,
    lineagePath: ""
  });
  const [lineageLoading, setLineageLoading] = useState(false);
  const { user: currentUser } = useCurrentUser();

  // The viewer's role is derived, never stored: the access check and the members
  // list are separate inputs, so whichever request lands last can't overwrite the other.
  const listedMember = currentUser && ring && membersSlug === ring.slug
    ? members.find(member => member.userId === currentUser.id)
    : undefined;
  const currentUserRole: string | null =
    ring && membershipOverride?.slug === ring.slug
      ? membershipOverride.role
      : ring && curatorAccessSlug === ring.slug
        ? "curator"
        : listedMember?.role ?? null;
  const isMember = currentUserRole !== null;
  const hasInvite = !!ring && ring.joinType === "invite" && pendingInvite?.slug === ring.slug;

  // Toast notifications
  const { showError, showSuccess, showWarning } = useToast();
  const confirm = useConfirm();

  // Detect if viewport is mobile (< 1024px)
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    // Check on mount
    checkIsMobile();

    // Check on resize
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Lock body scroll when mobile sidebar modal is open
  useEffect(() => {
    if (showSidebarModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showSidebarModal]);

  // Close mobile modal when window is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && showSidebarModal) {
        setShowSidebarModal(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showSidebarModal]);

  // Handle swipe-down gesture to close bottom sheet
  useEffect(() => {
    if (!isMobile || !showSidebarModal) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // Only handle touches on the bottom sheet content
      if (target.closest('.mobile-bottom-sheet')) {
        const bottomSheet = document.querySelector('.mobile-bottom-sheet');
        const scrollContainer = bottomSheet?.querySelector('.bottom-sheet-content');

        // Only allow swipe if at top of scroll
        if (scrollContainer && scrollContainer.scrollTop === 0) {
          startY = e.touches[0].clientY;
          isDragging = true;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;

      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      // Only allow downward swipes
      if (deltaY > 0) {
        const bottomSheet = document.querySelector('.mobile-bottom-sheet');
        if (bottomSheet) {
          (bottomSheet as HTMLElement).style.transform = `translateY(${deltaY}px)`;
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;

      const deltaY = currentY - startY;
      const bottomSheet = document.querySelector('.mobile-bottom-sheet');

      if (bottomSheet) {
        // If swiped down more than 100px, close the sheet
        if (deltaY > 100) {
          setShowSidebarModal(false);
        }

        // Reset transform
        (bottomSheet as HTMLElement).style.transform = '';
      }

      isDragging = false;
      startY = 0;
      currentY = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, showSidebarModal]);

  // Invite-only ring: has someone invited the viewer? (The hub checks again on join.)
  useEffect(() => {
    if (!ring || ring.joinType !== "invite" || !currentUser) return;
    let cancelled = false;
    const slug = ring.slug;
    fetch(`/api/threadrings/${encodeURIComponent(slug)}/my-invite`)
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (cancelled || !data?.invite) return;
        const inviter = data.invite.inviter;
        setPendingInvite({ slug, inviterName: inviter?.displayName || usernameFromHandle(inviter?.handle) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ring, currentUser]);

  // Fetch members using user-authenticated API
  useEffect(() => {
    if (!ring) return;
    let cancelled = false;

    const fetchMembers = async () => {
      try {
        setMembersLoading(true);
        const response = await fetch(`/api/threadrings/${ring.slug}/members`);

        if (response.ok) {
          const data = await response.json();
          if (cancelled) return;
          setMembers(data.members);
          setMembersSlug(ring.slug);
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
        if (!cancelled) setMembersLoading(false);
      }
    };

    // Always fetch members for Ring Hub rings to get proper user resolution
    if (featureFlags.ringhub()) {
      fetchMembers();
    } else if (ring.members && ring.members.length > 0) {
      // For non-Ring Hub rings, use the server-side members
      setMembers(ring.members);
      setMembersSlug(ring.slug);
    }

    return () => { cancelled = true; };
  }, [ring]);

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
          setNextOffset(data.nextOffset ?? (data.posts?.length || 0));
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

  // Check curator access (admin, ring owner, local curator) when ring loads.
  // Plain membership roles come from the members list above.
  useEffect(() => {
    if (!ring) return;
    let cancelled = false;

    const checkCuratorAccess = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) return;
        const authData = await response.json();
        if (cancelled || !authData.loggedIn || !authData.user) return;

        // Treat admin as curator for UI purposes
        if (authData.user.role === 'admin') {
          setCuratorAccessSlug(ring.slug);
          return;
        }

        // Check Ring Hub ownership first (for rings that were forked/created via Ring Hub)
        try {
          const ownershipResponse = await fetch(`/api/threadrings/${ring.slug}/ownership`);
          if (ownershipResponse.ok) {
            const ownershipData = await ownershipResponse.json();
            if (cancelled) return;
            if (ownershipData.isOwner || ownershipData.isCurator) {
              setCuratorAccessSlug(ring.slug);
              return;
            }
          }
        } catch (ownershipError) {
          console.warn('Error checking Ring Hub ownership:', ownershipError);
        }

        // Local curator, Ring Hub off only: a hub ring's local row names
        // whoever posted there first, not its owner.
        if (!cancelled && !featureFlags.ringhub() && ring.curator && authData.user.id === ring.curator.id) {
          setCuratorAccessSlug(ring.slug);
        }
      } catch (error) {
        console.error("Error checking membership:", error);
      }
    };

    checkCuratorAccess();
    return () => { cancelled = true; };
  }, [ring]);

  const handleJoin = async () => {
    if (!ring) return;

    try {
      setJoining(true);

      const response = await csrfFetch(`/api/threadrings/${ring.slug}/join`, {
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
      setMembershipOverride({ slug: ring.slug, role: "member" });

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

    const ok = await confirm({
      title: "Leave this ThreadRing?",
      message: currentUserRole === "curator"
        ? "As Ring Host, you can only leave if you're the last member."
        : "Your posts will remain associated with it.",
      confirmText: "Leave ring",
      variant: "danger",
    });
    if (!ok) return;

    try {
      setJoining(true); // Reuse the loading state

      const response = await csrfFetch(`/api/threadrings/${ring.slug}/leave`, {
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
      setMembershipOverride({ slug: ring.slug, role: null });

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
        setNextOffset(data.nextOffset ?? data.posts.length);
      }
    } catch (error) {
      console.error("Error refetching posts:", error);
    }
  };

  // The next page of the hub feed, added under what's already shown
  const loadMorePosts = async () => {
    if (!ring || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(
        `/api/threadrings/${ring.slug}/posts?scope=${feedScope}&offset=${nextOffset}`
      );
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = await response.json();
      setPosts((shown) => {
        const seen = new Set(shown.map((post) => post.id));
        return [...shown, ...(data.posts || []).filter((post: any) => !seen.has(post.id))];
      });
      setHasMore(data.hasMore || false);
      setNextOffset(data.nextOffset ?? nextOffset + (data.posts?.length || 0));
    } catch (error) {
      console.error("Error loading more posts:", error);
      showError("Couldn't load more posts. Try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  if (error || !ring) {
    return (
      <>
        <PageMeta title="Ring not found" noIndex />
        <Layout siteConfig={siteConfig} fullWidth={true}>
          <div className="max-w-2xl mx-auto py-8 px-4">
            <ErrorDisplay title={error || "ThreadRing not found"} actionLabel="Browse rings" actionHref="/threadrings" />
          </div>
        </Layout>
      </>
    );
  }

  // Check if this is The Spool
  if (ring.isSystemRing) {
    return (
      <>
        <PageMeta title={ring.name} description={ringMetadata?.description} path={`/tr/${ring.slug}`} />
        <SpoolLandingPage ring={ring} siteConfig={siteConfig} />
      </>
    );
  }

  const curatorHandle = ring.curator?.handles.find(h => h.host === "local")?.handle ||
    ring.curator?.handles[0]?.handle ||
    "unknown";

  return (
    <>
      {ringMetadata && (
        <PageMeta
          title={ringMetadata.title}
          description={ringMetadata.description}
          path={ringMetadata.url}
          // The ring's badge, big (pages/api/share/ring/[file].ts)
          image={shareImage ? { url: shareImage, width: 1200, height: 630, alt: `The ${ring.name} ring's badge` } : undefined}
        >
          {feedUrl && (
            <link rel="alternate" type="application/rss+xml" title={`${ring.name} ring posts`} href={feedUrl} />
          )}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: serializeJsonLd(ringMetadata.structuredData)
            }}
          />
        </PageMeta>
      )}

      {ring.themeColor && (
        <style jsx global>{`
          :root {
            --ring-theme-color: ${ring.themeColor};
          }
          .text-thread-pine {
            color: var(--ring-theme-color) !important;
          }
          .bg-thread-pine {
            background-color: var(--ring-theme-color) !important;
          }
          .border-thread-pine {
            border-color: var(--ring-theme-color) !important;
          }
        `}</style>
      )}

      <Layout siteConfig={siteConfig} fullWidth={true}>
        {/* Welcome Ring Guide - shows only on welcome ring */}
        {ring.slug === 'welcome' && (
          <WelcomeRingGuide ringSlug={ring.slug} viewer={currentUser} ring={ring} />
        )}

        {cameFrom && (
          <div className="mx-0 sm:mx-4 lg:mx-6 mb-4 px-4 py-2 bg-thread-paper border border-thread-sage/40 rounded-cozy text-sm text-nb-ink flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              You came from{' '}
              <a href={cameFrom.url} rel="ugc" className="font-semibold underline">{cameFrom.name}</a>
            </span>
            <span aria-hidden="true">·</span>
            <a href={cameFrom.url} rel="ugc" className="underline">back to it</a>
            <span aria-hidden="true">·</span>
            <a href={`/ring/${encodeURIComponent(ring.slug)}/next?from=${encodeURIComponent(cameFrom.id)}`} className="underline">keep walking →</a>
          </div>
        )}

        <div className="tr-page-container grid grid-cols-1 lg:grid-cols-3 gap-6 px-0 sm:px-4 lg:px-6">
          {/* Main content area - posts feed */}
          <div className="tr-main-content col-span-1 lg:col-span-2">
            <div className="tr-header-card bg-thread-paper rounded-cozy shadow-cozy border border-thread-sage/30 overflow-hidden">
              {ring.bannerUrl && (
                <div className="w-full h-32 sm:h-48 relative bg-thread-cream border-b border-thread-sage/20">
                  <img
                    src={ring.bannerUrl}
                    alt={`${ring.name} banner`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-3 sm:p-6 border-b border-thread-sage/20">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h1 className="tr-title text-3xl sm:text-4xl font-bold text-thread-pine min-w-0" title={ring.name}>
                    {ring.name}
                  </h1>
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



                <div className="tr-meta-info flex flex-wrap items-center gap-3 text-sm text-nb-ink-mid">
                  {ring.curator && (
                    <>
                      <span className="tr-curator-info font-medium">Hosted by @{curatorHandle}</span>
                      <span className="text-nb-ink-mid">•</span>
                    </>
                  )}
                  <span className="tr-member-count">{ring.memberCount} member{ring.memberCount !== 1 ? 's' : ''}</span>
                  <span className="text-nb-ink-mid">•</span>
                  <span className="tr-post-count">{ring.postCount} post{ring.postCount !== 1 ? 's' : ''}</span>
                  <span className="text-nb-ink-mid">•</span>
                  <span className="tr-join-type capitalize">{ring.joinType} joining</span>
                </div>
              </div>



              <div className="tr-footer px-3 sm:px-6 py-3 border-t-2 border-dotted border-nb-ink-mid/30">
                <span className="tr-slug text-xs text-nb-ink-mid font-mono">threadring/{ring.slug}</span>
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
            {(ring.parentId || (lineageData.directChildrenCount || ring.directChildrenCount || 0) > 0 || (lineageData.siblingsCount || 0) > 0) && (
              <div className="mt-6">
                <ThreadRingFeedScope
                  threadRingSlug={ring.slug}
                  hasParent={!!ring.parentId}
                  hasChildren={(lineageData.directChildrenCount || ring.directChildrenCount || 0) > 0}
                  hasSiblings={(lineageData.siblingsCount || 0) > 0}
                  currentScope={feedScope}
                  onScopeChange={(newScope) => setFeedScope(newScope)}
                />
              </div>
            )}

            {isMember && (
              <div className="mt-6 lg:hidden">
                <Link
                  href={`/post/new?threadRing=${encodeURIComponent(ring.slug)}`}
                  className="thread-button btn btn--primary w-full block text-center no-underline"
                >
                  <PixelIcon name="edit" size={16} className="inline-block align-[-3px] mr-1.5" />Write in this ring
                </Link>
              </div>
            )}

            <div className="mt-6">

              {postsLoading ? (
                <LoadingSpinner message="Loading posts..." className="tr-posts-loading py-8 px-3" />
              ) : loadError ? (
                <ErrorDisplay title={loadError} className="tr-posts-error" />
              ) : posts.length === 0 ? (
                <EmptyState
                  variant="plain"
                  className="tr-posts-empty py-12 px-3"
                  title="No posts yet"
                  description={isMember ? (
                    <Link href={`/post/new?threadRing=${encodeURIComponent(ring.slug)}`}>Write the first one</Link>
                  ) : (
                    "Posts from members will appear here"
                  )}
                />
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
                    <div className="text-center pt-6 mt-6">
                      <button
                        className="bg-thread-paper border border-thread-sage/30 px-6 py-2 rounded-cozy shadow-cozy-sm hover:shadow-cozy transition-all text-sm font-medium"
                        onClick={loadMorePosts}
                        disabled={loadingMore}
                      >
                        {loadingMore ? "Loading..." : "Load More Posts"}
                      </button>
                    </div>
                  )}

                  {feedUrl && (
                    <p className="tr-feed-link text-sm opacity-80">
                      Follow this ring in your feed reader: <a href={feedUrl} className="underline">RSS</a>
                    </p>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Sidebar - Hidden on mobile, visible on desktop */}
          <div className="tr-sidebar hidden lg:block lg:col-span-1 space-y-4">
            {/* About Widget - Community Hub Feature */}
            <ThreadRingAboutWidget
              description={ring.description}
              curatorNote={ring.curatorNote}
            />
            {/* Primary Actions - Always Visible */}
            <div className="tr-sidebar-section tr-primary-actions bg-thread-paper rounded-cozy shadow-cozy-sm border border-thread-sage/30 p-3 sm:p-4">
              {isMember ? (
                <div className="space-y-3">
                  {/* Member Status */}
                  <div className="tr-member-status badge badge--butter block px-3 py-2 text-center">
                    <span className="tr-role-indicator font-semibold text-nb-ink flex items-center justify-center gap-1">
                      {currentUserRole === "curator" ? <><PixelIcon name="trophy" size={14} /> Ring Host</> :
                        currentUserRole === "moderator" ? <><PixelIcon name="shield" size={14} /> Moderator</> : <><PixelIcon name="user" size={14} /> Member</>}
                    </span>
                  </div>

                  {/* Primary Action Buttons */}
                  <Link
                    href={`/post/new?threadRing=${encodeURIComponent(ring.slug)}`}
                    className="thread-button btn btn--primary w-full block text-center no-underline"
                  >
                    <PixelIcon name="edit" size={16} className="inline-block align-[-3px] mr-1.5" />Write in this ring
                  </Link>

                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/neighborhood/ring/${ring.slug}`)}
                    className="thread-button-secondary w-full flex items-center justify-center gap-2"
                    title="Explore member homes in Ring Streets"
                  >
                    <PixelIcon name="buildings" size={16} /> Ring Neighborhood
                  </Button>

                  {/* Ring Host Settings Button */}
                  {currentUserRole === "curator" && (
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/tr/${ring.slug}/settings`)}
                      className="thread-button-secondary w-full flex items-center justify-center gap-2"
                    >
                      <PixelIcon name="sliders" size={16} /> Manage Settings
                    </Button>
                  )}

                  {/* Secondary Actions */}
                  <div className="pt-2 border-t-2 border-dotted border-nb-ink-mid/30 space-y-2">
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/tr/${ring.slug}/fork`)}
                      className="thread-button-secondary w-full flex items-center justify-center gap-2"
                    >
                      <PixelIcon name="external-link" size={14} /> Branch This Ring
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={handleLeave}
                      disabled={joining}
                      className="thread-button-secondary w-full flex items-center justify-center gap-2"
                      title={currentUserRole === "curator"
                        ? "As Ring Host, you must transfer ownership first (unless you're the only member)"
                        : "Leave this Ring"}
                    >
                      {joining ? "Leaving..." : "Leave Ring"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Join Button for Non-Members */}
                  {ring.joinType === "open" ? (
                    <Button
                      onClick={handleJoin}
                      disabled={joining}
                      className="thread-button w-full flex items-center justify-center gap-2"
                    >
                      {joining ? "Joining..." : "Join Ring"}
                    </Button>
                  ) : hasInvite ? (
                    <div className="space-y-2">
                      <p className="text-sm text-center m-0">
                        {pendingInvite?.inviterName
                          ? <><span className="font-semibold">{pendingInvite.inviterName}</span> invited you to this ring.</>
                          : "You're invited to this ring."}
                      </p>
                      <Button
                        onClick={handleJoin}
                        disabled={joining}
                        className="thread-button w-full flex items-center justify-center gap-2"
                      >
                        {joining ? "Joining..." : "Accept invite"}
                      </Button>
                    </div>
                  ) : ring.joinType === "invite" ? (
                    <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md px-4 py-3 text-center font-medium flex items-center justify-center gap-2">
                      <PixelIcon name="lock" size={16} /> Invite Only
                    </div>
                  ) : ring.joinType === "closed" ? (
                    <div className="border-2 border-nb-rose rounded-md px-4 py-3 text-center font-medium text-nb-rose-ink flex items-center justify-center gap-2">
                      <PixelIcon name="alert" size={16} /> Closed to New Members
                    </div>
                  ) : null}

                  {/* Secondary Actions for Non-Members */}
                  <div className="pt-2 border-t-2 border-dotted border-nb-ink-mid/30 space-y-2">
                    {ring.visibility !== "private" && (
                      <Button
                        variant="secondary"
                        onClick={() => router.push(`/neighborhood/ring/${ring.slug}`)}
                        className="thread-button-secondary w-full flex items-center justify-center gap-2"
                        title="Explore member homes in Ring Streets"
                      >
                        <PixelIcon name="buildings" size={14} /> Explore Homes
                      </Button>
                    )}

                    {ring.visibility !== "private" && (
                      <Button
                        variant="secondary"
                        onClick={() => router.push(`/tr/${ring.slug}/fork`)}
                        className="thread-button-secondary w-full flex items-center justify-center gap-2"
                      >
                        <PixelIcon name="external-link" size={14} /> Branch This Ring
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {ring.visibility === "public" && (
              <div className="widget-container bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy-sm p-4">
                <div className="text-sm font-bold text-nb-ink mb-1">Members&apos; own sites</div>
                <p className="text-xs text-nb-ink-mid mb-3">
                  Members can make their own site, out on the web, their stop in this ring. Everyone else&apos;s stop is their pixel home.
                </p>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/tr/${ring.slug}/sites`} variant="secondary" size="sm" className="thread-button-secondary text-xs flex-1 text-center">
                    All the stops
                  </ButtonLink>
                  <a href={`/ring/${encodeURIComponent(ring.slug)}/random`} className={`${buttonClasses("secondary", "sm")} thread-button-secondary text-xs flex-1 text-center`}>
                    Random stop
                  </a>
                </div>
                {!(ring.badge && ring.badge.isActive) && (
                  <Button
                    variant="secondary"
                    onClick={() => setStripOpen(true)}
                    className="thread-button-secondary text-xs w-full mt-2 flex items-center justify-center gap-1"
                  >
                    <PixelIcon name="clipboard" size={12} /> Get a strip for your site
                  </Button>
                )}
              </div>
            )}

            {/* Official ThreadRing Badge - Always Visible */}
            {ring.badge && ring.badge.isActive && (
              <div className="widget-container bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy-sm p-4">
                <div className="flex items-center justify-center mb-3">
                  <div
                    onClick={() => setShowBadgeOptions(!showBadgeOptions)}
                    className="cursor-pointer"
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
                </div>

                <div className="text-center mb-2">
                  <div className="text-xs font-bold text-nb-ink mb-1 flex items-center justify-center gap-1"><PixelIcon name="map" size={12} /> Official Badge</div>
                  <p className="text-xs text-nb-ink-mid">
                    {showBadgeOptions ? "Classic webring badge" : "Click for embed code"}
                  </p>
                </div>

                {showBadgeOptions && (
                  <div className="space-y-2 mt-3">
                    {ring.visibility === "public" && (
                      <Button
                        variant="secondary"
                        onClick={() => setStripOpen(true)}
                        className="thread-button-secondary text-xs w-full flex items-center justify-center gap-1"
                      >
                        <PixelIcon name="clipboard" size={12} /> Get a strip for your site
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const badgeUrl = `${getSiteBaseUrl()}/tr/${ring.slug}`;
                        navigator.clipboard.writeText(badgeUrl);
                        showSuccess('URL copied!');
                      }}
                      className="thread-button-secondary text-xs w-full flex items-center justify-center gap-1"
                    >
                      <PixelIcon name="link" size={12} /> Copy Link
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setShowBadgeOptions(false)}
                      className="thread-button-secondary text-xs w-full flex items-center justify-center gap-1"
                    >
                      <PixelIcon name="close" size={12} /> Close
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Member Preview - Always Visible */}
            <div className="bg-thread-paper rounded-cozy shadow-cozy-sm border border-thread-sage/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-1"><PixelIcon name="users" size={14} /> Members ({ring.memberCount})</h3>
                {isMember && currentUserRole === "curator" && (
                  <button
                    onClick={() => router.push(`/tr/${ring.slug}/members`)}
                    className="text-xs"
                  >
                    Manage
                  </button>
                )}
              </div>

              {membersLoading ? (
                <LoadingSpinner size="sm" layout="row" className="justify-start" />
              ) : (
                <>
                  {/* Avatar Grid - First 8 members */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {members.slice(0, 8).map((member) => {
                      const memberHandle = member.user?.handles?.find((h: any) => h.host === "local")?.handle ||
                        member.user?.handles?.[0]?.handle ||
                        "unknown";
                      const displayName = member.user?.profile?.displayName || member.user?.displayName || memberHandle;

                      // Detect if this is an external user
                      // More reliable: Check if userId is a DID (external) vs UUID (local)
                      const isExternal = member.userId?.startsWith('did:');

                      const handleMemberClick = () => {
                        if (isExternal) {
                          // External user - show limited info popup
                          setExternalUserData({
                            displayName: displayName,
                            actorDid: member.userId || "unknown",
                            role: member.role || "member",
                            joinedAt: member.joinedAt || new Date().toISOString(),
                            profileUrl: member.user?.profileUrl,
                            avatarUrl: member.user?.profile?.avatarUrl,
                          });
                          setIsExternalPopupOpen(true);
                        } else {
                          // Local user - show full UserQuickView
                          setSelectedMemberUsername(memberHandle);
                          setIsQuickViewOpen(true);
                        }
                      };

                      return (
                        <button
                          key={member.id}
                          onClick={handleMemberClick}
                          className="relative group cursor-pointer"
                          title={displayName}
                        >
                          {member.user?.profile?.avatarUrl ? (
                            <img
                              src={member.user.profile.avatarUrl}
                              alt={displayName}
                              className="w-full aspect-square rounded-md border border-nb-ink-mid/40 hover:border-nb-ink-mid"
                            />
                          ) : (
                            <div className="w-full aspect-square rounded-md border border-nb-ink-mid/40 bg-thread-cream flex items-center justify-center text-xs">
                              {displayName[0]?.toUpperCase()}
                            </div>
                          )}
                          {member.role === "curator" && (
                            <div className="absolute -top-1 -right-1 text-xs"><PixelIcon name="trophy" size={12} /></div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {ring.memberCount > 8 && (
                    <div className="text-xs text-nb-ink-mid text-center">
                      +{ring.memberCount - 8} more members
                    </div>
                  )}

                  {isPublicMemberInfo && (
                    <div className="text-xs text-nb-ink-mid mt-2 p-2 border-2 border-dotted border-nb-ink-mid/60 rounded-md">
                      Join to see all members
                    </div>
                  )}
                </>
              )}
            </div>

            {ring.visibility === "public" && (
              <StripBuilder
                isOpen={stripOpen}
                onClose={() => setStripOpen(false)}
                ring={ring}
                signedIn={!!currentUser}
                initialSiteId={typeof router.query.strip === "string" ? router.query.strip : null}
              />
            )}

            {/* User Quick View Modal */}
            {selectedMemberUsername && (
              <UserQuickView
                username={selectedMemberUsername}
                isOpen={isQuickViewOpen}
                onClose={() => {
                  setIsQuickViewOpen(false);
                  setSelectedMemberUsername(null);
                }}
              />
            )}

            {/* External User Popup Modal */}
            {externalUserData && (
              <ExternalUserPopup
                displayName={externalUserData.displayName}
                actorDid={externalUserData.actorDid}
                role={externalUserData.role}
                joinedAt={externalUserData.joinedAt}
                profileUrl={externalUserData.profileUrl}
                avatarUrl={externalUserData.avatarUrl}
                isOpen={isExternalPopupOpen}
                onClose={() => {
                  setIsExternalPopupOpen(false);
                  setExternalUserData(null);
                }}
              />
            )}

            {/* Ring Info & Insights - Tabbed Interface */}
            <div className="widget-container bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy-sm p-0 overflow-hidden">
              {/* Tab Navigation */}
              <div className="flex border-b-2 border-dotted border-nb-ink-mid/40" role="tablist">
                <button
                  onClick={() => setSidebarTab('stats')}
                  role="tab"
                  aria-selected={sidebarTab === 'stats'}
                  className="ts-tab flex-1 text-sm inline-flex items-center justify-center gap-1"
                >
                  <PixelIcon name="chart" size={14} /> Stats
                </button>
                <button
                  onClick={() => setSidebarTab('lineage')}
                  role="tab"
                  aria-selected={sidebarTab === 'lineage'}
                  className="ts-tab flex-1 text-sm inline-flex items-center justify-center gap-1"
                >
                  <PixelIcon name="archive" size={14} /> Tree
                </button>
                <button
                  onClick={() => setSidebarTab('discovery')}
                  role="tab"
                  aria-selected={sidebarTab === 'discovery'}
                  className="ts-tab flex-1 text-sm inline-flex items-center justify-center gap-1"
                >
                  <PixelIcon name="dice" size={14} /> Discover
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
            <div className="widget-container widget--flat bg-thread-paper border border-thread-sage rounded-cozy p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-nb-ink-mid">Created:</span>
                <span className="font-medium">{calendarDate(ring.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-nb-ink-mid">Visibility:</span>
                <span className="font-medium capitalize">{ring.visibility}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-nb-ink-mid">Join Type:</span>
                <span className="font-medium capitalize">{ring.joinType}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ring Info Toggle Button - Mobile Only (Bottom Right) */}
        {isMobile && (
          <button
            onClick={() => setShowSidebarModal(!showSidebarModal)}
            className={`bottom-center-button text-white ${showSidebarModal
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-thread-pine hover:bg-thread-sage'
              }`}
            aria-label={showSidebarModal ? "Close ring information" : "Open ring information"}
          >
            <span className="text-xl">{showSidebarModal ? <PixelIcon name="close" size={20} /> : <PixelIcon name="info-box" size={20} />}</span>
            <span className="button-text text-sm font-semibold">{showSidebarModal ? 'Close' : 'Ring Info'}</span>
          </button>
        )}

        {/* Backdrop - Mobile Only */}
        {isMobile && (
          <div
            className={`bottom-sheet-backdrop ${showSidebarModal ? 'visible' : ''}`}
            onClick={() => setShowSidebarModal(false)}
            aria-hidden="true"
          />
        )}

        {/* Bottom Sheet - Mobile Only */}
        {isMobile && (
          <div className={`mobile-bottom-sheet ${showSidebarModal ? 'open' : ''}`}>
            {/* Drag Handle */}
            <div className="bottom-sheet-handle" />

            {/* Bottom Sheet Content */}
            <div className="bottom-sheet-content">
              <div className="p-4 pb-6 space-y-4 bottom-sheet-safe-area">
                {/* Primary Actions */}
                <div className="tr-sidebar-section tr-primary-actions bg-thread-paper rounded-cozy shadow-cozy-sm border border-thread-sage/30 p-3 sm:p-4">
                  {isMember ? (
                    <div className="space-y-3">
                      {/* Member Status */}
                      <div className="tr-member-status badge badge--butter block px-3 py-2 text-center">
                        <span className="tr-role-indicator font-semibold text-nb-ink flex items-center justify-center gap-1">
                          {currentUserRole === 'curator' ? <><PixelIcon name="trophy" size={14} /> Ring Host</> : <><PixelIcon name="check" size={14} /> Member</>}
                        </span>
                      </div>

                      {/* Create Post Button */}
                      <Link
                        href={`/post/new?threadRing=${encodeURIComponent(ring.slug)}`}
                        className="tr-create-post-button btn btn--primary w-full block text-center font-semibold bg-thread-cream text-thread-pine border-2 border-thread-sage rounded-md shadow-cozy-sm no-underline"
                      >
                        <PixelIcon name="edit" size={16} className="inline-block align-[-3px] mr-1.5" />Write in this ring
                      </Link>

                      {/* Leave Button */}
                      {currentUserRole !== 'curator' && (
                        <Button
                          variant="secondary"
                          onClick={handleLeave}
                          disabled={joining}
                          className="tr-leave-button thread-button-secondary w-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {joining ? 'Leaving...' : 'Leave Ring'}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Join Button: same rules as the desktop sidebar */}
                      {ring.joinType === "open" || hasInvite ? (
                        <Button
                          onClick={handleJoin}
                          disabled={joining}
                          className="tr-join-button thread-button btn--lg w-full font-bold"
                        >
                          {joining ? 'Joining...' : hasInvite ? 'Accept invite' : '+ Join Ring'}
                        </Button>
                      ) : ring.joinType === "invite" ? (
                        <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md px-4 py-3 text-center font-medium flex items-center justify-center gap-2">
                          <PixelIcon name="lock" size={16} /> Invite Only
                        </div>
                      ) : (
                        <div className="border-2 border-nb-rose rounded-md px-4 py-3 text-center font-medium text-nb-rose-ink flex items-center justify-center gap-2">
                          <PixelIcon name="alert" size={16} /> Closed to New Members
                        </div>
                      )}

                      {/* Badge Preview */}
                      {ring.badge && ring.badge.isActive && (
                        <div className="tr-badge-preview-section border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3 text-center">
                          <div className="tr-badge-preview-label text-xs text-nb-ink-mid mb-2">
                            Badge Preview
                          </div>
                          <div className="tr-badge-preview-image-container flex justify-center">
                            <ThreadRing88x31Badge
                              templateId={ring.badge.templateId}
                              title={ring.badge.title}
                              subtitle={ring.badge.subtitle}
                              backgroundColor={ring.badge.backgroundColor}
                              textColor={ring.badge.textColor}
                              imageUrl={ring.badge.imageUrl}
                            />
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-nb-ink-mid text-center">
                        Join to post and earn this ring&apos;s badge
                      </div>
                    </div>
                  )}

                  {/* Badge Management - Ring Hosts Only */}
                  {currentUserRole === 'curator' && ring.badge && (
                    <div className="mt-3 pt-3 border-t-2 border-dotted border-nb-ink-mid/30">
                      <button
                        onClick={() => setShowBadgeOptions(!showBadgeOptions)}
                        className="w-full text-sm text-nb-ink hover:text-black font-medium flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1"><PixelIcon name="sliders" size={14} /> Badge Options</span>
                        <span>{showBadgeOptions ? <PixelIcon name="chevron-down" size={12} /> : <PixelIcon name="chevron-right" size={12} />}</span>
                      </button>

                      {showBadgeOptions && (
                        <div className="mt-2 space-y-2">
                          <Link
                            href={`/threadrings/${ring.slug}/badge/design`}
                            className="thread-button-secondary btn btn--secondary block w-full text-sm text-center"
                          >
                            Edit Badge Design
                          </Link>
                          <Link
                            href={`/threadrings/${ring.slug}/badge/manage`}
                            className="thread-button-secondary btn btn--secondary block w-full text-sm text-center"
                          >
                            Manage Badges
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tabbed Content */}
                <div className="tr-sidebar-section bg-thread-paper rounded-cozy shadow-cozy-sm border border-thread-sage/30 overflow-hidden">
                  {/* Tab Navigation */}
                  <div className="flex border-b-2 border-dotted border-nb-ink-mid/40" role="tablist">
                    <button
                      onClick={() => setSidebarTab('stats')}
                      role="tab"
                      aria-selected={sidebarTab === 'stats'}
                      className="ts-tab flex-1 min-h-[48px] text-sm inline-flex items-center justify-center gap-1"
                    >
                      <PixelIcon name="chart" size={14} /> Stats
                    </button>
                    <button
                      onClick={() => setSidebarTab('lineage')}
                      role="tab"
                      aria-selected={sidebarTab === 'lineage'}
                      className="ts-tab flex-1 min-h-[48px] text-sm inline-flex items-center justify-center gap-1"
                    >
                      <PixelIcon name="archive" size={14} /> Tree
                    </button>
                    <button
                      onClick={() => setSidebarTab('discovery')}
                      role="tab"
                      aria-selected={sidebarTab === 'discovery'}
                      className="ts-tab flex-1 min-h-[48px] text-sm inline-flex items-center justify-center gap-1"
                    >
                      <PixelIcon name="dice" size={14} /> Discover
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

                {/* Quick Info */}
                <div className="widget-container widget--flat bg-thread-paper border border-thread-sage rounded-cozy p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-nb-ink-mid">Created:</span>
                    <span className="font-medium text-nb-ink">{calendarDate(ring.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nb-ink-mid">Visibility:</span>
                    <span className="font-medium text-nb-ink capitalize">{ring.visibility}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nb-ink-mid">Join Type:</span>
                    <span className="font-medium text-nb-ink capitalize">{ring.joinType}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
          // Fetch ring from Ring Hub with a short SSR deadline; timeout -> local fallback.
          const ringDescriptor = await raceHubCall(client.getRing(slug as string));
          if (ringDescriptor === HUB_TIMEOUT) {
            throw new Error('Ring Hub SSR timeout (getRing)');
          }
          if (ringDescriptor) {
            // Transform Ring Hub descriptor to expected format
            const transformedRing = transformRingDescriptorToThreadRing(ringDescriptor);
            // Ring transformation complete
            // For The Spool, use Ring Hub stats for efficient counting
            let ringHubStats = null;
            let lineageData = null;

            if (slug === 'spool') {
              // Bounded; timeout/failure just yields no stats (counts fall back to 0).
              const stats = await raceHubCall(client.getStats());
              if (stats !== HUB_TIMEOUT) {
                ringHubStats = stats;
              }
            }

            // For non-spool rings, fetch lineage data (bounded).
            if (slug !== 'spool') {
              const lineage = await raceHubCall(client.getRingLineage(slug as string));
              if (lineage !== HUB_TIMEOUT) {
                lineageData = lineage;
              }
            }

            ring = {
              ...transformedRing,
              curator: null, // Ring Hub doesn't provide curator details
              members: [], // Members will be fetched client-side with user authentication
              // parentId is preserved from transformedRing - don't override it!
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

    // Arrived through a member's ring strip
    const cameFrom = serializedRing.visibility === "public" && context.query.from
      ? await cameFromSite(db, serializedRing.slug, context.query.from).catch(() => null)
      : null;

    return {
      props: {
        siteConfig,
        ring: serializedRing,
        cameFrom,
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