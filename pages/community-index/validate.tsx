/**
 * Community validation interface for seeded sites
 */

/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';
import { PixelIcon } from '@/components/ui/PixelIcon';

// Enhanced Voting Buttons Component
function VotingButtons({
  siteId,
  onVote,
  submitting
}: {
  siteId: string;
  onVote: (siteId: string, action: string, comment?: string) => void;
  submitting: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const quickVotes = [
    { action: 'approve', label: 'Approve', icon: 'check' as const, color: 'bg-green-500 hover:bg-green-600' },
    { action: 'reject', label: 'Reject', icon: 'close' as const, color: 'bg-red-500 hover:bg-red-600' },
    { action: 'improve', label: 'Needs Work', icon: 'zap' as const, color: 'bg-blue-500 hover:bg-blue-600' }
  ];

  const detailedVotes = [
    { action: 'quality', label: 'High Quality', icon: 'trophy' as const, color: 'bg-purple-500 hover:bg-purple-600' },
    { action: 'interesting', label: 'Interesting', icon: 'lightbulb' as const, color: 'bg-yellow-500 hover:bg-yellow-600' },
    { action: 'helpful', label: 'Helpful', icon: 'users' as const, color: 'bg-teal-500 hover:bg-teal-600' },
    { action: 'creative', label: 'Creative', icon: 'paint-bucket' as const, color: 'bg-pink-500 hover:bg-pink-600' },
    { action: 'broken', label: 'Broken Link', icon: 'unlink' as const, color: 'bg-red-600 hover:bg-red-700' },
    { action: 'spam', label: 'Spam', icon: 'close' as const, color: 'bg-red-700 hover:bg-red-800' },
    { action: 'outdated', label: 'Outdated', icon: 'calendar' as const, color: 'bg-gray-500 hover:bg-gray-600' }
  ];

  return (
    <div className="relative">
      {/* Quick Vote Buttons */}
      <div className="flex gap-2">
        {quickVotes.map(vote => (
          <button
            key={vote.action}
            onClick={() => onVote(siteId, vote.action)}
            disabled={submitting}
            className={`px-3 py-2 text-white rounded text-sm ${vote.color} disabled:opacity-50 flex items-center gap-1`}
          >
            <PixelIcon name={vote.icon} size={14} /> {vote.label}
          </button>
        ))}

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
        >
          More...
        </button>
      </div>

      {/* Detailed Vote Options */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-10 min-w-64">
          <h4 className="font-medium mb-3">Detailed Voting Options</h4>
          <div className="grid grid-cols-1 gap-2">
            {detailedVotes.map(vote => (
              <button
                key={vote.action}
                onClick={() => {
                  onVote(siteId, vote.action);
                  setShowDetails(false);
                }}
                disabled={submitting}
                className={`px-3 py-2 text-white rounded text-sm ${vote.color} disabled:opacity-50 text-left flex items-center gap-2`}
              >
                <PixelIcon name={vote.icon} size={14} /> {vote.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowDetails(false)}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

interface ValidationSite {
  id: string;
  url: string;
  title: string;
  description: string | null;
  discoveryContext: string | null;
  siteType: string | null;
  seedingScore: number | null;
  seedingReasons: string[];
  discoveredAt: string;
  userVote: string | null;
  communityValidated: boolean;
  communityScore: number;
  votesSummary: {
    approve: number;
    reject: number;
    improve: number;
    quality: number;
    interesting: number;
    helpful: number;
    creative: number;
    broken: number;
    spam: number;
    outdated: number;
  };
  _count: {
    votes: number;
  };
}

interface Props {
  siteConfig: SiteConfig;
  user: any;
}

export default function CommunityValidation({ siteConfig, user }: Props) {
  const [sites, setSites] = useState<ValidationSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [changingVote, setChangingVote] = useState<string | null>(null);
  const [showInteracted, setShowInteracted] = useState(false);
  const [sortMethod, setSortMethod] = useState('balanced');

  useEffect(() => {
    fetchSites();
  }, [filter, page, showInteracted, sortMethod]);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/community-index/validate?page=${page}&category=${filter}&showInteracted=${showInteracted}&sort=${sortMethod}`);
      if (response.ok) {
        const data = await response.json();
        setSites(data.sites);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (siteId: string, action: string, comment?: string) => {
    try {
      setSubmitting(siteId);
      const response = await fetch('/api/community-index/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, action, comment })
      });

      if (response.ok) {
        await fetchSites(); // Refresh the list
        setChangingVote(null); // Reset changing vote state
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit vote');
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      alert('Failed to submit vote');
    } finally {
      setSubmitting(null);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'bg-gray-100 text-gray-600';
    if (score >= 70) return 'bg-green-100 text-green-700';
    if (score >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const formatReasons = (reasons: string[]) => {
    return reasons.map(reason =>
      reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    ).join(', ');
  };

  const getSiteTypeIcon = (type: string | null) => {
    const icons: Record<string, 'edit' | 'paint-bucket' | 'sliders' | 'users' | 'script' | 'zap' | 'image' | 'file' | 'article' | 'map'> = {
      'personal_blog': 'edit',
      'portfolio': 'paint-bucket',
      'project': 'sliders',
      'community': 'users',
      'resource': 'script',
      'tool': 'zap',
      'art': 'image',
      'documentation': 'file',
      'zine': 'article',
      'other': 'map'
    };
    return icons[type || 'other'] || 'map';
  };

  if (!user) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Community Validation</h1>
          <p>Please log in to help validate discovered sites.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout siteConfig={siteConfig}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2"><PixelIcon name="users" size={32} /> Community Moderation</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-900 font-medium mb-1 flex items-center gap-1">
              <PixelIcon name="gps" size={16} /> Phase 2: Community-Curated Queue
            </p>
            <p className="text-blue-700 text-sm">
              This validation queue only shows sites submitted by community members.
              Crawler-discovered sites are now auto-validated separately to keep this queue focused on human curation.
            </p>
          </div>
          <p className="text-gray-600">
            Help validate sites discovered and submitted by your fellow community members
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Categories</option>
            <option value="personal_blog">Personal Blogs</option>
            <option value="portfolio">Portfolios</option>
            <option value="project">Projects</option>
            <option value="community">Communities</option>
            <option value="resource">Resources</option>
            <option value="tool">Tools</option>
            <option value="art">Art</option>
            <option value="documentation">Documentation</option>
            <option value="zine">Zines</option>
            <option value="other">Other</option>
          </select>

          <select
            value={sortMethod}
            onChange={(e) => { setSortMethod(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="balanced">Balanced (Recommended)</option>
            <option value="least_votes">Need Votes Most</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest_score">Highest Quality</option>
            <option value="lowest_score">Lowest Quality</option>
            <option value="most_votes">Most Voted</option>
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInteracted}
              onChange={(e) => {
                setShowInteracted(e.target.checked);
                setPage(0);
              }}
            />
            <span className="text-sm">
              {showInteracted ? "Show sites I've voted on" : "Show new sites only"}
            </span>
          </label>

          <div className="text-sm text-gray-500">
            Page {page + 1} of {totalPages}
          </div>
        </div>

        {/* Site List */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-8">Loading sites for validation...</div>
          ) : sites.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {showInteracted ? (
                <div>
                  <p>You haven't voted on any sites in this category yet.</p>
                  <button
                    onClick={() => setShowInteracted(false)}
                    className="mt-2 text-blue-600 hover:underline"
                  >
                    View sites that need validation →
                  </button>
                </div>
              ) : (
                <div>
                  <p>No new sites pending validation in this category.</p>
                  <button
                    onClick={() => setShowInteracted(true)}
                    className="mt-2 text-blue-600 hover:underline"
                  >
                    View sites you've already voted on →
                  </button>
                </div>
              )}
            </div>
          ) : (
            sites.map(site => (
              <div
                key={site.id}
                className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <PixelIcon name={getSiteTypeIcon(site.siteType)} size={24} />
                      <h3 className="text-xl font-bold">{site.title}</h3>
                      {site.communityValidated && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium flex items-center gap-1">
                          <PixelIcon name="check" size={12} /> Auto-Validated
                        </span>
                      )}
                      {site.seedingScore && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(site.seedingScore)}`}>
                          Score: {site.seedingScore}
                        </span>
                      )}
                      {site.communityScore > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          Community: +{site.communityScore}
                        </span>
                      )}
                      {site.communityScore < 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                          Community: {site.communityScore}
                        </span>
                      )}
                    </div>

                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline block mb-2"
                    >
                      {site.url}
                    </a>

                    {site.description && (
                      <p className="text-gray-700 mb-3">{site.description}</p>
                    )}

                    <div className="text-sm text-gray-500 space-y-1">
                      {site.discoveryContext && (
                        <div>
                          <strong>Discovered via:</strong> "{site.discoveryContext}"
                        </div>
                      )}
                      {site.seedingReasons.length > 0 && (
                        <div>
                          <strong>Quality Indicators:</strong> {formatReasons(site.seedingReasons)}
                        </div>
                      )}
                      <div>
                        <strong>Discovered:</strong> {new Date(site.discoveredAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Voting Section */}
                <div className="border-t pt-4">
                  {/* Vote Summary */}
                  <div className="flex flex-wrap gap-2 text-sm mb-4">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                      <PixelIcon name="check" size={12} /> {site.votesSummary.approve}
                    </span>
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1">
                      <PixelIcon name="close" size={12} /> {site.votesSummary.reject}
                    </span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                      <PixelIcon name="zap" size={12} /> {site.votesSummary.improve}
                    </span>

                    {/* Quality indicators */}
                    {site.votesSummary.quality > 0 && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1">
                        <PixelIcon name="trophy" size={12} /> {site.votesSummary.quality}
                      </span>
                    )}
                    {site.votesSummary.interesting > 0 && (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded flex items-center gap-1">
                        <PixelIcon name="lightbulb" size={12} /> {site.votesSummary.interesting}
                      </span>
                    )}
                    {site.votesSummary.helpful > 0 && (
                      <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded flex items-center gap-1">
                        <PixelIcon name="users" size={12} /> {site.votesSummary.helpful}
                      </span>
                    )}
                    {site.votesSummary.creative > 0 && (
                      <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded flex items-center gap-1">
                        <PixelIcon name="paint-bucket" size={12} /> {site.votesSummary.creative}
                      </span>
                    )}

                    {/* Problem indicators */}
                    {site.votesSummary.broken > 0 && (
                      <span className="bg-red-200 text-red-800 px-2 py-1 rounded flex items-center gap-1">
                        <PixelIcon name="unlink" size={12} /> {site.votesSummary.broken}
                      </span>
                    )}
                    {site.votesSummary.spam > 0 && (
                      <span className="bg-red-200 text-red-800 px-2 py-1 rounded flex items-center gap-1">
                        <PixelIcon name="close" size={12} /> {site.votesSummary.spam}
                      </span>
                    )}
                    {site.votesSummary.outdated > 0 && (
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1">
                        <PixelIcon name="calendar" size={12} /> {site.votesSummary.outdated}
                      </span>
                    )}
                  </div>

                  {/* Voting Actions */}
                  <div className="flex justify-between items-center">
                    <div>
                      {site.userVote ? (
                        <div className="text-sm text-gray-600">
                          You voted: <strong className="capitalize">{site.userVote}</strong>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          Help the community by voting on this site
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {site.userVote && changingVote !== site.id ? (
                        <button
                          onClick={() => setChangingVote(site.id)}
                          disabled={submitting === site.id}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          Change Vote
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <VotingButtons
                            siteId={site.id}
                            onVote={handleVote}
                            submitting={submitting === site.id}
                          />
                          {changingVote === site.id && (
                            <button
                              onClick={() => setChangingVote(null)}
                              className="px-3 py-1 text-sm bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
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