import { useState, useEffect } from "react";
import Link from "next/link";

interface ForkData {
  id: string;
  createdAt: string;
  threadRing: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    memberCount: number;
    postCount: number;
  };
  createdBy: {
    handle: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
}

interface LineageData {
  parent: ForkData | null;
  children: ForkData[];
  ringName: string;
}

interface ThreadRingLineageProps {
  threadRingSlug: string;
  ringName: string;
  className?: string;
}

export default function ThreadRingLineage({ 
  threadRingSlug, 
  ringName,
  className = ""
}: ThreadRingLineageProps) {
  const [lineageData, setLineageData] = useState<LineageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLineage();
  }, [threadRingSlug]);

  const fetchLineage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/threadrings/${threadRingSlug}/lineage`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setLineageData({ parent: null, children: [], ringName }); // No lineage data
          return;
        }
        throw new Error("Failed to fetch lineage");
      }

      const data = await response.json();
      setLineageData(data);
    } catch (error: any) {
      console.error("Error fetching lineage:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white border border-black p-4 shadow-[2px_2px_0_#000] ${className}`}>
        <h3 className="font-bold mb-3">Fork Lineage</h3>
        <div className="text-sm text-gray-600">Loading forks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white border border-black p-4 shadow-[2px_2px_0_#000] ${className}`}>
        <h3 className="font-bold mb-3">Fork Lineage</h3>
        <div className="text-sm text-red-600">{error}</div>
      </div>
    );
  }

  const renderFork = (fork: ForkData, isParent: boolean = false) => (
    <div 
      key={fork.id} 
      className="border border-gray-300 p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link 
            href={`/threadrings/${fork.threadRing.slug}`}
            className="font-medium text-black hover:text-blue-700 hover:underline block"
          >
            {isParent ? "🌱" : "🍴"} {fork.threadRing.name}
          </Link>
          {fork.threadRing.description && (
            <p className="text-xs text-gray-700 mt-1 line-clamp-2">
              {fork.threadRing.description}
            </p>
          )}
          <div className="text-xs text-gray-600 mt-2 flex items-center gap-3">
            <span>
              {isParent ? "Original by" : "Forked by"} {fork.createdBy.displayName || `@${fork.createdBy.handle}`}
            </span>
            <span>•</span>
            <span>
              {new Date(fork.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <div className="text-xs text-gray-600 text-right">
          <div>{fork.threadRing.memberCount} members</div>
          <div>{fork.threadRing.postCount} posts</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`bg-white border border-black p-4 shadow-[2px_2px_0_#000] ${className}`}>
      <h3 className="font-bold mb-3">Fork Lineage</h3>
      
      {!lineageData?.parent && lineageData?.children.length === 0 ? (
        <div className="text-sm text-gray-600">
          No fork relationships yet. This ThreadRing can be forked to create derivative communities!
        </div>
      ) : (
        <div className="space-y-4">
          {/* Parent (if this is a fork) */}
          {lineageData?.parent && (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                <strong>{ringName}</strong> was forked from:
              </p>
              {renderFork(lineageData.parent, true)}
            </div>
          )}

          {/* Children (forks of this ring) */}
          {lineageData?.children && lineageData.children.length > 0 && (
            <div>
              {lineageData.parent && <div className="border-t border-gray-300 pt-4"></div>}
              <p className="text-sm text-gray-600 mb-2">
                ThreadRings forked from <strong>{ringName}</strong>:
              </p>
              <div className="space-y-2">
                {lineageData.children.map((fork) => renderFork(fork, false))}
              </div>
            </div>
          )}

          {/* Footer */}
          {(lineageData?.parent || (lineageData?.children && lineageData.children.length > 0)) && (
            <div className="pt-2 border-t border-gray-300">
              <p className="text-xs text-gray-500 italic">
                Fork genealogy helps track the evolution of communities and ideas across ThreadRings.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}