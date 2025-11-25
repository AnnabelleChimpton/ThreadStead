/**
 * Community site submission form
 * Revamped for "Fun" & "Central" experience
 */

/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface Props {
  siteConfig: SiteConfig;
  user: any;
}

export default function SubmitSite({ siteConfig, user }: Props) {
  const router = useRouter();
  const { url: initialUrl, auto } = router.query;

  const [step, setStep] = useState<'input' | 'scanning' | 'verify' | 'success'>('input');
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    description: '',
    category: '',
    tags: '',
    discoveryContext: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [scanMessage, setScanMessage] = useState('Initializing spider...');

  // Auto-start if URL provided
  useEffect(() => {
    if (initialUrl && typeof initialUrl === 'string') {
      setFormData(prev => ({ ...prev, url: initialUrl }));
      if (auto === 'true') {
        handleScan(initialUrl);
      }
    }
  }, [initialUrl, auto]);

  const handleScan = async (urlToScan: string) => {
    setStep('scanning');
    setError('');

    // Simulate scanning stages for effect
    const messages = [
      'Waking up the spider...',
      'Spinning a web connection...',
      'Reading the matrix...',
      'Extracting juicy metadata...'
    ];

    let msgIdx = 0;
    const interval = setInterval(() => {
      setScanMessage(messages[msgIdx % messages.length]);
      msgIdx++;
    }, 600);

    try {
      // In a real app, we'd have an endpoint to fetch metadata
      // For now, we'll simulate a fetch or just proceed to verify
      // TODO: Implement /api/crawler/preview endpoint

      await new Promise(resolve => setTimeout(resolve, 2000)); // Fake delay

      clearInterval(interval);
      setStep('verify');

      // Pre-fill if empty (simulation)
      if (!formData.title) {
        setFormData(prev => ({
          ...prev,
          title: new URL(urlToScan).hostname, // Fallback
          description: 'Discovered on the small web.'
        }));
      }

    } catch (err) {
      clearInterval(interval);
      setError('Could not scan site automatically. Please fill in details manually.');
      setStep('verify'); // Fallback to manual
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/community-index/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStep('success');
      } else {
        setError(data.error || 'Failed to submit site');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
            <PixelIcon name="lock" size={32} className="text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Scouts Only!</h1>
          <p className="text-gray-600 mb-6">Please log in to submit sites.</p>
          <button onClick={() => router.push('/auth/login')} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">
            Log In / Sign Up
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout siteConfig={siteConfig}>
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-3 flex items-center justify-center gap-3">
            <span className="text-blue-600"><PixelIcon name="debug" size={40} /></span>
            Feed the Spider
          </h1>
          <p className="text-xl text-gray-500">
            Submit a gem and grow the neighborhood.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white border-2 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative">

          {/* Progress Bar */}
          <div className="h-2 bg-gray-100 w-full flex">
            <div className={`h-full transition-all duration-500 ${step === 'input' ? 'w-1/4 bg-blue-500' : step === 'scanning' ? 'w-1/2 bg-blue-500 animate-pulse' : step === 'verify' ? 'w-3/4 bg-blue-500' : 'w-full bg-green-500'}`} />
          </div>

          <div className="p-8">

            {/* STEP 1: INPUT */}
            {step === 'input' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">What did you find?</h2>
                  <p className="text-gray-500">Paste the URL of the site you want to add.</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleScan(formData.url); }}>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      autoFocus
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      placeholder="https://cool-site.com"
                    />
                    <button
                      type="submit"
                      disabled={!formData.url}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                    >
                      <PixelIcon name="arrow-right" size={24} />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: SCANNING */}
            {step === 'scanning' && (
              <div className="py-12 text-center space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                  <div className="relative bg-white p-4 rounded-full border-2 border-blue-100">
                    <PixelIcon name="reload" size={48} className="animate-spin text-blue-500" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-700">{scanMessage}</h3>
              </div>
            )}

            {/* STEP 3: VERIFY */}
            {step === 'verify' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Verify Details</h2>
                  <button onClick={() => setStep('input')} className="text-sm text-gray-500 hover:text-blue-500 underline">
                    Change URL
                  </button>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                    <textarea
                      required
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none bg-white"
                      >
                        <option value="">Select...</option>
                        <option value="personal_blog">Personal Blog</option>
                        <option value="portfolio">Portfolio</option>
                        <option value="project">Project</option>
                        <option value="community">Community</option>
                        <option value="resource">Resource</option>
                        <option value="art">Art</option>
                        <option value="webring">Webring</option>
                        <option value="guestbook">Guestbook</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Tags</label>
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="indie, retro, art..."
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transform hover:-translate-y-1 transition-all shadow-lg disabled:opacity-50 disabled:transform-none"
                  >
                    {submitting ? 'Submitting...' : 'Confirm & Submit'}
                  </button>
                </form>
              </div>
            )}

            {/* STEP 4: SUCCESS */}
            {step === 'success' && (
              <div className="text-center py-8 space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="inline-block p-6 bg-green-100 rounded-full mb-2">
                  <PixelIcon name="check" size={64} className="text-green-600" />
                </div>

                <h2 className="text-3xl font-black text-gray-900">Nice Find!</h2>
                <p className="text-xl text-gray-600">
                  Thank you for contributing to the community index.
                </p>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 max-w-sm mx-auto mt-6">
                  <p className="text-sm text-gray-500 mb-4">The spider is now crawling this site. It will appear in the index shortly.</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        setStep('input');
                        setFormData({ ...formData, url: '', title: '', description: '' });
                      }}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
                    >
                      Submit Another
                    </button>
                    <button
                      onClick={() => router.push('/discover')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                    >
                      Back to Discover
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const siteConfig = await getSiteConfig();
  const user = await getSessionUser(context.req as any);

  return {
    props: {
      siteConfig,
      user: user ? {
        ...user,
        createdAt: user.createdAt?.toISOString() || null,
        betaKey: user.betaKey ? {
          ...user.betaKey,
          createdAt: user.betaKey.createdAt?.toISOString() || null,
          usedAt: user.betaKey.usedAt?.toISOString() || null
        } : null
      } : null
    }
  };
};