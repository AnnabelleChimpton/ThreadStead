import React, { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Layout from "@/components/ui/layout/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import PostEditor from "@/components/ui/forms/PostEditor";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface PostEditorPageProps {
  siteConfig: SiteConfig;
}

export default function PostEditorPage({ siteConfig }: PostEditorPageProps) {
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();

  // Prompt response state
  const [respondingToPrompt, setRespondingToPrompt] = useState<{
    id: string;
    title: string;
    threadRingSlug: string;
  } | null>(null);

  // Site config for intent stamps
  const [intentStampsEnabled, setIntentStampsEnabled] = useState(true);
  const [postTitlesRequired, setPostTitlesRequired] = useState(true);
  useEffect(() => {
    fetchSiteConfig();
    handleUrlParameters();
  }, []);

  const handleUrlParameters = () => {
    const { promptId, threadRing, promptTitle } = router.query;

    if (promptId && threadRing && promptTitle) {
      setRespondingToPrompt({
        id: String(promptId),
        title: String(promptTitle),
        threadRingSlug: String(threadRing)
      });
    }
  };

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
      const capRes = await fetch("/api/cap/post", { method: "POST" });
      if (capRes.status === 401) {
        throw new Error("Please log in to post.");
      }
      if (!capRes.ok) throw new Error(`cap mint failed: ${capRes.status}`);
      const { token } = await capRes.json();

      // Add capability token to payload
      payload.cap = token;

      // Add prompt ID if responding to a prompt
      if (respondingToPrompt) {
        payload.promptId = respondingToPrompt.id;
      }

      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`create failed: ${res.status}`);

      const { post } = await res.json();
      router.push(`/resident/${post.authorUsername}/post/${post.id}`);
    } catch (error) {
      throw error; // Let PostEditor handle the error display
    }
  };

  return (
    <Layout siteConfig={siteConfig}>
      <div className="w-full p-4">
        <div className="post-editor-container p-6 mb-4 bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[3px_3px_0_#A18463]">
          <h1 className="thread-headline text-2xl font-bold mb-2">Create New Post</h1>
          <p className="text-[#A18463]">Write your post using Markdown formatting</p>
        </div>

        <PostEditor
          mode="create"
          onSubmit={handleSubmit}
          submitLabel="Publish Post"
          intentStampsEnabled={intentStampsEnabled}
          postTitlesRequired={postTitlesRequired}
          respondingToPrompt={respondingToPrompt}
        />
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<PostEditorPageProps> = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    },
  };
};
