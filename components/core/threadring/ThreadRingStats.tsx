import { useState, useEffect } from "react";
import UserMention from "@/components/ui/navigation/UserMention";

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
  membershipInfo?: {
    owner: {
      actorDid: string;
      actorName: string | null;
      displayName: string;
      joinedAt: string;
    } | null;
    moderators: Array<{
      actorDid: string;
      actorName: string | null;
      displayName: string;
      joinedAt: string;
    }>;
  };
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
      <div className={`bg-white p-4 ${className}`}>
        <div className="text-sm text-nb-ink-mid">Loading statistics...</div>
      </div>
    );
  }

  if (error || !stats) {
    // Stats are a nice-to-have — degrade quietly, no red error
    return (
      <div className={`bg-white p-4 ${className}`}>
        <div className="text-sm text-nb-ink-mid">Stats aren&apos;t available right now.</div>
      </div>
    );
  }

  return (
    <div className={`tr-stats tr-sidebar-widget bg-white p-4 ${className}`}>
      <div className="tr-stats-content space-y-6 text-sm">
        {/* Overview */}
        <div className="tr-stats-overview">
          <h4 className="tr-stats-section-title font-medium text-nb-ink mb-2">Overview</h4>
          <div className="tr-stats-grid grid grid-cols-2 gap-3">
            <div className="tr-stats-item tr-member-count-stat p-2 border-2 border-dotted border-nb-ink-mid/60 rounded-md">
              <div className="tr-stat-value font-medium text-nb-ink">{stats.memberCount}</div>
              <div className="tr-stat-label text-xs text-nb-ink-mid">Total Members</div>
            </div>
            <div className="tr-stats-item tr-post-count-stat p-2 border-2 border-dotted border-nb-ink-mid/60 rounded-md">
              <div className="tr-stat-value font-medium text-nb-ink">{stats.postCount}</div>
              <div className="tr-stat-label text-xs text-nb-ink-mid">Total Posts</div>
            </div>
            <div className="tr-stats-item tr-pinned-count-stat p-2 border-2 border-dotted border-nb-ink-mid/60 rounded-md">
              <div className="tr-stat-value font-medium text-nb-ink">{stats.pinnedPostCount}</div>
              <div className="tr-stat-label text-xs text-nb-ink-mid">Pinned Posts</div>
            </div>
            <div className="tr-stats-item tr-moderator-count-stat p-2 border-2 border-dotted border-nb-ink-mid/60 rounded-md">
              <div className="tr-stat-value font-medium text-nb-ink">{stats.moderatorCount}</div>
              <div className="tr-stat-label text-xs text-nb-ink-mid">Moderators</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="tr-stats-activity">
          <h4 className="tr-stats-section-title font-medium text-nb-ink mb-2">This Week</h4>
          <div className="tr-stats-activity-list space-y-1 text-nb-ink">
            <div className="tr-stats-activity-item flex justify-between">
              <span className="tr-activity-label">New Members:</span>
              <span className="tr-activity-value font-medium text-nb-ink">{stats.recentActivity.newMembersThisWeek}</span>
            </div>
            <div className="tr-stats-activity-item flex justify-between">
              <span className="tr-activity-label">New Posts:</span>
              <span className="tr-activity-value font-medium text-nb-ink">{stats.recentActivity.newPostsThisWeek}</span>
            </div>
          </div>
        </div>

        {/* Top Posters */}
        {stats.topPosters.length > 0 && (
          <div>
            <h4 className="font-medium text-nb-ink mb-2">Top Contributors</h4>
            <div className="space-y-1">
              {stats.topPosters.slice(0, 5).map((poster, index) => (
                <div key={poster.username} className="flex justify-between text-xs text-nb-ink">
                  <span>
                    {index + 1}.{" "}
                    <UserMention
                      username={poster.username}
                      displayName={poster.displayName || undefined}
                    />
                  </span>
                  <span className="font-medium text-nb-ink">{poster.postCount} posts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Growth Trend (simplified) */}
        {stats.membershipTrend.length > 0 && (
          <div>
            <h4 className="font-medium text-nb-ink mb-2">Growth</h4>
            <div className="text-xs text-nb-ink">
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

        {/* Membership Info (for non-members) */}
        {stats.membershipInfo && (stats.membershipInfo.owner || stats.membershipInfo.moderators.length > 0) && (
          <div>
            <h4 className="font-medium text-nb-ink mb-2">Leadership</h4>
            <div className="space-y-2 text-xs text-nb-ink">
              {stats.membershipInfo.owner && (
                <div>
                  <div className="font-medium text-nb-ink">Owner</div>
                  <div className="pl-2">
                    <UserMention
                      username={stats.membershipInfo.owner.actorName || stats.membershipInfo.owner.displayName}
                      displayName={stats.membershipInfo.owner.displayName}
                    />
                    <span className="text-nb-ink-mid ml-1">
                      (joined {new Date(stats.membershipInfo.owner.joinedAt).toLocaleDateString()})
                    </span>
                  </div>
                </div>
              )}

              {stats.membershipInfo.moderators.length > 0 && (
                <div>
                  <div className="font-medium text-nb-ink">Moderators</div>
                  <div className="pl-2 space-y-1">
                    {stats.membershipInfo.moderators.map((mod, index) => (
                      <div key={index}>
                        <UserMention
                          username={mod.actorName || mod.displayName}
                          displayName={mod.displayName}
                        />
                        <span className="text-nb-ink-mid ml-1">
                          (joined {new Date(mod.joinedAt).toLocaleDateString()})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}