import React from "react";
import Link from "next/link";
import ProfilePhoto from "./ProfilePhoto";
import FollowButton from "../social/FollowButton";
import FriendBadge from "../social/FriendBadge";
import MutualFriends from "../social/MutualFriends";
import { useSiteConfig } from "@/hooks/useSiteConfig";

interface ProfileHeaderProps {
  username: string;
  photoUrl?: string;
  bio?: string;
  relStatus: string;
  onRelStatusChange: (status: string) => void;
}

export default function ProfileHeader({
  username,
  photoUrl = "/assets/default-avatar.gif",
  bio,
  relStatus,
  onRelStatusChange
}: ProfileHeaderProps) {
  const { config } = useSiteConfig();

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
            <MutualFriends username={username} />
            {relStatus === "owner" && (
              <Link
                href="/settings/profile"
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