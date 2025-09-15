import React, { useState, useEffect } from 'react';

interface BetaInviteCode {
  id: string;
  code: string;
  createdAt: string;
  usedAt: string | null;
  isUsed: boolean;
  usedBy: {
    displayName: string;
    handle: string | null;
  } | null;
}

interface BetaInviteCodesManagerProps {
  className?: string;
}

export default function BetaInviteCodesManager({ className = '' }: BetaInviteCodesManagerProps) {
  const [codes, setCodes] = useState<BetaInviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  useEffect(() => {
    fetchBetaInviteCodes();
  }, []);

  const fetchBetaInviteCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/beta-invite-codes');
      
      if (!response.ok) {
        throw new Error('Failed to fetch beta invite codes');
      }
      
      const data = await response.json();
      setCodes(data.codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const trackShare = async (codeId: string, shareMethod: string, platform?: string) => {
    try {
      await fetch(`/api/beta-invite-codes/${codeId}/track-share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shareMethod,
          platform,
          referrer: document.referrer || window.location.href
        })
      });
    } catch (err) {
      console.error('Failed to track share:', err);
      // Don't block the copy operation if tracking fails
    }
  };

  const copyToClipboard = async (code: string, codeId: string, shareMethod: 'copy_link' | 'copy_code' = 'copy_link') => {
    try {
      let textToCopy: string;

      if (shareMethod === 'copy_link') {
        // Create shareable URL
        const baseUrl = window.location.origin;
        textToCopy = `${baseUrl}/signup?beta=${encodeURIComponent(code)}`;
      } else {
        // Just copy the code
        textToCopy = code;
      }

      await navigator.clipboard.writeText(textToCopy);
      setCopiedCodeId(codeId);

      // Track the share
      await trackShare(codeId, shareMethod);

      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback: select the text
      const textArea = document.createElement('textarea');
      textArea.value = shareMethod === 'copy_link'
        ? `${window.location.origin}/signup?beta=${encodeURIComponent(code)}`
        : code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCodeId(codeId);

      // Track the share even if clipboard API failed
      await trackShare(codeId, shareMethod);

      setTimeout(() => setCopiedCodeId(null), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎫</span>
          <h2 className="text-xl font-bold">Beta Invite Codes</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          Loading your beta invite codes...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎫</span>
          <h2 className="text-xl font-bold">Beta Invite Codes</h2>
        </div>
        <div className="text-center py-8 text-red-600">
          Error: {error}
          <button 
            onClick={fetchBetaInviteCodes}
            className="block mx-auto mt-2 px-4 py-2 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const unusedCodes = codes.filter(code => !code.isUsed);
  const usedCodes = codes.filter(code => code.isUsed);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">🎫</span>
        <h2 className="text-xl font-bold">Beta Invite Codes</h2>
      </div>
      
      <div className="bg-blue-50 border border-black rounded-none p-4 shadow-[2px_2px_0_#000]">
        <p className="text-sm text-gray-700 mb-2">
          <strong>Share these codes with friends!</strong> Each new user gets 5 beta invite codes when they join.
        </p>
        <p className="text-xs text-gray-600">
          Click any code to copy a shareable registration link to your clipboard.
        </p>
      </div>

      {/* Available Codes */}
      {unusedCodes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="text-green-600">✓</span>
            Available Codes ({unusedCodes.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unusedCodes.map((code) => (
              <div
                key={code.id}
                className="bg-white border border-black rounded-none p-4 shadow-[2px_2px_0_#000]"
              >
                <div className="flex items-center justify-between mb-2">
                  <code className="text-lg font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
                    {code.code}
                  </code>
                  {copiedCodeId === code.id && (
                    <span className="text-xs text-green-600 font-medium">
                      ✓ Copied!
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 mb-3">
                  Created: {formatDate(code.createdAt)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(code.code, code.id, 'copy_link')}
                    className="flex-1 border border-black px-2 py-1 bg-blue-200 hover:bg-blue-100 shadow-[1px_1px_0_#000] text-xs"
                    title="Copy signup link"
                  >
                    📋 Copy Link
                  </button>
                  <button
                    onClick={() => copyToClipboard(code.code, code.id, 'copy_code')}
                    className="flex-1 border border-black px-2 py-1 bg-green-200 hover:bg-green-100 shadow-[1px_1px_0_#000] text-xs"
                    title="Copy just the code"
                  >
                    🔑 Copy Code
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Used Codes */}
      {usedCodes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="text-gray-500">●</span>
            Used Codes ({usedCodes.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {usedCodes.map((code) => (
              <div 
                key={code.id}
                className="bg-gray-50 border border-gray-300 rounded-none p-4 shadow-[1px_1px_0_#ccc]"
              >
                <div className="flex items-center justify-between mb-2">
                  <code className="text-lg font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded line-through">
                    {code.code}
                  </code>
                  <span className="text-xs text-gray-500 font-medium">
                    Used
                  </span>
                </div>
                {code.usedBy && (
                  <div className="text-xs text-gray-600 mb-1">
                    Used by: <strong>{code.usedBy.displayName}</strong>
                    {code.usedBy.handle && (
                      <span className="text-gray-500"> ({code.usedBy.handle})</span>
                    )}
                  </div>
                )}
                {code.usedAt && (
                  <div className="text-xs text-gray-600">
                    Used: {formatDate(code.usedAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {codes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-4 block">📭</span>
          <p>No beta invite codes found.</p>
          <p className="text-sm mt-2">Beta invite codes are generated automatically when you create your account.</p>
        </div>
      )}
    </div>
  );
}