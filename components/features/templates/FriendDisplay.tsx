import React from "react";
import Link from "next/link";
import { useResidentData } from './ResidentDataProvider';

export default function FriendDisplay() {
  const { featuredFriends } = useResidentData();
  
  if (!featuredFriends || featuredFriends.length === 0) {
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
        {featuredFriends.map((friend) => (
          <Link
            key={friend.id}
            href={`/${friend.handle}`}
            className="friend-card flex items-center gap-2 p-2 border border-gray-300 bg-gray-50 hover:bg-yellow-100 shadow-[1px_1px_0_#000] transition-colors"
          >
            <img 
              src={friend.avatarUrl}
              alt={friend.displayName}
              className="w-8 h-8 border border-black object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">
                {friend.displayName}
              </div>
              <div className="text-xs text-gray-600 truncate">
                @{friend.handle}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}