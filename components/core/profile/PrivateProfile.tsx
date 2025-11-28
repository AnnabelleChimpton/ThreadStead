import React from "react";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import Head from "next/head";

type PrivateProfileProps = {
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
  visibility: "private" | "followers" | "friends";
};

const visibilityMessages: Record<string, { title: string; description: string }> = {
  private: {
    title: "Private Profile",
    description: "This profile is private and can only be viewed by its owner.",
  },
  followers: {
    title: "Followers Only",
    description: "This profile is only visible to users who follow them.",
  },
  friends: {
    title: "Friends Only",
    description: "This profile is only visible to mutual friends.",
  },
};

export default function PrivateProfile({
  username,
  displayName,
  avatarUrl,
  visibility,
}: PrivateProfileProps) {
  const message = visibilityMessages[visibility] || visibilityMessages.private;
  const name = displayName || username;

  return (
    <>
      <Head>
        <title>{name} - Private Profile | ThreadStead</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <RetroCard>
            <div className="flex flex-col items-center text-center p-8">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-300 mb-4 bg-gray-100">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${name}'s avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg
                      className="w-12 h-12"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Username */}
              <h1 className="text-xl font-bold mb-2">{name}</h1>
              <p className="text-gray-500 mb-6">@{username}</p>

              {/* Lock Icon */}
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>

              {/* Message */}
              <h2 className="text-lg font-semibold mb-2">{message.title}</h2>
              <p className="text-gray-600 max-w-md">{message.description}</p>
            </div>
          </RetroCard>
        </div>
      </Layout>
    </>
  );
}
