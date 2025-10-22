"use client";

import React, { useState } from "react";
import UserQuickView from "@/components/ui/feedback/UserQuickView";
import { SITE_NAME } from "@/lib/config/site/constants";

interface UserMentionProps {
  username: string;
  displayName?: string;
  className?: string;
  showBadge?: boolean;
  children?: React.ReactNode;
  handleHost?: string;  // Host of the user's handle (to detect federated users)
  profileUrl?: string;  // Profile URL for federated users
}

export default function UserMention({
  username,
  displayName,
  className = "",
  children,
  handleHost,
  profileUrl,
}: UserMentionProps) {
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  // Check if this is a federated user from another instance
  const isExternalUser = handleHost && handleHost !== SITE_NAME;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Only open quick view for local users
    if (!isExternalUser) {
      setIsQuickViewOpen(true);
    }
    // For external users, do nothing (could show a toast in the future)
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // Only open quick view for local users
      if (!isExternalUser) {
        setIsQuickViewOpen(true);
      }
    }
  };

  const displayText = children || displayName || username;

  return (
    <>
      {isExternalUser && profileUrl ? (
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
