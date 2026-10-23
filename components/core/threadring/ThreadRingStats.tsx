import { useState, useEffect } from "react";
import UserMention from "@/components/ui/navigation/UserMention";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";

interface ThreadRingStatsProps {
  threadRingSlug: string;
  className?: string;
}

type Person = { username: string | null; displayName: string };

/** Only what the hub keeps (pages/api/threadrings/[slug]/stats.ts). */
interface StatsData {
  memberCount: number;
  postCount: number;
  host: Person | null;
  moderators: Person[];
}

function Name({ person }: { person: Person }) {
  return person.username
    ? <UserMention username={person.username} displayName={person.displayName} />
    : <span>{person.displayName}</span>;
}

export default function ThreadRingStats({
  threadRingSlug,
  className = ""
}: ThreadRingStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/threadrings/${encodeURIComponent(threadRingSlug)}/stats`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [threadRingSlug]);

  if (loading) {
    return (
      <div className={`bg-white p-4 ${className}`}>
        <LoadingSpinner message="Loading statistics..." className="py-4" />
      </div>
    );
  }

  if (!stats) {
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
        <div className="tr-stats-overview">
          <div className="tr-stats-grid grid grid-cols-2 gap-3">
            <div className="tr-stats-item tr-member-count-stat p-2 border-2 border-dotted border-nb-ink-mid/60 rounded-md">
              <div className="tr-stat-value font-medium text-nb-ink">{stats.memberCount}</div>
              <div className="tr-stat-label text-xs text-nb-ink-mid">Members</div>
            </div>
            <div className="tr-stats-item tr-post-count-stat p-2 border-2 border-dotted border-nb-ink-mid/60 rounded-md">
              <div className="tr-stat-value font-medium text-nb-ink">{stats.postCount}</div>
              <div className="tr-stat-label text-xs text-nb-ink-mid">Posts</div>
            </div>
          </div>
        </div>

        {(stats.host || stats.moderators.length > 0) && (
          <div className="space-y-2 text-xs text-nb-ink">
            {stats.host && (
              <div>
                <div className="font-medium text-nb-ink">Host</div>
                <div className="pl-2"><Name person={stats.host} /></div>
              </div>
            )}
            {stats.moderators.length > 0 && (
              <div>
                <div className="font-medium text-nb-ink">Moderators</div>
                <div className="pl-2 space-y-1">
                  {stats.moderators.map((person, index) => (
                    <div key={person.username ?? index}><Name person={person} /></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
