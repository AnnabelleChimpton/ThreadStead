import React, { useState, useEffect } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import RetroCard from "@/components/RetroCard";
import PostItem, { Post as PostType } from "@/components/PostItem";
import Link from "next/link";

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
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      const me = await fetch("/api/auth/me").then(r => r.json());
      if (alive) setIsOwner(me?.loggedIn && me.user?.id === post.author?.id);
    })();
    return () => { alive = false; };
  }, [post.author?.id]);

  const displayName = authorDisplayName || username;

  return (
    <>
      {customCSS && <style dangerouslySetInnerHTML={{ __html: customCSS }} />}
      <div className="profile-container">
        <Layout>
          <div className="profile-content-wrapper">
            <div className="profile-main-content">
              
              {/* Post header card - matching profile header structure */}
              <RetroCard>
                <div className="profile-header">
                  <div className="profile-header-layout">
                    <div className="profile-info-section flex-1">
                      <div className="profile-identity mb-4">
                        <nav className="text-sm mb-3">
                          <Link href={`/${username}`} className="text-thread-pine hover:text-thread-sunset transition-colors">
                            {displayName}
                          </Link>
                          <span className="mx-2 text-thread-sage">›</span>
                          <span className="text-thread-charcoal">Post</span>
                        </nav>
                        
                        {post.title && (
                          <h1 className="profile-display-name thread-headline text-3xl font-bold text-thread-pine mb-1">{post.title}</h1>
                        )}
                        <span className="profile-status thread-label">
                          Posted on {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="profile-actions flex items-center gap-3 flex-wrap">
                        <Link
                          href={`/${username}`}
                          className="profile-button edit-profile-button thread-button text-sm"
                        >
                          ← Back to Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </RetroCard>

              {/* Post content in a separate card */}
              <RetroCard>
                <div className="profile-tab-content">
                  <PostItem 
                    post={post} 
                    isOwner={isOwner} 
                    onChanged={() => window.location.reload()}
                    initialCommentsOpen={initialCommentsOpen}
                    highlightCommentId={highlightCommentId}
                  />
                </div>
              </RetroCard>
            </div>
            
            {/* Sidebar for advanced layouts - hidden by default, can be shown via CSS */}
            <div className="profile-sidebar" style={{ display: 'none' }}>
              <div className="sidebar-content">
                <h3 className="sidebar-heading">Post Actions</h3>
                <p className="sidebar-text">This sidebar is available for advanced CSS customization.</p>
              </div>
            </div>
          </div>
        </Layout>
      </div>
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