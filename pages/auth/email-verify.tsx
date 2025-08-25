import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

interface User {
  id: string;
  displayName?: string;
  handle?: string;
  host?: string;
  avatarThumbnailUrl?: string;
  emailVerifiedAt?: string;
}

export default function EmailVerifyPage() {
  const router = useRouter();
  const { token } = router.query;
  
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token && typeof token === 'string') {
      verifyToken();
    }
  }, [token]);

  async function verifyToken() {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/auth/email-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.requiresSelection && data.users) {
          // Multiple users - show selection
          setUsers(data.users);
        } else if (data.success) {
          // Single user or selection made - redirect
          setSuccess(true);
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid or expired login link');
      }
    } catch {
      setError('Failed to verify login link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUserSelection(userId: string) {
    try {
      setIsVerifying(true);
      setError('');

      const response = await fetch('/api/auth/email-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, selectedUserId: userId })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess(true);
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to sign in to selected account');
      }
    } catch {
      setError('Failed to sign in. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6 text-center">
          <div className="space-y-4">
            <div className="text-4xl">🔐</div>
            <h1 className="thread-headline text-2xl">Verifying Login Link...</h1>
            <p className="text-thread-sage">Please wait while we verify your email login link.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6 text-center">
          <div className="space-y-4">
            <div className="text-4xl">✅</div>
            <h1 className="thread-headline text-2xl text-green-600">Successfully Logged In!</h1>
            <p className="text-thread-sage">Redirecting you to your homepage...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6 text-center">
          <div className="space-y-4">
            <div className="text-4xl">❌</div>
            <h1 className="thread-headline text-2xl text-red-600">Login Failed</h1>
            <p className="text-red-700">{error}</p>
            <div className="pt-4">
              <button
                onClick={() => window.location.href = '/'}
                className="thread-button"
              >
                Back to Homepage
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (users.length > 0) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🔐</div>
            <h1 className="thread-headline text-2xl mb-2">Choose Account</h1>
            <p className="text-thread-sage">
              We found multiple accounts associated with your email address. 
              Please choose which account you&apos;d like to sign in to:
            </p>
          </div>

          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedUserId === user.id
                    ? 'border-thread-pine bg-thread-cream'
                    : 'border-thread-sage bg-thread-paper hover:bg-thread-cream'
                }`}
                onClick={() => setSelectedUserId(user.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {user.avatarThumbnailUrl ? (
                      <img
                        src={user.avatarThumbnailUrl}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-thread-sage flex items-center justify-center text-white font-medium">
                        {(user.displayName || user.handle || '?')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="font-medium text-thread-pine">
                      {user.displayName || 'Unnamed Account'}
                    </div>
                    <div className="text-sm text-thread-sage">
                      @{user.handle || 'No handle set'}
                    </div>
                    {user.emailVerifiedAt && (
                      <div className="text-xs text-green-600 mt-1">
                        ✓ Email verified
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedUserId === user.id
                        ? 'border-thread-pine bg-thread-pine'
                        : 'border-thread-sage'
                    }`}>
                      {selectedUserId === user.id && (
                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-6">
            <button
              onClick={() => handleUserSelection(selectedUserId)}
              disabled={!selectedUserId || isVerifying}
              className="thread-button disabled:opacity-50"
            >
              {isVerifying ? "Signing In..." : "Sign In to Selected Account"}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return null;
}