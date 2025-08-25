import { useState, useEffect } from "react";
import Link from "next/link";

interface ThreadRingInvite {
  id: string;
  status: string;
  createdAt: string;
  threadRing: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    memberCount: number;
    postCount: number;
  };
  inviter: {
    handle: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
}

interface ThreadRingInvitesProps {
  limit?: number;
  showTitle?: boolean;
}

export default function ThreadRingInvites({ 
  limit = 5, 
  showTitle = true 
}: ThreadRingInvitesProps) {
  const [invites, setInvites] = useState<ThreadRingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/threadrings/invites?limit=${limit}&status=pending`);
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not logged in, don't show error
          setInvites([]);
          return;
        }
        throw new Error("Failed to fetch invites");
      }

      const data = await response.json();
      setInvites(data.invites);
    } catch (error: any) {
      console.error("Error fetching invites:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteResponse = async (inviteId: string, action: "accept" | "decline") => {
    try {
      setResponding(inviteId);
      
      const response = await fetch(`/api/threadrings/invites/${inviteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to respond to invite");
      }

      const result = await response.json();
      
      // Remove the invite from the list
      setInvites(prev => prev.filter(invite => invite.id !== inviteId));
      
      // Show success message (you could implement a toast system here)
      console.log(result.message);
      
    } catch (error: any) {
      console.error("Error responding to invite:", error);
      alert(error.message || "Failed to respond to invite");
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-600">
        Loading invites...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Error loading invites: {error}
      </div>
    );
  }

  if (invites.length === 0) {
    return null; // Don't show anything if no invites
  }

  return (
    <div className="bg-white border border-black p-4 shadow-[2px_2px_0_#000]">
      {showTitle && (
        <h3 className="font-bold mb-3">
          ThreadRing Invites ({invites.length})
        </h3>
      )}
      
      <div className="space-y-3">
        {invites.map((invite) => (
          <div 
            key={invite.id} 
            className="border border-gray-300 p-3 bg-gray-50"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <Link 
                  href={`/tr/${invite.threadRing.slug}`}
                  className="font-medium text-black hover:text-blue-700 hover:underline block"
                >
                  {invite.threadRing.name}
                </Link>
                <div className="text-xs text-gray-600 mt-1">
                  Invited by {invite.inviter.displayName || `@${invite.inviter.handle}`}
                  {" • "}
                  {invite.threadRing.memberCount} members
                  {" • "}
                  {invite.threadRing.postCount} posts
                </div>
                {invite.threadRing.description && (
                  <p className="text-xs text-gray-700 mt-1 line-clamp-1">
                    {invite.threadRing.description}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleInviteResponse(invite.id, "accept")}
                disabled={responding === invite.id}
                className="text-xs bg-green-200 hover:bg-green-300 border border-black px-3 py-1 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all disabled:opacity-50"
              >
                {responding === invite.id ? "..." : "Accept"}
              </button>
              <button
                onClick={() => handleInviteResponse(invite.id, "decline")}
                disabled={responding === invite.id}
                className="text-xs bg-red-200 hover:bg-red-300 border border-black px-3 py-1 shadow-[1px_1px_0_#000] hover:shadow-[2px_2px_0_#000] transition-all disabled:opacity-50"
              >
                {responding === invite.id ? "..." : "Decline"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}