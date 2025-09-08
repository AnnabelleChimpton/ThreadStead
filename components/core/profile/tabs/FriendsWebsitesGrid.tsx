import React from "react";
import FriendDisplay from "../../social/FriendDisplay";
import WebsiteDisplay from "../../social/WebsiteDisplay";
import { Website } from "../../../shared/WebsiteManager";
import { SelectedFriend } from "../../social/FriendManager";

interface FriendsWebsitesGridProps {
  friends?: SelectedFriend[];
  websites?: Website[];
}

export default function FriendsWebsitesGrid({ 
  friends = [], 
  websites = [] 
}: FriendsWebsitesGridProps) {
  return (
    <div className="ts-friends-websites-tab-content profile-tab-content" data-component="friends-websites-grid">
      <div className="ts-friends-websites-grid grid sm:grid-cols-2 gap-3">
        <div className="ts-friends-section">
          <FriendDisplay friends={friends} />
        </div>
        <div className="ts-websites-section">
          <WebsiteDisplay websites={websites} />
        </div>
      </div>
    </div>
  );
}