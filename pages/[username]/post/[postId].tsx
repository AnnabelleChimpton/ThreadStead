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
};

export default function PostPage({ username, post, authorDisplayName, initialCommentsOpen = false, highlightCommentId }: PostPageProps) {
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
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header with breadcrumb */}
        <div className="mb-6">
          <nav className="text-sm mb-4">
            <Link href={`/${username}`} className="text-blue-600 hover:underline">
              {displayName}
            </Link>
            <span className="mx-2 text-gray-400">›</span>
            <span className="text-gray-600">Post</span>
          </nav>
          
          {post.title && (
            <h1 className="text-3xl font-bold text-black mb-2">{post.title}</h1>
          )}
          
          <div className="text-sm text-gray-600">
            Posted by{" "}
            <Link href={`/${username}`} className="font-semibold text-blue-600 hover:underline">
              {displayName}
            </Link>
            {" "}on {new Date(post.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Post content */}
        <RetroCard>
          <PostItem 
            post={post} 
            isOwner={isOwner} 
            onChanged={() => window.location.reload()}
            initialCommentsOpen={initialCommentsOpen}
            highlightCommentId={highlightCommentId}
          />
        </RetroCard>
      </div>
    </Layout>
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
    if (post.author?.primaryHandle !== username) {
      return { notFound: true };
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

    return { props };
  } catch (error) {
    console.error("Error fetching post:", error);
    return { notFound: true };
  }
};