import React, { useEffect, useState } from "react";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import { useMe } from "@/hooks/useMe";
import Link from "next/link";

interface BlockedUser {
  id: string;
  createdAt: string;
  reason?: string;
  blockedUser?: {
    id: string;
    primaryHandle: string;
    profile?: {
      displayName?: string;
      avatarUrl?: string;
    };
  };
}

interface BlockedThreadRing {
  id: string;
  createdAt: string;
  reason?: string;
  blockedThreadRing?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface UserBlocks {
  blocks: (BlockedUser | BlockedThreadRing)[];
}

export default function BlocksPage() {
  const { me, isLoading } = useMe();
  const [blocks, setBlocks] = useState<(BlockedUser | BlockedThreadRing)[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    if (me?.loggedIn) {
      loadBlocks();
    }
  }, [me]);

  async function loadBlocks() {
    try {
      const response = await fetch("/api/blocks");
      if (response.ok) {
        const data: UserBlocks = await response.json();
        setBlocks(data.blocks);
      }
    } catch (error) {
      console.error("Failed to load blocks:", error);
    } finally {
      setLoading(false);
    }
  }

  async function unblock(block: BlockedUser | BlockedThreadRing) {
    setUnblocking(block.id);
    try {
      const payload: { blockedUserId?: string; blockedThreadRingId?: string } = {};
      
      if ('blockedUser' in block && block.blockedUser) {
        payload.blockedUserId = block.blockedUser.id;
      } else if ('blockedThreadRing' in block && block.blockedThreadRing) {
        payload.blockedThreadRingId = block.blockedThreadRing.id;
      }

      const response = await fetch("/api/blocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Remove from local state
        setBlocks(blocks.filter(b => b.id !== block.id));
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to unblock");
      }
    } catch (error) {
      console.error("Error unblocking:", error);
      alert("Failed to unblock");
    } finally {
      setUnblocking(null);
    }
  }

  function isBlockedUser(block: BlockedUser | BlockedThreadRing): block is BlockedUser {
    return 'blockedUser' in block;
  }

  if (isLoading) {
    return <Layout><div>Loading...</div></Layout>;
  }

  if (!me?.loggedIn) {
    return (
      <Layout>
        <RetroCard title="Access Denied">
          <p>You need to be logged in to manage your blocked users and communities.</p>
        </RetroCard>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/settings"
            className="px-3 py-2 border border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] no-underline text-sm"
          >
            ← Back to Settings
          </Link>
        </div>
        <RetroCard title="Blocked Users & Communities">
          <p className="mb-4 text-gray-600">
            Manage the users and ThreadRings you&apos;ve blocked. Blocked users&apos; posts and comments won&apos;t appear in your feeds, 
            and blocked ThreadRings won&apos;t show up in your content.
          </p>

          {loading ? (
            <div className="text-center py-8">Loading your blocked list...</div>
          ) : blocks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">🎉 You haven&apos;t blocked anyone yet!</p>
              <p className="text-sm">When you block users or ThreadRings, they&apos;ll appear here and you can manage them.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blocks.map((block) => (
                <div key={block.id} className="flex items-center justify-between p-4 border border-gray-300 rounded bg-gray-50">
                  <div className="flex-1">
                    {isBlockedUser(block) && block.blockedUser ? (
                      <>
                        <div className="font-semibold flex items-center gap-2">
                          {block.blockedUser.profile?.avatarUrl && (
                            <div 
                              style={{ backgroundImage: `url(${block.blockedUser.profile.avatarUrl})` }}
                              className="w-6 h-6 rounded-full bg-cover bg-center"
                            />
                          )}
                          👤 {block.blockedUser.profile?.displayName || block.blockedUser.primaryHandle}
                          <span className="text-sm text-gray-500">(@{block.blockedUser.primaryHandle})</span>
                        </div>
                        <div className="text-sm text-gray-600">User</div>
                      </>
                    ) : (
                      'blockedThreadRing' in block && block.blockedThreadRing && (
                        <>
                          <div className="font-semibold flex items-center gap-2">
                            🔗 {block.blockedThreadRing.name}
                            <span className="text-sm text-gray-500">(/{block.blockedThreadRing.slug})</span>
                          </div>
                          <div className="text-sm text-gray-600">ThreadRing</div>
                        </>
                      )
                    )}
                    
                    <div className="text-xs text-gray-500 mt-1">
                      Blocked on {new Date(block.createdAt).toLocaleDateString()}
                      {block.reason && (
                        <span className="ml-2">• Reason: {block.reason}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => unblock(block)}
                    disabled={unblocking === block.id}
                    className="border border-black px-3 py-1 bg-red-200 hover:bg-red-100 shadow-[2px_2px_0_#000] text-sm disabled:opacity-50"
                  >
                    {unblocking === block.id ? "Unblocking..." : "Unblock"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </RetroCard>

        <RetroCard title="How Blocking Works">
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <strong>🚫 When you block a user:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Their posts won&apos;t appear in your feeds</li>
                <li>Their comments won&apos;t be visible to you</li>
                <li>They can still see your public content</li>
              </ul>
            </div>
            
            <div>
              <strong>🔗 When you block a ThreadRing:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Posts from that ThreadRing won&apos;t appear in your feeds</li>
                <li>You won&apos;t see notifications from that ThreadRing</li>
                <li>The ThreadRing remains publicly accessible</li>
              </ul>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <strong>💡 Tip:</strong> You can block users and ThreadRings by clicking the &quot;🚩 Report&quot; button 
              on their content, or use the block buttons on profiles and ThreadRing pages.
            </div>
          </div>
        </RetroCard>
      </div>
    </Layout>
  );
}