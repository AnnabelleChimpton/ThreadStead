"use client";

import React, { useState } from "react";
import UserQuickView from "@/components/ui/feedback/UserQuickView";

interface UserMentionProps {
  username: string;
  displayName?: string;
  className?: string;
  showBadge?: boolean;
  children?: React.ReactNode;
}

export default function UserMention({
  username,
  displayName,
  className = "",
  children,
}: UserMentionProps) {
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsQuickViewOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsQuickViewOpen(true);
    }
  };

  const displayText = children || displayName || username;

  return (
    <>
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

      <UserQuickView
        username={username}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  );
}
