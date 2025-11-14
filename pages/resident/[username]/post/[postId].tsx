import React, { useState, useEffect } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import RetroCard from "@/components/ui/layout/RetroCard";
import PostItem, { Post as PostType } from "@/components/core/content/PostItem";
import ProfileLayout from "@/components/ui/layout/ProfileLayout";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePostView } from "@/hooks/usePostView";
import { contentMetadataGenerator } from "@/lib/utils/metadata/content-metadata";

type PostPageProps = {
  username: string;
  post: PostType;
  authorDisplayName?: string;
  initialCommentsOpen?: boolean;
  highlightCommentId?: string | null;
  customCSS?: string;
  hideNavigation?: boolean;
  includeSiteCSS?: boolean;
};

export default function PostPage({ username, post, authorDisplayName, initialCommentsOpen = true, highlightCommentId, customCSS, hideNavigation = false, includeSiteCSS = true }: PostPageProps) {
  // Generate metadata for this post
  const adaptedPost = {
    ...post,
    author: {
      handle: post.author?.primaryHandle || username,
      displayName: post.author?.profile?.displayName || authorDisplayName,
      avatarUrl: (post.author?.profile as any)?.avatarUrl || null
    },
    threadRings: post.threadRings?.map(tr => ({
      name: tr.threadRing.name,
      slug: tr.threadRing.slug
    }))
  };
  const postMetadata = contentMetadataGenerator.generateBlogPostMetadata(adaptedPost, username);

  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user: currentUser } = useCurrentUser();

  // Track full page view for this post
  usePostView({
    postId: post.id,
    viewType: 'full_page',
    enabled: true,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const me = await fetch("/api/auth/me").then(r => r.json());
      if (alive) {
        setIsOwner(me?.loggedIn && me.user?.id === post.author?.id);
        setIsAdmin(me?.loggedIn && me.user?.role === "admin");
      }
    })();
    return () => { alive = false; };
  }, [post.author?.id]);

  const displayName = authorDisplayName || username;

  const sidebarContent = (
    <>
      <h3 className="ts-sidebar-heading">Post Actions</h3>
      <p className="ts-sidebar-text">This sidebar is available for advanced CSS customization.</p>
    </>
  );

  return (
    <>
      <Head>
        <title>{postMetadata.title}</title>
        <meta name="description" content={postMetadata.description} />
        {postMetadata.keywords && (
          <meta name="keywords" content={postMetadata.keywords.join(', ')} />
        )}
        <meta name="author" content={postMetadata.author} />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}${postMetadata.url}`} />
        <meta name="robots" content="index, follow" />

        {/* OpenGraph meta tags */}
        <meta property="og:title" content={postMetadata.title} />
        <meta property="og:description" content={postMetadata.description} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={adaptedPost.author.avatarUrl || '/assets/default-avatar.gif'} />
        <meta property="og:image:alt" content={postMetadata.imageAlt} />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}${postMetadata.url}`} />
        <meta property="og:site_name" content="ThreadStead" />
        <meta property="og:locale" content="en_US" />
        <meta property="article:author" content={postMetadata.author} />
        <meta property="article:published_time" content={postMetadata.publishedTime} />
        {postMetadata.modifiedTime && (
          <meta property="article:modified_time" content={postMetadata.modifiedTime} />
        )}

        {/* Social media card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={postMetadata.title} />
        <meta name="twitter:description" content={postMetadata.description} />
        <meta name="twitter:image" content={adaptedPost.author.avatarUrl || '/assets/default-avatar.gif'} />

        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(postMetadata.structuredData, null, 0)
          }}
        />
      </Head>

      <ProfileLayout
        customCSS={customCSS}
        hideNavigation={hideNavigation}
        includeSiteCSS={includeSiteCSS}
        sidebarContent={sidebarContent}
      >
        <RetroCard>
          <div className="ts-post-content-wrapper profile-tab-content" data-component="post-content">
            <PostItem
              post={post}
              isOwner={isOwner}
              isAdmin={isAdmin}
              onChanged={() => window.location.reload()}
              initialCommentsOpen={initialCommentsOpen}
              highlightCommentId={highlightCommentId}
              currentUser={currentUser}
            />
          </div>
        </RetroCard>
      </ProfileLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PostPageProps> = async ({ params, query, req }) => {
  const username = String(params?.username || "");
  const postId = String(params?.postId || "");
  
  if (!username || !postId) {
    return { notFound: true };
  }

  // Extract query parameters for comments and highlighting
  const commentsParam = String(query.comments || "");
  const highlightParam = String(query.highlight || "");

  const initialCommentsOpen = commentsParam === "closed" ? false : true;
  const highlightCommentId = highlightParam || null;

  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  const host = req?.headers?.host || "localhost:3000";
  const base = `${proto}://${host}`;

  try {
    // Fetch the specific post
    const postRes = await fetch(`${base}/api/posts/single/${encodeURIComponent(postId)}`);
    
    if (!postRes.ok) {
      return { notFound: true };
    }

    const postData = await postRes.json();
    const post = postData.post;

    // Verify the post belongs to the requested user
    // Extract clean username from the post author's handle for comparison
    const postAuthorUsername = post.author?.primaryHandle?.split('@')[0];
    if (postAuthorUsername !== username) {
      return { notFound: true };
    }

    // Fetch the author's profile for custom CSS and other styling
    // Use the clean username (strip @sitename) for the profile API
    const authorUsername = post.author?.primaryHandle?.split('@')[0] || username;
    const profileRes = await fetch(`${base}/api/profile/${encodeURIComponent(authorUsername)}`);
    let authorProfile = null;
    if (profileRes.ok) {
      authorProfile = await profileRes.json();
    }

    const props: PostPageProps = {
      username,
      post,
      initialCommentsOpen,
      highlightCommentId,
    };

    if (post.author?.profile?.displayName) {
      props.authorDisplayName = post.author.profile.displayName;
    }

    // Fetch admin default CSS from public site config
    let adminDefaultCSS = "";
    try {
      const configRes = await fetch(`${base}/api/site-config`);
      if (configRes.ok) {
        const configData = await configRes.json();
        adminDefaultCSS = configData.config?.default_profile_css || "";
      }
    } catch (error) {
      console.error("Failed to fetch admin default CSS:", error);
    }

    // Apply CSS logic based on template mode (same as profile page)
    const templateMode = authorProfile?.profile?.templateMode || 'default';
    
    if (templateMode === 'enhanced' && authorProfile?.profile?.customCSS != null && authorProfile.profile.customCSS.trim() !== '') {
      // Enhanced mode (Default Layout + Custom CSS) - use user's custom CSS
      props.customCSS = authorProfile.profile.customCSS;
    } else if (templateMode === 'default') {
      // Default mode - use admin default CSS only, ignore user CSS
      if (adminDefaultCSS && adminDefaultCSS.trim() !== '') {
        props.customCSS = adminDefaultCSS;
      }
    } else if (templateMode === 'advanced' && authorProfile?.profile?.customCSS != null && authorProfile.profile.customCSS.trim() !== '') {
      // Advanced template mode - use user's custom CSS (legacy compatibility)
      props.customCSS = authorProfile.profile.customCSS;
    } else if (adminDefaultCSS && adminDefaultCSS.trim() !== '') {
      // Fallback to admin default CSS if available
      props.customCSS = adminDefaultCSS;
    }
    // If none of the above, customCSS remains undefined and no CSS is injected

    // Add other layout properties
    // Temporarily disabled - navigation always shown on post pages
    // if (authorProfile?.profile?.hideNavigation != null) {
    //   props.hideNavigation = authorProfile.profile.hideNavigation;
    // }
    if (authorProfile?.profile?.includeSiteCSS != null) {
      props.includeSiteCSS = authorProfile.profile.includeSiteCSS;
    }

    return { props };
  } catch (error) {
    console.error("Error fetching post:", error);
    return { notFound: true };
  }
};