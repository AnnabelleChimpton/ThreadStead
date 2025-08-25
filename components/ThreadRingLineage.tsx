import { useState, useEffect } from "react";
import Link from "next/link";

interface RingDescriptor {
  id: string;
  slug: string;
  name: string;
  description?: string;
  createdAt: string;
  memberCount?: number;
  postCount?: number;
  ownerDid?: string;
  metadata?: any;
}

interface LineageData {
  ring: RingDescriptor;
  ancestors: RingDescriptor[];
  descendants: RingDescriptor[];
  parents: RingDescriptor[];
  children: RingDescriptor[];
  directChildrenCount: number;
  totalDescendantsCount: number;
  lineageDepth: number;
  lineagePath: string;
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
          // Create empty lineage structure for no data case
          setLineageData({
            ring: { id: '', slug: threadRingSlug, name: ringName, createdAt: '' },
            ancestors: [],
            descendants: [],
            parents: [],
            children: [],
            directChildrenCount: 0,
            totalDescendantsCount: 0,
            lineageDepth: 0,
            lineagePath: ringName
          });
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

  const renderRing = (ring: RingDescriptor, isParent: boolean = false) => (
    <div 
      key={ring.id} 
      className="border border-gray-300 p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link 
            href={`/tr/${ring.slug}`}
            className="font-medium text-black hover:text-blue-700 hover:underline block"
          >
            {isParent ? "🌱" : "🍴"} {ring.name}
          </Link>
          {ring.description && (
            <p className="text-xs text-gray-700 mt-1 line-clamp-2">
              {ring.description}
            </p>
          )}
          <div className="text-xs text-gray-600 mt-2 flex items-center gap-3">
            <span>
              {isParent ? "Original" : "Fork"}
            </span>
            <span>•</span>
            <span>
              {new Date(ring.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <div className="text-xs text-gray-600 text-right">
          <div>{ring.memberCount || 0} members</div>
          <div>{ring.postCount || 0} posts</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`bg-white border border-black p-4 shadow-[2px_2px_0_#000] ${className}`}>
      <h3 className="font-bold mb-3">Fork Lineage</h3>
      
      {(lineageData?.directChildrenCount || 0) === 0 && (lineageData?.lineageDepth || 0) === 0 ? (
        <div className="text-sm text-gray-600">
          No fork relationships yet. This ThreadRing can be forked to create derivative communities!
        </div>
      ) : (
        <div className="space-y-4">
          {/* Lineage Overview */}
          <div className="bg-gray-50 border border-gray-200 p-3 rounded">
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>Lineage Depth:</strong> {lineageData?.lineageDepth || 0} levels from root</div>
              <div><strong>Direct Children:</strong> {lineageData?.directChildrenCount || 0}</div>
              <div><strong>Total Descendants:</strong> {lineageData?.totalDescendantsCount || 0}</div>
              {lineageData?.lineagePath && (
                <div><strong>Path:</strong> {lineageData.lineagePath}</div>
              )}
            </div>
          </div>

          {/* Parent (immediate ancestor) */}
          {lineageData?.parents && lineageData.parents.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                <strong>{ringName}</strong> was forked from:
              </p>
              {renderRing(lineageData.parents[0], true)}
            </div>
          )}

          {/* Children (direct forks of this ring) */}
          {lineageData?.children && lineageData.children.length > 0 && (
            <div>
              {lineageData.parents && lineageData.parents.length > 0 && <div className="border-t border-gray-300 pt-4"></div>}
              <p className="text-sm text-gray-600 mb-2">
                ThreadRings forked from <strong>{ringName}</strong>:
              </p>
              <div className="space-y-2">
                {lineageData.children.map((ring) => renderRing(ring, false))}
              </div>
            </div>
          )}

          {/* Full Ancestor Chain */}
          {lineageData?.ancestors && lineageData.ancestors.length > 0 && (
            <div>
              <div className="border-t border-gray-300 pt-4"></div>
              <p className="text-sm text-gray-600 mb-2">
                Full ancestry chain:
              </p>
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                {lineageData.ancestors.map((ancestor, index) => (
                  <span key={ancestor.id}>
                    <Link href={`/tr/${ancestor.slug}`} className="text-blue-600 hover:underline">
                      {ancestor.name}
                    </Link>
                    {index < lineageData.ancestors.length - 1 && ' → '}
                  </span>
                ))}
                {' → '}
                <span className="font-medium">{ringName}</span>
              </div>
            </div>
          )}

          {/* Footer */}
          {((lineageData?.lineageDepth || 0) > 0 || (lineageData?.directChildrenCount || 0) > 0) && (
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