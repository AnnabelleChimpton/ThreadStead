/**
 * Community site submission form
 */

/* eslint-disable react/no-unescaped-entities */

import { useState } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';

interface Props {
  siteConfig: SiteConfig;
  user: any;
}

export default function SubmitSite({ siteConfig, user }: Props) {
  const router = useRouter();
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
  const [success, setSuccess] = useState(false);

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

      if (response.ok) {
        setSuccess(true);
        setFormData({
          url: '',
          title: '',
          description: '',
          category: '',
          tags: '',
          discoveryContext: ''
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit site');
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
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Submit a Site</h1>
          <p>Please log in to submit sites to the community index.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout siteConfig={siteConfig}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">📝 Submit a Site</h1>
          <p className="text-gray-600">
            Help grow the community index by submitting interesting sites you've discovered
          </p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-green-800">Site Submitted Successfully!</h3>
            <p className="text-green-700">
              Your submission has been added to the validation queue. The community will review it soon.
            </p>
            <div className="mt-2">
              <button
                onClick={() => router.push('/community-index/validate')}
                className="text-green-600 hover:underline"
              >
                View validation queue →
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-300 rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Website URL *
            </label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Site Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Amazing Personal Blog"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="What makes this site interesting? What kind of content does it have?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a category...</option>
              <option value="personal_blog">Personal Blog</option>
              <option value="portfolio">Portfolio</option>
              <option value="project">Project</option>
              <option value="community">Community</option>
              <option value="resource">Resource</option>
              <option value="tool">Tool</option>
              <option value="art">Art</option>
              <option value="documentation">Documentation</option>
              <option value="zine">Zine</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="indie, creative, blog, javascript"
            />
            <p className="text-sm text-gray-500 mt-1">
              Help categorize this site with relevant tags
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              How did you discover this site?
            </label>
            <input
              type="text"
              value={formData.discoveryContext}
              onChange={(e) => setFormData({ ...formData, discoveryContext: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Found through a webring, recommended by a friend, etc."
            />
            <p className="text-sm text-gray-500 mt-1">
              Optional: Help others discover similar sites
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">📋 Submission Guidelines</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Focus on personal sites, creative projects, and indie web content</li>
              <li>• Avoid commercial sites, social media platforms, and major corporate sites</li>
              <li>• Make sure the site is accessible and not behind paywalls</li>
              <li>• Provide a clear, honest description of what makes the site interesting</li>
              <li>• All submissions go through community validation</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
            >
              {submitting ? 'Submitting...' : '📝 Submit Site'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/community-index/validate')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              🔍 View Validation Queue
            </button>
          </div>
        </form>
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
        createdAt: user.createdAt?.toISOString() || null
      } : null
    }
  };
};