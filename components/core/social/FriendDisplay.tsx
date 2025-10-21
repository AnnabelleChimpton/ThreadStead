import React from "react";
import Image from "next/image";
import { SelectedFriend } from "./FriendManager";
import UserMention from "@/components/ui/navigation/UserMention";

interface FriendDisplayProps {
  friends: SelectedFriend[];
}

export default function FriendDisplay({ friends }: FriendDisplayProps) {
  if (!friends || friends.length === 0) {
    return (
      <div className="border border-black p-3 bg-white shadow-[2px_2px_0_#000]">
        <h4 className="font-bold mb-2">Friends</h4>
        <p className="text-gray-500 text-sm">No featured friends yet.</p>
      </div>
    );
  }

  return (
    <div className="featured-friends border border-black p-3 bg-white shadow-[2px_2px_0_#000]">
      <h4 className="section-heading font-bold mb-3">Friends</h4>
      <div className="grid grid-cols-2 gap-3">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="friend-card flex items-center gap-2 p-2 border border-gray-300 bg-gray-50 shadow-[1px_1px_0_#000]"
          >
            <Image
              src={friend.avatarUrl}
              alt={friend.displayName}
              width={32}
              height={32}
              className="w-8 h-8 border border-black object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <UserMention
                username={friend.handle}
                displayName={friend.displayName}
                className="font-semibold text-sm truncate block"
              />
              <div className="text-xs text-gray-600 truncate">
                @{friend.handle}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}