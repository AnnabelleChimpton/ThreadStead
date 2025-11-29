import React from "react";
import Link from "next/link";
import ProfilePhoto from "./ProfilePhoto";
import FollowButton from "../social/FollowButton";
import FriendBadge from "../social/FriendBadge";
import MutualFriends from "../social/MutualFriends";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { trackNavigation } from "../../../lib/analytics/pixel-homes";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { useChat } from "@/contexts/ChatContext";

interface ProfileHeaderProps {
  username: string;
  ownerUserId?: string;
  photoUrl?: string;
  bio?: string;
  relStatus: string;
  onRelStatusChange: (status: string) => void;
}

export default function ProfileHeader({
  username,
  ownerUserId,
  photoUrl = "/assets/default-avatar.gif",
  bio,
  relStatus,
  onRelStatusChange
}: ProfileHeaderProps) {
  const { config } = useSiteConfig();
  const { user: currentUser } = useCurrentUser();
  const { openDM } = useChat();

  const showMessageButton = currentUser && ownerUserId && currentUser.id !== ownerUserId;

  return (
    <div className="ts-profile-header" data-component="profile-header">
      <div className="ts-profile-header-layout flex flex-col sm:flex-row sm:items-start sm:gap-6">
        <div className="ts-profile-photo-section">
          <ProfilePhoto src={photoUrl} alt={`${username}'s profile photo`} />
        </div>
        <div className="ts-profile-info-section flex-1">
          <div className="ts-profile-identity mb-4">
            <h2 className="ts-profile-display-name thread-headline text-3xl font-bold text-thread-pine mb-1">
              {username}
            </h2>
            <span className="ts-profile-status thread-label">
              {config.user_status_text}
            </span>
          </div>
          {bio && (
            <div className="ts-profile-bio-section mb-4">
              <p className="ts-profile-bio text-thread-charcoal leading-relaxed">
                {bio}
              </p>
            </div>
          )}
          <div className="ts-profile-actions flex items-center gap-3 flex-wrap">
            {relStatus === "friends" && <FriendBadge />}
            <FollowButton username={username} onStatus={onRelStatusChange} />

            {showMessageButton && (
              <button
                onClick={() => openDM(ownerUserId)}
                className="ts-profile-button ts-message-button thread-button text-sm bg-thread-cream text-thread-pine border border-thread-sage hover:bg-thread-sage/10 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded"
                title="Send Message"
              >
                <PixelIcon name="chat" size={16} />
                Message
              </button>
            )}

            <MutualFriends username={username} />
            <Link
              href={`/home/${username}`}
              className="ts-profile-button ts-pixel-home-button thread-button text-sm bg-thread-sage text-thread-paper hover:bg-thread-pine transition-colors"
              title="View Pixel Home"
              onClick={() => trackNavigation('profile', 'pixel_home', username)}
            >
              🏠 Pixel Home
            </Link>
            {relStatus === "owner" && (
              <Link
                href={`/resident/${username}/edit`}
                className="ts-profile-button ts-edit-profile-button thread-button text-sm"
              >
                Edit Profile
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}