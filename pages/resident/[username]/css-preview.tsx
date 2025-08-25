// pages/resident/[username]/css-preview.tsx
import React from "react";
import { GetServerSideProps } from "next";
import ProfileLayout from "@/components/layout/ProfileLayout";
import ProfileHeader from "@/components/profile/ProfileHeader";
import Tabs, { TabSpec } from "@/components/navigation/Tabs";
import { featureFlags } from "@/lib/feature-flags";

interface CSSPreviewProps {
  username: string;
  bio?: string;
  photoUrl?: string;
  customCSS?: string;
  includeSiteCSS?: boolean;
}

export default function CSSPreviewPage({
  username,
  bio,
  photoUrl = "/assets/default-avatar.gif",
  customCSS,
  includeSiteCSS = true,
}: CSSPreviewProps) {
  // Mock tabs for preview with example data
  const baseTabs: TabSpec[] = [
    { 
      id: "blog", 
      label: "Blog", 
      content: (
        <div className="ts-blog-tab-content profile-tab-content space-y-3" data-component="blog-tab">
          <div className="ts-blog-posts-list">
            {/* Example Blog Post 1 */}
            <article className="blog-post-card border border-black p-3 bg-white shadow-[2px_2px_0_#000] mb-4">
              <div className="blog-post-header flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="blog-post-date text-xs opacity-70">
                    December 15, 2024
                  </div>
                </div>
              </div>
              <div className="blog-post-content">
                <h3 className="blog-post-title text-lg font-semibold mb-2">My Latest Project</h3>
                <p>This is an example blog post to show how your CSS styling affects blog content. You can customize the colors, fonts, spacing, and layout of these posts.</p>
              </div>
            </article>

            {/* Example Blog Post 2 */}
            <article className="blog-post-card border border-black p-3 bg-white shadow-[2px_2px_0_#000] mb-4">
              <div className="blog-post-header flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="blog-post-date text-xs opacity-70">
                    December 10, 2024
                  </div>
                </div>
              </div>
              <div className="blog-post-content">
                <h3 className="blog-post-title text-lg font-semibold mb-2">CSS Styling Tips</h3>
                <p>Here&apos;s another example post. Notice how the blog-post-card, blog-post-title, and blog-post-content classes can be styled with your CSS.</p>
              </div>
            </article>
          </div>
        </div>
      )
    },
    {
      id: "media",
      label: "Media",
      content: (
        <div className="ts-media-tab-content profile-tab-content" data-component="media-tab">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Example Media Items */}
            <div className="media-item bg-gray-200 aspect-square rounded flex items-center justify-center">
              <span className="text-xs text-gray-500">📸 Photo 1</span>
            </div>
            <div className="media-item bg-gray-200 aspect-square rounded flex items-center justify-center">
              <span className="text-xs text-gray-500">📸 Photo 2</span>
            </div>
            <div className="media-item bg-gray-200 aspect-square rounded flex items-center justify-center">
              <span className="text-xs text-gray-500">📸 Photo 3</span>
            </div>
            <div className="media-item bg-gray-200 aspect-square rounded flex items-center justify-center">
              <span className="text-xs text-gray-500">🎵 Audio</span>
            </div>
          </div>
          <p className="text-xs text-thread-sage mt-4 text-center opacity-70">
            Example media grid - style with .media-item class
          </p>
        </div>
      ),
    },
    {
      id: "friends",
      label: "Friends / Websites",
      content: (
        <div className="ts-friends-tab-content profile-tab-content" data-component="friends-tab">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3">Friends</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="friend-card bg-white border border-thread-sage p-3 rounded text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <span className="text-xs">👤</span>
                  </div>
                  <div className="friend-name text-sm font-medium">Alice</div>
                </div>
                <div className="friend-card bg-white border border-thread-sage p-3 rounded text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <span className="text-xs">👤</span>
                  </div>
                  <div className="friend-name text-sm font-medium">Bob</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Websites</h4>
              <div className="space-y-2">
                <a href="#" className="website-link block bg-thread-cream p-2 rounded hover:bg-thread-sage/10">
                  🌐 My Portfolio
                </a>
                <a href="#" className="website-link block bg-thread-cream p-2 rounded hover:bg-thread-sage/10">
                  🐦 Twitter
                </a>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "badges",
      label: "Badges", 
      content: (
        <div className="ts-badges-tab-content profile-tab-content" data-component="badges-tab">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="badge-item bg-yellow-100 border border-yellow-300 p-3 rounded text-center">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-xs font-medium">Early Adopter</div>
            </div>
            <div className="badge-item bg-blue-100 border border-blue-300 p-3 rounded text-center">
              <div className="text-2xl mb-1">💎</div>
              <div className="text-xs font-medium">CSS Master</div>
            </div>
            <div className="badge-item bg-green-100 border border-green-300 p-3 rounded text-center">
              <div className="text-2xl mb-1">🌟</div>
              <div className="text-xs font-medium">Community Star</div>
            </div>
          </div>
          <p className="text-xs text-thread-sage mt-4 text-center opacity-70">
            Example badges - style with .badge-item class
          </p>
        </div>
      ),
    },
    {
      id: "guestbook",
      label: "Guestbook",
      content: (
        <div className="ts-guestbook-tab-content profile-tab-content" data-component="guestbook-tab">
          <div className="space-y-4">
            {/* Guestbook Entry Form */}
            <div className="guestbook-form bg-thread-cream p-4 rounded">
              <h4 className="font-medium mb-2">Leave a message</h4>
              <textarea 
                className="w-full p-2 border border-thread-sage rounded text-sm" 
                rows={3} 
                placeholder="Share a friendly thought..."
                readOnly
              />
              <button className="thread-button text-sm mt-2">Post Message</button>
            </div>

            {/* Example Guestbook Entries */}
            <div className="guestbook-entries space-y-3">
              <div className="guestbook-entry bg-white border-l-4 border-thread-pine p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm">Sarah</span>
                  <span className="text-xs text-thread-sage">2 days ago</span>
                </div>
                <p className="text-sm">Love your new design! The colors are so vibrant and cheerful. 🌈</p>
              </div>
              
              <div className="guestbook-entry bg-white border-l-4 border-thread-pine p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm">Mike</span>
                  <span className="text-xs text-thread-sage">1 week ago</span>
                </div>
                <p className="text-sm">Great work on the recent project! Keep it up! 💪</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Filter badges tab if threadrings not enabled (same as actual profile)
  const tabs: TabSpec[] = featureFlags.threadrings(null) 
    ? baseTabs 
    : baseTabs.filter(tab => tab.id !== 'badges');

  return (
    <ProfileLayout 
      customCSS={customCSS} 
      hideNavigation={false}
      includeSiteCSS={includeSiteCSS}
    >
      <section className="thread-module p-6 mb-6">
        <ProfileHeader
          username={username}
          photoUrl={photoUrl}
          bio={bio}
          relStatus="loading"
          onRelStatusChange={() => {}}
        />
      </section>

      <div className="ts-profile-tabs-wrapper">
        <Tabs
          tabs={tabs}
          initialId="blog"
        />
      </div>
    </ProfileLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { username } = context.params!;
  const { customCSS, includeSiteCSS, bio, photoUrl } = context.query;

  return {
    props: {
      username: username as string,
      bio: (bio as string) || "Welcome to my profile!",
      photoUrl: (photoUrl as string) || "/assets/default-avatar.gif", 
      customCSS: (customCSS as string) || "",
      includeSiteCSS: includeSiteCSS !== "false",
    },
  };
};