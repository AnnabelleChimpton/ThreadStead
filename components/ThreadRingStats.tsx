import { useState, useEffect } from "react";

interface ThreadRingStatsProps {
  threadRingSlug: string;
  className?: string;
}

interface StatsData {
  memberCount: number;
  postCount: number;
  pinnedPostCount: number;
  moderatorCount: number;
  recentActivity: {
    newMembersThisWeek: number;
    newPostsThisWeek: number;
  };
  topPosters: Array<{
    username: string;
    displayName?: string;
    postCount: number;
  }>;
  membershipTrend: Array<{
    date: string;
    count: number;
  }>;
}

export default function ThreadRingStats({ 
  threadRingSlug, 
  className = ""
}: ThreadRingStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [threadRingSlug]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/threadrings/${threadRingSlug}/stats`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch statistics");
      }

      const data = await response.json();
      setStats(data);
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white border border-black p-4 shadow-[2px_2px_0_#000] ${className}`}>
        <h3 className="font-bold mb-3">ThreadRing Statistics</h3>
        <div className="text-sm text-gray-600">Loading statistics...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={`bg-white border border-black p-4 shadow-[2px_2px_0_#000] ${className}`}>
        <h3 className="font-bold mb-3">ThreadRing Statistics</h3>
        <div className="text-sm text-red-600">
          {error || "Failed to load statistics"}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-black p-4 shadow-[2px_2px_0_#000] ${className}`}>
      <h3 className="font-bold mb-4">ThreadRing Statistics</h3>
      
      <div className="space-y-6 text-sm">
        {/* Overview */}
        <div>
          <h4 className="font-medium mb-2">Overview</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-2 border border-gray-300">
              <div className="font-medium">{stats.memberCount}</div>
              <div className="text-xs text-gray-600">Total Members</div>
            </div>
            <div className="bg-gray-50 p-2 border border-gray-300">
              <div className="font-medium">{stats.postCount}</div>
              <div className="text-xs text-gray-600">Total Posts</div>
            </div>
            <div className="bg-gray-50 p-2 border border-gray-300">
              <div className="font-medium">{stats.pinnedPostCount}</div>
              <div className="text-xs text-gray-600">Pinned Posts</div>
            </div>
            <div className="bg-gray-50 p-2 border border-gray-300">
              <div className="font-medium">{stats.moderatorCount}</div>
              <div className="text-xs text-gray-600">Moderators</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="font-medium mb-2">This Week</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>New Members:</span>
              <span className="font-medium">{stats.recentActivity.newMembersThisWeek}</span>
            </div>
            <div className="flex justify-between">
              <span>New Posts:</span>
              <span className="font-medium">{stats.recentActivity.newPostsThisWeek}</span>
            </div>
          </div>
        </div>

        {/* Top Posters */}
        {stats.topPosters.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Top Contributors</h4>
            <div className="space-y-1">
              {stats.topPosters.slice(0, 5).map((poster, index) => (
                <div key={poster.username} className="flex justify-between text-xs">
                  <span>
                    {index + 1}. {poster.displayName || `@${poster.username}`}
                  </span>
                  <span className="font-medium">{poster.postCount} posts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Growth Trend (simplified) */}
        {stats.membershipTrend.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Growth</h4>
            <div className="text-xs text-gray-600">
              {stats.membershipTrend.length > 1 ? (
                <span>
                  {stats.membershipTrend[stats.membershipTrend.length - 1].count - 
                   stats.membershipTrend[0].count > 0 ? "↗" : "→"} 
                  {" "}
                  {Math.abs(stats.membershipTrend[stats.membershipTrend.length - 1].count - 
                           stats.membershipTrend[0].count)} members this month
                </span>
              ) : (
                <span>Not enough data for trend analysis</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}