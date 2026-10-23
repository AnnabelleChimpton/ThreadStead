import React, { useState, useEffect } from "react";
import { getInternalBaseUrl } from "@/lib/utils/api/internal-base-url";
import type { GetServerSideProps } from "next";
import PageMeta, { type PageImage } from "@/components/ui/layout/PageMeta";
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
import { residentFeedUrl } from "@/lib/feeds/urls";
import { webmentionEndpoint } from "@/lib/webmentions/urls";
import { postFirstImage } from "@/lib/templates/core/post-body";
import { db } from "@/lib/config/database/connection";

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
  /** The author's public posts as RSS (public profiles only), for feed readers given this post's URL */
  feedUrl?: string;
  /** Where outside sites send webmentions about this post (public posts on public profiles only) */
  webmentionUrl?: string;
  /** Its link preview's picture: its own first image, else the author's house (public posts on public profiles only) */
  shareImage?: PageImage;
};

type PrivatePostPageProps = {
  username: string;
  isPrivatePost: true;
};

function PrivatePostPage({ username }: { username: string }) {
  return (
    <>
      <PageMeta title="Private post" noIndex />
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

function PostPage({ username, post, authorDisplayName, initialCommentsOpen = true, highlightCommentId, hideNavigation = false, feedUrl, webmentionUrl, shareImage }: PostPageProps) {
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
      <PageMeta
        title={postMetadata.title}
        description={postMetadata.description}
        path={postMetadata.url}
        type="article"
        // Without a picture of its own or a house, the author's avatar as a small card
        image={shareImage ?? { url: adaptedPost.author.avatarUrl || '/assets/default-avatar.gif', alt: postMetadata.imageAlt }}
      >
        {feedUrl && (
          <link rel="alternate" type="application/rss+xml" title={`${displayName}'s posts`} href={feedUrl} />
        )}
        {webmentionUrl && <link rel="webmention" href={webmentionUrl} />}
        <meta property="article:author" content={postMetadata.author} />
        <meta property="article:published_time" content={postMetadata.publishedTime} />
        {postMetadata.modifiedTime && (
          <meta property="article:modified_time" content={postMetadata.modifiedTime} />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(postMetadata.structuredData)
          }}
        />
      </PageMeta>

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

    if (authorProfile?.profile?.visibility === 'public') {
      props.feedUrl = residentFeedUrl(authorUsername);
      if (post.visibility === 'public') {
        props.webmentionUrl = webmentionEndpoint();
        // Link previews reach signed-out visitors, so only here
        const ownImage = postFirstImage(post);
        if (ownImage) {
          // A photo they uploaded knows its shape, so a wide one gets the large card
          const upload = await db.media.findFirst({
            where: { userId: authorProfile.userId, OR: [{ mediumUrl: ownImage }, { fullUrl: ownImage }] },
            select: { width: true, height: true },
          });
          props.shareImage = upload?.width && upload.height ? { url: ownImage, width: upload.width, height: upload.height } : { url: ownImage };
        } else if (authorProfile.hasPixelHome) {
          const { homeShareImage } = await import('@/lib/pixel-homes/snapshot/share-image');
          const house = await homeShareImage(authorProfile.userId, authorUsername).catch(() => undefined);
          const name = post.author?.profile?.displayName || `@${authorUsername}`;
          if (house) props.shareImage = { url: house, width: 1200, height: 630, alt: `${name}'s house and yard` };
        }
      }
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