import React from "react";
import { PixelIcon, type PixelIconName } from "@/components/ui/PixelIcon";

export type PostVisibility = "public" | "followers" | "friends" | "private";

export const VISIBILITY_LABELS: Record<PostVisibility, string> = {
  public: "Public",
  followers: "Followers",
  friends: "Friends",
  private: "Only me",
};

/** One plain line per option: who can read the post. */
export const VISIBILITY_HINTS: Record<PostVisibility, string> = {
  public: "Anyone can read it.",
  followers: "People who follow you.",
  friends: "People you follow who follow you back.",
  private: "Just you.",
};

/** Badge tooltips, worded for any reader (the author or a follower). */
const BADGE_TITLES: Record<Exclude<PostVisibility, "public">, string> = {
  followers: "Only followers can see this",
  friends: "Only friends (mutual follows) can see this",
  private: "Only you can see this",
};

const ICONS: Record<Exclude<PostVisibility, "public">, PixelIconName> = {
  followers: "user",
  friends: "users",
  private: "lock",
};

/** Small chip naming who can see a non-public post. Renders nothing for public posts. */
export default function VisibilityBadge({ visibility }: { visibility: PostVisibility | null | undefined }) {
  if (!visibility || visibility === "public") return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium text-nb-ink bg-thread-cream border border-nb-ink-mid/50 rounded px-1.5 py-0.5"
      title={BADGE_TITLES[visibility]}
    >
      <PixelIcon name={ICONS[visibility]} size={12} />
      {VISIBILITY_LABELS[visibility]}
    </span>
  );
}
