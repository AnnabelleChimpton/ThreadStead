import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';

interface RandomMember {
  id: string;
  handle: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  role: string;
  stats: {
    posts: number;
    followers: number;
  };
  foundInRing?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface RandomMemberDiscoveryProps {
  threadRingSlug: string;
  threadRingName: string;
  enableLineageDiscovery?: boolean;
}

export default function RandomMemberDiscovery({ 
  threadRingSlug, 
  threadRingName,
  enableLineageDiscovery = true 
}: RandomMemberDiscoveryProps) {
  const router = useRouter();
  const [member, setMember] = useState<RandomMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<'ring' | 'lineage'>('ring');
  const [discoveryInfo, setDiscoveryInfo] = useState<{
    totalCandidates: number;
    discoveryType: string;
  } | null>(null);

  const discoverRandomMember = async (selectedScope: 'ring' | 'lineage' = scope) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/threadrings/${threadRingSlug}/random-member?scope=${selectedScope}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to discover member');
      }

      if (!data.member) {
        setError('No members available for discovery');
        setMember(null);
        setDiscoveryInfo(null);
        return;
      }

      setMember(data.member);
      setDiscoveryInfo({
        totalCandidates: data.totalCandidates,
        discoveryType: data.discoveryType
      });
      setScope(selectedScope);
    } catch (err) {
      console.error('Error discovering member:', err);
      setError(err instanceof Error ? err.message : 'Failed to discover member');
      setMember(null);
      setDiscoveryInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const visitMember = () => {
    if (member?.handle) {
      router.push(`/resident/${member.handle}`);
    }
  };

  return (
    <div className="bg-white p-4">
      <p className="text-gray-600 mb-4 text-sm">
        Discover random members from {threadRingName} or explore the extended family tree.
      </p>

      {/* Scope Selection */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => discoverRandomMember('ring')}
          disabled={loading}
          className={`px-3 py-2 text-sm font-medium border border-black shadow-[2px_2px_0_#000] transition-all ${
            scope === 'ring' && !loading
              ? 'bg-blue-200 hover:bg-blue-300'
              : 'bg-gray-100 hover:bg-gray-200'
          } ${loading ? 'cursor-not-allowed opacity-50' : 'hover:shadow-[3px_3px_0_#000]'}`}
        >
          {loading && scope === 'ring' ? '🎲' : '👥'} This Ring
        </button>
        
        {enableLineageDiscovery && (
          <button
            onClick={() => discoverRandomMember('lineage')}
            disabled={loading}
            className={`px-3 py-2 text-sm font-medium border border-black shadow-[2px_2px_0_#000] transition-all ${
              scope === 'lineage' && !loading
                ? 'bg-green-200 hover:bg-green-300'
                : 'bg-gray-100 hover:bg-gray-200'
            } ${loading ? 'cursor-not-allowed opacity-50' : 'hover:shadow-[3px_3px_0_#000]'}`}
          >
            {loading && scope === 'lineage' ? '🎲' : '🌳'} Family Tree
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Member Display */}
      {member && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {member.avatarUrl ? (
                <Image
                  src={member.avatarUrl}
                  alt={member.displayName || member.handle || 'User'}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full border-2 border-black"
                />
              ) : (
                <div className="w-12 h-12 rounded-full border-2 border-black bg-gray-300 flex items-center justify-center">
                  <span className="text-xl">👤</span>
                </div>
              )}
            </div>

            {/* Member Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-thread-pine truncate">
                  {member.displayName || `@${member.handle}`}
                </h4>
                {member.role === 'curator' && (
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded border">
                    Curator
                  </span>
                )}
                {member.role === 'moderator' && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded border">
                    Moderator
                  </span>
                )}
              </div>
              
              {member.displayName && (
                <p className="text-sm text-gray-600 mb-1">@{member.handle}</p>
              )}
              
              {member.bio && (
                <p className="text-sm text-gray-700 mb-2 line-clamp-2">{member.bio}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                <span>{member.stats.posts} posts</span>
                <span>{member.stats.followers} followers</span>
                <span>
                  Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </span>
              </div>

              {/* Found in ring (for lineage discovery) */}
              {member.foundInRing && member.foundInRing.slug !== threadRingSlug && (
                <div className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded mb-2 inline-block">
                  Found in: {member.foundInRing.name}
                </div>
              )}
            </div>
          </div>

          {/* Visit Button */}
          <button
            onClick={visitMember}
            className="w-full mt-3 px-4 py-2 bg-thread-pine text-white font-medium border border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] hover:bg-thread-pine/90 transition-all"
          >
            Visit @{member.handle}
          </button>
        </div>
      )}

      {/* Discovery Info */}
      {discoveryInfo && (
        <div className="text-xs text-gray-600 mb-4">
          {scope === 'ring' ? 'Ring members' : 'Family tree members'}: {discoveryInfo.totalCandidates} discoverable
        </div>
      )}

      {/* Quick Discovery Button (when no member shown) */}
      {!member && !loading && (
        <button
          onClick={() => discoverRandomMember('ring')}
          className="w-full px-4 py-3 bg-blue-100 hover:bg-blue-200 text-thread-pine font-medium border border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all"
        >
          🎲 Discover Random Member
        </button>
      )}

      {/* Another Discovery Button (when member is shown) */}
      {member && !loading && (
        <button
          onClick={() => discoverRandomMember(scope)}
          className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-thread-sage font-medium border border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all"
        >
          🎲 Discover Another
        </button>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin text-2xl">🎲</div>
          <p className="text-sm text-gray-600 mt-2">Finding a random member...</p>
        </div>
      )}
    </div>
  );
}