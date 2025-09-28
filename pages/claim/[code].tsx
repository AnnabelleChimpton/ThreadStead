import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import Link from 'next/link';

interface DecorationInfo {
  itemId: string;
  name: string;
  type: string;
  category: string;
  description: string;
  iconSvg?: string;
  imagePath?: string;
}

interface ClaimInfo {
  decoration: DecorationInfo;
  status: 'available' | 'inactive' | 'limit_reached' | 'not_started' | 'expired';
  statusMessage: string | null;
  availability: {
    totalClaims: number;
    maxClaims: number | null;
    remainingClaims: number | null;
    releaseStartAt: string | null;
    releaseEndAt: string | null;
    isLimitedTime: boolean;
  };
}

interface ClaimPageProps {
  isAuthenticated: boolean;
  userId: string | null;
}

export default function ClaimPage({ isAuthenticated, userId }: ClaimPageProps) {
  const router = useRouter();
  const { code } = router.query;

  const [claimInfo, setClaimInfo] = useState<ClaimInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (code && typeof code === 'string') {
      fetchClaimInfo(code);
    }
  }, [code]);

  const fetchClaimInfo = async (claimCode: string) => {
    try {
      const response = await fetch(`/api/decorations/claim/${claimCode}/info`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load claim information');
        return;
      }

      setClaimInfo(data);
    } catch (err) {
      setError('Failed to load claim information');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!code || !isAuthenticated) return;

    setClaiming(true);
    setError(null);

    try {
      const response = await fetch(`/api/decorations/claim/${code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to claim decoration');
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('Failed to claim decoration');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading claim information...</p>
        </div>
      </div>
    );
  }

  if (error && !claimInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Claim Code</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/">
            <a className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Go to Home
            </a>
          </Link>
        </div>
      </div>
    );
  }

  if (!claimInfo) return null;

  const { decoration, status, statusMessage, availability } = claimInfo;
  const canClaim = status === 'available' && isAuthenticated && !success;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white text-center">
            <h1 className="text-3xl font-bold mb-2">🎁 Exclusive Decoration</h1>
            <p className="text-blue-100">Claim your special item!</p>
          </div>

          {/* Decoration Info */}
          <div className="p-8">
            <div className="text-center mb-8">
              {/* Decoration Icon */}
              {decoration.iconSvg ? (
                <div
                  className="w-24 h-24 mx-auto mb-4"
                  dangerouslySetInnerHTML={{ __html: decoration.iconSvg }}
                />
              ) : (
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-4xl">🎨</span>
                </div>
              )}

              <h2 className="text-2xl font-bold text-gray-900 mb-2">{decoration.name}</h2>
              <p className="text-gray-600 mb-1">
                Type: <span className="font-medium">{decoration.type}</span>
              </p>
              {decoration.description && (
                <p className="text-gray-600 mt-4">{decoration.description}</p>
              )}
            </div>

            {/* Availability Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Availability</h3>

              {availability.maxClaims && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Claims:</span>
                  <span className="font-medium">
                    {availability.totalClaims} / {availability.maxClaims}
                  </span>
                </div>
              )}

              {availability.remainingClaims !== null && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-medium text-green-600">
                    {availability.remainingClaims}
                  </span>
                </div>
              )}

              {availability.isLimitedTime && availability.releaseEndAt && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Expires:</span>
                  <span className="font-medium text-orange-600">
                    {new Date(availability.releaseEndAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Status Message */}
            {statusMessage && (
              <div className={`p-4 rounded-lg mb-6 ${
                status === 'available' ? 'bg-green-50 text-green-800' :
                'bg-orange-50 text-orange-800'
              }`}>
                {statusMessage}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
                <div className="text-4xl mb-2">🎉</div>
                <h3 className="text-lg font-semibold text-green-900 mb-1">
                  Successfully Claimed!
                </h3>
                <p className="text-green-700">
                  {decoration.name} has been added to your collection
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              {!isAuthenticated && !success && (
                <Link href="/login">
                  <a className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center font-medium">
                    Sign In to Claim
                  </a>
                </Link>
              )}

              {canClaim && (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
                >
                  {claiming ? 'Claiming...' : 'Claim Decoration'}
                </button>
              )}

              {success && (
                <Link href="/pixel-home">
                  <a className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-center font-medium">
                    Go to Pixel Home
                  </a>
                </Link>
              )}

              <Link href="/">
                <a className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-center font-medium">
                  Back to Home
                </a>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Claim codes are exclusive decorations for your Pixel Home</p>
          <p>Share the love - tell your friends about Threadstead!</p>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = await getSessionUser(context.req as any);

  return {
    props: {
      isAuthenticated: !!user,
      userId: user?.id || null
    }
  };
};