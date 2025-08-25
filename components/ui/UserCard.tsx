import React from "react";
import Link from "next/link";
import Image from "next/image";

export type DirectoryUser = {
  id: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
};

type UserCardProps = {
  user: DirectoryUser;
};

export default function UserCard({ user }: UserCardProps) {
  const displayName = user.displayName || user.username || "Anonymous";
  const profileLink = user.username ? `/resident/${user.username}` : null;
  
  const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  // Truncate bio if too long
  const shortBio = user.bio && user.bio.length > 120 
    ? user.bio.substring(0, 120) + "..." 
    : user.bio;

  return (
    <div className="user-card bg-thread-paper border border-thread-sage/30 p-5 rounded-cozy shadow-cozySm hover:shadow-cozy h-full flex flex-col">
      {/* Header with Avatar and Name */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={`${displayName}'s avatar`}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full border-2 border-thread-sage/30 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-thread-cream border-2 border-thread-sage/30 flex items-center justify-center">
              <span className="text-thread-sage font-mono text-sm font-medium">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Name and Username */}
        <div className="flex-1 min-w-0">
          {profileLink ? (
            <Link 
              href={profileLink}
              className="thread-headline text-lg font-bold text-thread-pine hover:text-thread-sunset transition-colors block truncate"
            >
              {displayName}
            </Link>
          ) : (
            <h3 className="thread-headline text-lg font-bold text-thread-pine truncate">
              {displayName}
            </h3>
          )}
          {user.username && (
            <div className="thread-label truncate">@{user.username}</div>
          )}
        </div>
      </div>

      {/* Bio */}
      {shortBio && (
        <div className="mb-4 flex-grow">
          <p className="text-thread-charcoal text-sm leading-relaxed line-clamp-3">
            {shortBio}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <span className="thread-label">posts</span>
            <span className="text-thread-pine font-medium">{user.postCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="thread-label">followers</span>
            <span className="text-thread-pine font-medium">{user.followerCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="thread-label">following</span>
            <span className="text-thread-pine font-medium">{user.followingCount}</span>
          </div>
        </div>
      </div>

      {/* Join Date */}
      <div className="mb-4 pt-3 border-t border-thread-sage/20">
        <span className="thread-label">
          Joined {joinDate}
        </span>
      </div>

      {/* Action */}
      {profileLink && (
        <div className="mt-auto">
          <Link
            href={profileLink}
            className="thread-button text-sm w-full text-center block"
          >
            Visit Profile
          </Link>
        </div>
      )}
    </div>
  );
}