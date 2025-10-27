import React, { useState, useEffect } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import Layout from "@/components/ui/layout/Layout";
import PostEditor from "@/components/ui/forms/PostEditor";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Post } from "@/components/core/content/PostItem";
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

interface EditPostPageProps {
  siteConfig: SiteConfig;
  post: Post;
  username: string;
}

type Visibility = "public" | "followers" | "friends" | "private";
type PostIntent = "sharing" | "asking" | "feeling" | "announcing" | "showing" | "teaching" | "looking" | "celebrating" | "recommending";

export default function EditPostPage({ siteConfig, post, username }: EditPostPageProps) {
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Site config for intent stamps and post titles
  const [intentStampsEnabled, setIntentStampsEnabled] = useState(true);
  const [postTitlesRequired, setPostTitlesRequired] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await fetch("/api/auth/me").then(r => r.json());
        if (alive) {
          const ownerCheck = me?.loggedIn && me.user?.id === post.author?.id;
          setIsOwner(ownerCheck);

          // If not owner, redirect to post view
          if (!ownerCheck) {
            router.replace(`/resident/${username}/post/${post.id}`);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to check ownership:", error);
        if (alive) {
          router.replace(`/resident/${username}/post/${post.id}`);
        }
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    })();
    return () => { alive = false; };
  }, [post.author?.id, post.id, username, router]);

  useEffect(() => {
    fetchSiteConfig();
  }, []);

  const fetchSiteConfig = async () => {
    try {
      const response = await fetch("/api/site-config");
      if (response.ok) {
        const { config } = await response.json();
        setIntentStampsEnabled(config.enable_intent_stamps === "true");
        setPostTitlesRequired(config.require_post_titles === "true");
      }
    } catch (error) {
      console.error("Failed to fetch site config:", error);
    }
  };

  const handleSubmit = async (payload: any) => {
    try {
      // Get capability token for post updates
      const capRes = await fetch("/api/cap/post", { method: "POST" });
      if (capRes.status === 401) {
        throw new Error("Please log in to edit this post.");
      }
      if (!capRes.ok) throw new Error(`cap mint failed: ${capRes.status}`);
      const { token } = await capRes.json();

      // Add capability token to payload
      payload.cap = token;

      const res = await csrfFetch("/api/posts/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`update failed: ${res.status}`);

      const { post: updatedPost } = await res.json();

      // Redirect back to the post view
      router.push(`/resident/${username}/post/${post.id}`);
    } catch (error) {
      throw error; // Let PostEditor handle the error display
    }
  };

  const handleCancel = () => {
    router.push(`/resident/${username}/post/${post.id}`);
  };

  // Extract thread ring slugs from the post data
  const getSelectedRings = () => {
    if (!post.threadRings) return [];
    return post.threadRings.map(tr => tr.threadRing.slug);
  };

  // Convert the post's content to markdown if it's HTML or text
  const getContentForEditing = () => {
    // Prefer bodyMarkdown if available (it should be for markdown posts)
    if (post.bodyMarkdown) {
      return post.bodyMarkdown;
    }

    // For HTML content, we'll need to convert back to markdown
    // This is a limitation - we might lose some formatting
    if (post.bodyHtml) {
      // For now, just return the HTML as-is and let the user edit it
      // In a future enhancement, we could add an HTML-to-markdown converter
      return post.bodyHtml;
    }

    // For plain text, return as-is
    return post.bodyText || "";
  };

  if (isLoading) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading post...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isOwner) {
    return null; // Will redirect in useEffect
  }

  const initialData = {
    id: post.id,
    title: post.title || "",
    content: getContentForEditing(),
    visibility: post.visibility as Visibility,
    intent: post.intent as PostIntent | null,
    isSpoiler: post.isSpoiler || false,
    contentWarning: post.contentWarning || "",
    selectedRings: getSelectedRings(),
  };

  return (
    <>
      <Head>
        <title>Edit Post - {post.title || 'Untitled'} - ThreadStead</title>
        <meta name="description" content="Edit your post on ThreadStead" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <Layout siteConfig={siteConfig}>
        <div className="w-full p-4">
          <div className="post-editor-container p-6 mb-4 bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[3px_3px_0_#A18463]">
            <h1 className="thread-headline text-2xl font-bold mb-2">Edit Post</h1>
            <p className="text-[#A18463]">Make changes to your post using Markdown formatting</p>
          </div>

          <PostEditor
            mode="edit"
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel="Update Post"
            intentStampsEnabled={intentStampsEnabled}
            postTitlesRequired={postTitlesRequired}
          />
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<EditPostPageProps> = async ({ params, req }) => {
  const username = String(params?.username || "");
  const postId = String(params?.postId || "");

  if (!username || !postId) {
    return { notFound: true };
  }

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
    const postAuthorUsername = post.author?.primaryHandle?.split('@')[0];
    if (postAuthorUsername !== username) {
      return { notFound: true };
    }

    // Get site configuration
    const siteConfig = await getSiteConfig();

    return {
      props: {
        siteConfig,
        post,
        username,
      },
    };
  } catch (error) {
    console.error("Error fetching post for editing:", error);
    return { notFound: true };
  }
};