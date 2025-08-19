import React from "react";
import Link from "next/link";

interface ThreadRingBadgeProps {
  threadRing: {
    id: string;
    name: string;
    slug: string;
  };
  size?: "small" | "medium";
  className?: string;
}

export default function ThreadRingBadge({ threadRing, size = "small", className = "" }: ThreadRingBadgeProps) {
  const sizeClasses = {
    small: "text-xs px-2 py-1",
    medium: "text-sm px-3 py-1.5"
  };

  return (
    <Link
      href={`/threadrings/${threadRing.slug}`}
      className={`
        inline-flex items-center gap-1 
        bg-purple-100 hover:bg-purple-200 
        border border-purple-300 
        text-purple-800 
        rounded-full 
        transition-colors
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <span className="text-purple-600">◦</span>
      <span className="font-medium">{threadRing.name}</span>
    </Link>
  );
}