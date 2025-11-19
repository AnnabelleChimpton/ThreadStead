// components/FriendBadge.tsx
import React from "react";
import { PixelIcon } from '@/components/ui/PixelIcon';

export default function FriendBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-green-200 border border-black px-2 py-0.5 text-xs font-bold shadow-[2px_2px_0_#000] rounded">
      <PixelIcon name="users" /> Friend
    </span>
  );
}
