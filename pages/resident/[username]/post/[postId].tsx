import React, { useState, useEffect } from "react";
import type { GetServerSideProps } from "next";
import RetroCard from "@/components/layout/RetroCard";
import PostItem, { Post as PostType } from "@/components/content/PostItem";
import ProfileLayout from "@/components/layout/ProfileLayout";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type PostPageProps = {
  username: string;
  post: PostType;
  authorDisplayName?: string;
  initialCommentsOpen?: boolean;
  highlightCommentId?: string | null;
  customCSS?: string;
};

export default function PostPage({ username, post, authorDisplayName, initialCommentsOpen = false, highlightCommentId, customCSS }: PostPageProps) {
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user: currentUser } = useCurrentUser();

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
    <ProfileLayout customCSS={customCSS} sidebarContent={sidebarContent}>
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
  
  const initialCommentsOpen = commentsParam === "open";
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

    // Add custom CSS from author's profile
    if (authorProfile?.profile?.customCSS) {
      props.customCSS = authorProfile.profile.customCSS;
    }

    return { props };
  } catch (error) {
    console.error("Error fetching post:", error);
    return { notFound: true };
  }
};