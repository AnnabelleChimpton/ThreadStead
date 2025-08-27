import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { token } = router.query;
  
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');

  const verifyEmail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(true);
        setVerifiedEmail(data.email);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid or expired verification link');
      }
    } catch {
      setError('Failed to verify email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && typeof token === 'string') {
      verifyEmail();
    }
  }, [token, verifyEmail]);

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6 text-center">
          <div className="space-y-4">
            <div className="text-4xl">📧</div>
            <h1 className="thread-headline text-2xl">Verifying Email...</h1>
            <p className="text-thread-sage">Please wait while we verify your email address.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6 text-center">
          <div className="space-y-6">
            <div className="text-4xl">✅</div>
            <h1 className="thread-headline text-2xl text-green-600">Email Verified!</h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-green-800 mb-4">
                Your email address <strong>{verifiedEmail}</strong> has been successfully verified.
              </p>
              <p className="text-green-700 text-sm">
                You can now use this email address to sign in to your account using magic links.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/settings'}
                className="thread-button"
              >
                Go to Account Settings
              </button>
              <div>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-4 py-2 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded transition-all"
                >
                  Back to Homepage
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6 text-center">
          <div className="space-y-6">
            <div className="text-4xl">❌</div>
            <h1 className="thread-headline text-2xl text-red-600">Verification Failed</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-700">{error}</p>
            </div>
            <div className="space-y-3">
              <p className="text-thread-sage text-sm">
                This verification link may have expired or already been used. 
                You can try setting your email address again from your Account Settings.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.href = '/login'}
                  className="thread-button"
                >
                  Try Signing In Again
                </button>
                <div>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="px-4 py-2 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded transition-all"
                  >
                    Back to Homepage
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return null;
}