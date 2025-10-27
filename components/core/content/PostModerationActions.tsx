import React, { useState } from 'react';
import { PostModerationAction, PostModerationStatus } from '@/types/threadrings';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

interface PostModerationActionsProps {
  postId: string;
  currentStatus?: PostModerationStatus;
  isPinned?: boolean;
  canModerate: boolean;
  onModerationAction?: (action: PostModerationAction, reason?: string) => void;
}

export default function PostModerationActions({
  postId,
  currentStatus = 'PENDING',
  isPinned = false,
  canModerate,
  onModerationAction
}: PostModerationActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReasonDialog, setShowReasonDialog] = useState<PostModerationAction | null>(null);
  const [reason, setReason] = useState('');

  if (!canModerate) {
    return null;
  }

  const handleAction = async (action: PostModerationAction, requiresReason = false) => {
    if (requiresReason) {
      setShowReasonDialog(action);
      return;
    }

    await performAction(action);
  };

  const performAction = async (action: PostModerationAction, actionReason?: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await csrfFetch(`/api/threadrings/moderate/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          reason: actionReason || reason
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to moderate post');
      }

      const result = await response.json();
      onModerationAction?.(action, actionReason || reason);
      
      // Reset form
      setReason('');
      setShowReasonDialog(null);
      
    } catch (error) {
      console.error('Moderation action failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to moderate post');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReasonSubmit = async () => {
    if (!showReasonDialog) return;
    await performAction(showReasonDialog, reason);
  };

  const getActionButton = (action: PostModerationAction, label: string, className: string, requiresReason = false) => {
    const isDisabled = isProcessing || 
      (action === 'accept' && currentStatus === 'ACCEPTED') ||
      (action === 'reject' && currentStatus === 'REJECTED') ||
      (action === 'remove' && currentStatus === 'REMOVED') ||
      (action === 'pin' && isPinned) ||
      (action === 'unpin' && !isPinned);

    return (
      <button
        onClick={() => handleAction(action, requiresReason)}
        disabled={isDisabled}
        className={`px-3 py-1 text-xs font-medium rounded ${className} ${
          isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <>
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
        <span className="text-xs text-gray-500 mr-2">Moderate:</span>
        
        {currentStatus === 'PENDING' && (
          <>
            {getActionButton('accept', '✓ Accept', 'bg-green-100 text-green-700 border border-green-300')}
            {getActionButton('reject', '✗ Reject', 'bg-red-100 text-red-700 border border-red-300', true)}
          </>
        )}

        {currentStatus === 'ACCEPTED' && (
          <>
            {getActionButton('remove', '🗑️ Remove', 'bg-red-100 text-red-700 border border-red-300', true)}
            {isPinned 
              ? getActionButton('unpin', '📌 Unpin', 'bg-gray-100 text-gray-700 border border-gray-300')
              : getActionButton('pin', '📌 Pin', 'bg-blue-100 text-blue-700 border border-blue-300')
            }
          </>
        )}

        {(currentStatus === 'REJECTED' || currentStatus === 'REMOVED') && (
          <>
            {getActionButton('accept', '✓ Restore', 'bg-green-100 text-green-700 border border-green-300')}
          </>
        )}
      </div>

      {/* Current status indicator */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-gray-500">Status:</span>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          currentStatus === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
          currentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
          currentStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
          currentStatus === 'REMOVED' ? 'bg-gray-100 text-gray-700' :
          'bg-gray-100 text-gray-500'
        }`}>
          {currentStatus.toLowerCase()}
        </span>
        {isPinned && (
          <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
            📌 pinned
          </span>
        )}
      </div>

      {/* Reason dialog */}
      {showReasonDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {showReasonDialog === 'reject' ? 'Reject Post' : 'Remove Post'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for this action (optional):
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason..."
              maxLength={500}
              className="w-full p-3 border border-gray-300 rounded-md resize-none"
              rows={3}
            />
            <div className="text-xs text-gray-500 mb-4">
              {reason.length}/500 characters
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReasonDialog(null);
                  setReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleReasonSubmit}
                disabled={isProcessing}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                  showReasonDialog === 'reject' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing ? 'Processing...' : 
                 showReasonDialog === 'reject' ? 'Reject Post' : 'Remove Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}