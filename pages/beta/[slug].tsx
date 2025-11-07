import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import RetroCard from '@/components/ui/layout/RetroCard';
import { useSiteConfig } from '@/hooks/useSiteConfig';

interface LandingPageStatus {
  landingPage: {
    id: string;
    name: string;
    slug: string;
    title: string;
    description?: string;
    content?: string;
  };
  available: boolean;
  message?: string;
  signupCount: number;
  signupLimit: number;
  spotsRemaining: number;
}

export default function BetaLandingPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { config } = useSiteConfig();

  const [status, setStatus] = useState<LandingPageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || typeof slug !== 'string') return;

    fetchLandingPageStatus();
  }, [slug]);

  const fetchLandingPageStatus = async () => {
    if (!slug || typeof slug !== 'string') return;

    try {
      setLoading(true);
      const response = await fetch(`/api/beta-landing-pages/${slug}/status`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Landing page not found');
        } else {
          setError('Failed to load landing page');
        }
        return;
      }

      const data = await response.json();
      setStatus(data.status);
    } catch (err) {
      console.error('Error fetching landing page status:', err);
      setError('Failed to load landing page');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupClick = async () => {
    if (!status?.available || !slug) return;

    try {
      // Track the signup initiation
      const response = await fetch(`/api/beta-landing-pages/${slug}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to start signup process');
        return;
      }

      const data = await response.json();
      setTrackingId(data.signupId);

      // Redirect to signup with tracking parameters and beta key
      const signupUrl = new URL('/signup', window.location.origin);
      signupUrl.searchParams.set('beta', data.betaKey); // This is the key parameter!
      signupUrl.searchParams.set('source', 'beta-landing');
      signupUrl.searchParams.set('landing', slug as string);
      signupUrl.searchParams.set('tracking', data.signupId);

      window.location.href = signupUrl.toString();
    } catch (err) {
      console.error('Error tracking signup:', err);
      alert('Failed to start signup process');
    }
  };

  if (loading) {
    return (
      <Layout>
        <RetroCard title="Loading...">
          <div className="text-center py-8">
            <p>Loading beta landing page...</p>
          </div>
        </RetroCard>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <RetroCard title="Error">
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="border border-black px-4 py-2 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000]"
            >
              Go Home
            </button>
          </div>
        </RetroCard>
      </Layout>
    );
  }

  if (!status) {
    return (
      <Layout>
        <RetroCard title="Not Found">
          <div className="text-center py-8">
            <p>Landing page not found.</p>
          </div>
        </RetroCard>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Landing Page Content */}
        <RetroCard title={status.landingPage.title}>
          <div className="space-y-6">
            {status.landingPage.description && (
              <p className="text-lg text-gray-700 text-center">
                {status.landingPage.description}
              </p>
            )}

            {/* Custom HTML Content */}
            {status.landingPage.content && (
              <div
                className="beta-landing-content"
                dangerouslySetInnerHTML={{ __html: status.landingPage.content }}
              />
            )}

            {/* Signup Status */}
            <div className="border-2 border-black bg-yellow-50 p-6 text-center">
              {status.available ? (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-green-800">
                    🎉 Join the Beta!
                  </h3>
                  <p className="text-gray-700">
                    Get early access to {config.site_name} and be part of our growing community.
                  </p>

                  {/* Progress indicator */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Beta signups</span>
                      <span>{status.signupCount} / {status.signupLimit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (status.signupCount / status.signupLimit) * 100)}%`
                        }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {status.spotsRemaining} spots remaining
                    </p>
                  </div>

                  <button
                    onClick={handleSignupClick}
                    className="inline-block border-2 border-black px-8 py-4 bg-green-200 hover:bg-green-100 shadow-[4px_4px_0_#000] font-bold text-lg transition-all hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#000]"
                  >
                    🔑 Claim Beta Key and Sign Up!
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-red-800">
                    😔 Campaign Unavailable
                  </h3>
                  {status.message && (
                    <p className="text-gray-700">{status.message}</p>
                  )}

                  {/* Show progress even when unavailable */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Beta signups</span>
                      <span>{status.signupCount} / {status.signupLimit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, (status.signupCount / status.signupLimit) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => router.push('/')}
                      className="border border-black px-6 py-2 bg-gray-200 hover:bg-gray-100 shadow-[2px_2px_0_#000]"
                    >
                      Explore {config.site_name}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* What You Get */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-black p-4 bg-blue-50">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  ✨ Early Access Features
                </h4>
                <ul className="text-sm space-y-1">
                  <li>• Be among the first to join the community</li>
                  <li>• Help shape the platform&apos;s development</li>
                  <li>• Connect with other early adopters</li>
                  <li>• Influence future features and updates</li>
                </ul>
              </div>

              <div className="border border-black p-4 bg-green-50">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  🎯 What to Expect
                </h4>
                <ul className="text-sm space-y-1">
                  <li>• Thoughtful conversations and connections</li>
                  <li>• Creative expression tools and templates</li>
                  <li>• Cozy, retro-inspired social experience</li>
                  <li>• Privacy-focused community features</li>
                </ul>
              </div>
            </div>
          </div>
        </RetroCard>

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-600">
          <p>
            Already have a beta key?{' '}
            <button
              onClick={() => router.push('/signup')}
              className="text-blue-600 hover:underline font-medium"
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>

      <style jsx>{`
        .beta-landing-content {
          line-height: 1.6;
        }
        .beta-landing-content h1,
        .beta-landing-content h2,
        .beta-landing-content h3 {
          margin: 1rem 0 0.5rem 0;
          font-weight: bold;
        }
        .beta-landing-content p {
          margin: 0.5rem 0;
        }
        .beta-landing-content ul,
        .beta-landing-content ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        .beta-landing-content img {
          max-width: 100%;
          height: auto;
          margin: 1rem 0;
        }
      `}</style>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const { isBetaKeysEnabled } = await import('@/lib/config/beta-keys');

  // If beta keys are disabled, redirect to regular signup
  if (!isBetaKeysEnabled()) {
    return {
      redirect: {
        destination: '/signup',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};