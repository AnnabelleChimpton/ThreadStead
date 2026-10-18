import React, { useState, useEffect } from "react";
import Image from "next/image";
import { PixelIcon } from '@/components/ui/PixelIcon';
import LoadingSpinner from "@/components/ui/feedback/LoadingSpinner";
import EmptyState from "@/components/ui/feedback/EmptyState";
import ErrorDisplay from "@/components/ui/feedback/ErrorDisplay";

export interface SelectedFriend {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string;
}

interface FriendManagerProps {
  selectedFriends: SelectedFriend[];
  onChange: (friends: SelectedFriend[]) => void;
  maxFriends?: number;
}

export default function FriendManager({ 
  selectedFriends, 
  onChange, 
  maxFriends = 8 
}: FriendManagerProps) {
  const [allFriends, setAllFriends] = useState<SelectedFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFriends();
  }, []);

  async function loadFriends() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/friends");
      if (response.status === 401) {
        setError("Please log in to manage friends");
        return;
      }
      if (!response.ok) {
        throw new Error(`Failed to load friends: ${response.status}`);
      }
      const data = await response.json();
      setAllFriends(data.friends || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function toggleFriend(friend: SelectedFriend) {
    const isSelected = selectedFriends.some(f => f.id === friend.id);
    
    if (isSelected) {
      // Remove friend
      onChange(selectedFriends.filter(f => f.id !== friend.id));
    } else {
      // Add friend (if under limit)
      if (selectedFriends.length < maxFriends) {
        onChange([...selectedFriends, friend]);
      }
    }
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const newFriends = [...selectedFriends];
    [newFriends[index - 1], newFriends[index]] = [newFriends[index], newFriends[index - 1]];
    onChange(newFriends);
  }

  function moveDown(index: number) {
    if (index === selectedFriends.length - 1) return;
    const newFriends = [...selectedFriends];
    [newFriends[index], newFriends[index + 1]] = [newFriends[index + 1], newFriends[index]];
    onChange(newFriends);
  }

  function removeFriend(friendId: string) {
    onChange(selectedFriends.filter(f => f.id !== friendId));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Featured Friends</h3>
        <LoadingSpinner message="Loading friends..." className="py-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Featured Friends</h3>
        <ErrorDisplay title="Error" message={error} onRetry={loadFriends} retryLabel="Retry" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Featured Friends</h3>
        <span className="text-sm text-nb-ink-mid">
          {selectedFriends.length}/{maxFriends} selected
        </span>
      </div>

      {/* Selected Friends (Display Order) */}
      {selectedFriends.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Will appear on your profile (in this order):</h4>
          <div className="space-y-2">
            {selectedFriends.map((friend, index) => (
              <div
                key={friend.id}
                className="flex items-center justify-between border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3 shadow-nb-sm"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={friend.avatarUrl}
                    alt={friend.displayName}
                    width={32}
                    height={32}
                    className="w-8 h-8 border-2 border-nb-ink-mid object-cover"
                    unoptimized={friend.avatarUrl?.endsWith('.gif')}
                  />
                  <div>
                    <div className="font-medium">{friend.displayName}</div>
                    <div className="text-sm text-nb-ink-mid">@{friend.handle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="thread-button-secondary btn btn--secondary text-xs disabled:opacity-50"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === selectedFriends.length - 1}
                    className="thread-button-secondary btn btn--secondary text-xs disabled:opacity-50"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeFriend(friend.id)}
                    className="thread-button-secondary btn btn--secondary text-xs"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Friends (Selection) */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">Select from your friends:</h4>
        {allFriends.length === 0 ? (
          <EmptyState
            title="No friends yet!"
            description="Start following people and they follow you back to become friends."
          />
        ) : (
          <div className="grid gap-2 max-h-96 overflow-y-auto border border-nb-ink-mid/40 p-3 bg-nb-ink-mid/5">
            {allFriends.map((friend) => {
              const isSelected = selectedFriends.some(f => f.id === friend.id);
              const canSelect = !isSelected && selectedFriends.length < maxFriends;
              
              return (
                <div
                  key={friend.id}
                  className={`flex items-center justify-between p-2 border border-nb-ink-mid shadow-nb-sm cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-green-200' 
                      : canSelect 
                        ? 'bg-white hover:bg-yellow-100' 
                        : 'bg-gray-200 opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => canSelect || isSelected ? toggleFriend(friend) : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={friend.avatarUrl}
                      alt={friend.displayName}
                      width={32}
                      height={32}
                      className="w-8 h-8 border-2 border-nb-ink-mid object-cover"
                      unoptimized={friend.avatarUrl?.endsWith('.gif')}
                    />
                    <div>
                      <div className="font-medium text-sm">{friend.displayName}</div>
                      <div className="text-xs text-nb-ink-mid">@{friend.handle}</div>
                    </div>
                  </div>
                  <div className="text-sm">
                    {isSelected ? (
                      <span className="text-nb-ink font-medium"><PixelIcon name="check" /> Selected</span>
                    ) : canSelect ? (
                      <span className="text-nb-ink-mid">Click to add</span>
                    ) : (
                      <span className="text-nb-ink-mid">Limit reached</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-xs text-nb-ink-mid">
        <p>• Select up to {maxFriends} friends to feature on your profile</p>
        <p>• Use ↑↓ buttons to change the order they appear</p>
        <p>• Only mutual friends (people who follow you back) can be featured</p>
      </div>
    </div>
  );
}