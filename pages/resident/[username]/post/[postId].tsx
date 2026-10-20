import { getSiteBaseUrl } from "@/lib/config/site-url";
import React, { useState, useEffect } from "react";
import { getInternalBaseUrl } from "@/lib/utils/api/internal-base-url";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import RetroCard from "@/components/ui/layout/RetroCard";
import PostItem, { Post as PostType } from "@/components/core/content/PostItem";
import ProfileLayout from "@/components/ui/layout/ProfileLayout";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePostView } from "@/hooks/usePostView";
import { contentMetadataGenerator } from "@/lib/utils/metadata/content-metadata";
import { serializeJsonLd } from "@/lib/utils/sanitization/json-ld";
import Layout from "@/components/ui/layout/Layout";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { pageCSS } from "@/lib/domain/profile/layout";

type PostPageProps = {
  username: string;
  post: PostType;
  isPrivatePost?: false;
  authorDisplayName?: string;
  initialCommentsOpen?: boolean;
  highlightCommentId?: string | null;
  /** The author's page CSS. Not rendered here: _app only applies profile CSS on the profile page itself. */
  customCSS?: string;
  hideNavigation?: boolean;
};

type PrivatePostPageProps = {
  username: string;
  isPrivatePost: true;
};

function PrivatePostPage({ username }: { username: string }) {
  return (
    <>
      <Head>
        <title>Private post | ThreadStead</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <RetroCard>
            <div className="flex flex-col items-center text-center p-8 text-thread-pine">
              <PixelIcon name="lock" size={32} className="text-thread-sage mb-4" />
              <h1 className="text-lg font-semibold mb-2">This post is private.</h1>
              <p className="text-thread-sage mb-6">Only people its author has shared it with can see it.</p>
              <a href={`/resident/${encodeURIComponent(username)}`} className="underline text-thread-pine hover:text-thread-sunset">
                Visit @{username}&apos;s page
              </a>
            </div>
          </RetroCard>
        </div>
      </Layout>
    </>
  );
}

export default function PostPageRoute(props: PostPageProps | PrivatePostPageProps) {
  if (props.isPrivatePost) {
    return <PrivatePostPage username={props.username} />;
  }
  return <PostPage {...props} />;
}

function PostPage({ username, post, authorDisplayName, initialCommentsOpen = true, highlightCommentId, hideNavigation = false }: PostPageProps) {
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
        <link rel="canonical" href={`${getSiteBaseUrl()}${postMetadata.url}`} />
        <meta name="robots" content="index, follow" />

        {/* OpenGraph meta tags */}
        <meta property="og:title" content={postMetadata.title} />
        <meta property="og:description" content={postMetadata.description} />
        <meta property="og:type" content="article" />
        <meta key="og:image" property="og:image" content={adaptedPost.author.avatarUrl || '/assets/default-avatar.gif'} />
        <meta key="og:image:alt" property="og:image:alt" content={postMetadata.imageAlt} />
        <meta property="og:url" content={`${getSiteBaseUrl()}${postMetadata.url}`} />
        <meta property="og:site_name" content="ThreadStead" />
        <meta property="og:locale" content="en_US" />
        <meta property="article:author" content={postMetadata.author} />
        <meta property="article:published_time" content={postMetadata.publishedTime} />
        {postMetadata.modifiedTime && (
          <meta property="article:modified_time" content={postMetadata.modifiedTime} />
        )}

        {/* Social media card meta tags */}
        <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={postMetadata.title} />
        <meta name="twitter:description" content={postMetadata.description} />
        <meta key="twitter:image" name="twitter:image" content={adaptedPost.author.avatarUrl || '/assets/default-avatar.gif'} />

        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(postMetadata.structuredData)
          }}
        />
      </Head>

      <ProfileLayout
        hideNavigation={hideNavigation}
        sidebarContent={sidebarContent}
      >
        <RetroCard>
          <div className="ts-post-content-wrapper profile-tab-content" data-component="post-content">
            <PostItem
              post={post}
              isOwner={isOwner}
              isAdmin={isAdmin}
              canAddToRing
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

export const getServerSideProps: GetServerSideProps<PostPageProps | PrivatePostPageProps> = async ({ params, query, req }) => {
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

  const base = getInternalBaseUrl();

  try {
    // Forward the viewer's cookie so the API can apply visibility rules
    // (without it, every non-public post 403s — even for its author).
    const forwardHeaders = { cookie: req.headers.cookie || "" };

    // Fetch the specific post
    const postRes = await fetch(`${base}/api/posts/single/${encodeURIComponent(postId)}`, {
      headers: forwardHeaders,
    });

    if (postRes.status === 403) {
      return { props: { username, isPrivatePost: true } };
    }

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
    const profileRes = await fetch(`${base}/api/profile/${encodeURIComponent(authorUsername)}`, {
      headers: forwardHeaders,
    });
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

    // The same CSS the author's profile page sends (lib/domain/profile/layout.ts)
    const css = pageCSS(authorProfile?.profile, adminDefaultCSS);
    if (css !== undefined) props.customCSS = css;

    // Add other layout properties
    // Temporarily disabled - navigation always shown on post pages
    // if (authorProfile?.profile?.hideNavigation != null) {
    //   props.hideNavigation = authorProfile.profile.hideNavigation;
    // }

    return { props };
  } catch (error) {
    console.error("Error fetching post:", error);
    return { notFound: true };
  }
};