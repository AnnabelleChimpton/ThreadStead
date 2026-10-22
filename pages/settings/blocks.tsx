import React, { useEffect, useState } from "react";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import { useMe } from "@/hooks/useMe";
import Link from "next/link";
import ButtonLink from "@/components/ui/ButtonLink";
import Button from "@/components/ui/Button";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { useToast } from "@/contexts/ToastContext";
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";

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
  const { showError } = useToast();

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

      const response = await csrfFetch("/api/blocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Remove from local state
        setBlocks(blocks.filter(b => b.id !== block.id));
      } else {
        const errorData = await response.json();
        showError(errorData.error || "Failed to unblock");
      }
    } catch (error) {
      console.error("Error unblocking:", error);
      showError("Failed to unblock");
    } finally {
      setUnblocking(null);
    }
  }

  function isBlockedUser(block: BlockedUser | BlockedThreadRing): block is BlockedUser {
    return 'blockedUser' in block;
  }

  if (isLoading) {
    return <Layout><LoadingSpinner className="py-8" /></Layout>;
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
        <div className="mb-4">
          <ButtonLink href="/settings" variant="secondary" size="sm">
            <PixelIcon name="arrow-left" className="inline-block align-[-3px] mr-1.5" />
            Back to Settings
          </ButtonLink>
        </div>
        <RetroCard title="Blocked Users & Communities" className="ts-phone-sheet">
          <p className="mb-4 text-gray-600">
            The people and ThreadRings you&apos;ve blocked. You won&apos;t see their posts or comments,
            and people you&apos;ve blocked can&apos;t message you.
          </p>

          {loading ? (
            <LoadingSpinner message="Loading your blocked list..." className="py-8" />
          ) : blocks.length === 0 ? (
            <EmptyState
              variant="plain"
              icon="trophy"
              title="You haven't blocked anyone yet!"
              description="To block someone, use the Block button on their page or click their name in the Chat Lounge."
            />
          ) : (
            // Phones: a plain list with lines between. Wider: a box per block.
            <div className="sm:space-y-3 border-t border-gray-200 sm:border-t-0">
              {blocks.map((block) => (
                <div key={block.id} className="flex items-center gap-3 py-3 border-b border-gray-200 sm:justify-between sm:p-4 sm:border sm:border-gray-300 sm:rounded sm:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    {isBlockedUser(block) && block.blockedUser ? (
                      <>
                        <div className="font-semibold flex flex-wrap items-center gap-x-2">
                          {block.blockedUser.profile?.avatarUrl && (
                            <div
                              style={{ backgroundImage: `url(${block.blockedUser.profile.avatarUrl})` }}
                              className="w-6 h-6 rounded-full bg-cover bg-center"
                            />
                          )}
                          <span className="min-w-0 break-words">
                            <PixelIcon name="user" className="inline-block align-[-2px] mr-2" />
                            {block.blockedUser.profile?.displayName || block.blockedUser.primaryHandle?.split('@')[0]}
                          </span>
                          <span className="text-sm font-normal text-gray-500 break-all">@{block.blockedUser.primaryHandle?.split('@')[0]}</span>
                        </div>
                        <div className="text-sm text-gray-600">User</div>
                      </>
                    ) : (
                      'blockedThreadRing' in block && block.blockedThreadRing && (
                        <>
                          <div className="font-semibold flex flex-wrap items-center gap-x-2">
                            <span className="min-w-0 break-words">
                              <PixelIcon name="link" className="inline-block align-[-2px] mr-2" />
                              {block.blockedThreadRing.name}
                            </span>
                            <span className="text-sm font-normal text-gray-500 break-all">/{block.blockedThreadRing.slug}</span>
                          </div>
                          <div className="text-sm text-gray-600">ThreadRing</div>
                        </>
                      )
                    )}

                    <div className="text-xs text-gray-500 mt-1">
                      Blocked on {new Date(block.createdAt).toLocaleDateString()}
                      {block.reason && (
                        <span className="block sm:inline"><span className="hidden sm:inline mx-1.5">·</span>Reason: {block.reason}</span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => unblock(block)}
                    disabled={unblocking === block.id}
                    className="shrink-0 min-h-[44px] sm:min-h-0 disabled:opacity-50"
                  >
                    {unblocking === block.id ? "Unblocking..." : "Unblock"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </RetroCard>

        <RetroCard title="How Blocking Works" className="ts-phone-sheet">
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <strong><PixelIcon name="close" className="inline-block align-middle" /> When you block a user:</strong>
              <ul className="list-disc mt-1" style={{ paddingLeft: "1.25rem", marginLeft: 0 }}>
                <li>Their posts don&apos;t show up in your feeds, in search or on their page</li>
                <li>Their comments are hidden from you, along with the replies under them</li>
                <li>They can&apos;t send you messages or whispers, and their Chat Lounge messages are hidden</li>
                <li>They aren&apos;t told. They can still see your public page and comment on your posts, and other people will see those comments</li>
              </ul>
            </div>

            <div>
              <strong><PixelIcon name="link" className="inline-block align-middle" /> When you block a ThreadRing:</strong>
              <ul className="list-disc mt-1" style={{ paddingLeft: "1.25rem", marginLeft: 0 }}>
                <li>Posts from that ThreadRing don&apos;t show up in your feeds or in search</li>
                <li>The ThreadRing stays public, and you can still visit it</li>
              </ul>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <strong><PixelIcon name="lightbulb" className="inline-block align-middle" /> Tip:</strong> You can block someone from the Block button on their page,
              or by clicking their name in the Chat Lounge. If someone is bothering you, <Link href="/help/contact">tell me</Link> too.
            </div>
          </div>
        </RetroCard>
      </div>
    </Layout>
  );
}