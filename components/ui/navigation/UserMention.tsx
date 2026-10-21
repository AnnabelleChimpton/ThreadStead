"use client";

import React, { useState } from "react";
import UserQuickView from "@/components/ui/feedback/UserQuickView";

interface UserMentionProps {
  username: string;
  displayName?: string;
  className?: string;
  showBadge?: boolean;
  children?: React.ReactNode;
  handleHost?: string;  // Host of the user's handle (shown in the link label)
  profileUrl?: string;  // Profile URL for federated users
  /**
   * A user from another instance. Decide it on the server and pass it down:
   * SITE_NAME's env var isn't public, so the browser can't tell, and a guess
   * there renders different HTML than the server did.
   */
  external?: boolean;
}

export default function UserMention({
  username,
  displayName,
  className = "",
  children,
  handleHost,
  profileUrl,
  external = false,
}: UserMentionProps) {
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Only open quick view for local users
    if (!external) {
      setIsQuickViewOpen(true);
    }
    // For external users, do nothing (could show a toast in the future)
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // Only open quick view for local users
      if (!external) {
        setIsQuickViewOpen(true);
      }
    }
  };

  const displayText = children || displayName || username;

  return (
    <>
      {external && profileUrl ? (
        // External user with profile URL - render as link
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`cursor-pointer hover:underline focus:outline-none focus:underline ${className}`}
          aria-label={`View ${username}'s profile on ${handleHost}`}
        >
          {displayText}
        </a>
      ) : (
        // Local user - render as button that opens quick view
        <span
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          className={`cursor-pointer hover:underline focus:outline-none focus:underline ${className}`}
          aria-label={`View ${username}'s profile`}
        >
          {displayText}
        </span>
      )}

      <UserQuickView
        username={username}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  );
}
