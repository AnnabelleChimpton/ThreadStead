import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';
import Link from 'next/link';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

interface BookmarksProps {
  siteConfig: SiteConfig;
  user: {
    id: string;
    primaryHandle: string | null;
  };
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  visibility: string;
  isDefault: boolean;
  bookmarkCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string;
  faviconUrl?: string;
  sourceType: string;
  sourceMetadata?: any;
  tags: string[];
  notes?: string;
  visitsCount: number;
  lastVisitedAt?: string;
  createdAt: string;
  collection?: {
    id: string;
    name: string;
  } | null;
}

export default function BookmarksPage({ siteConfig, user }: BookmarksProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCollectionForm, setShowNewCollectionForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [selectedCollection, searchQuery, currentPage]);

  const loadCollections = async () => {
    try {
      const response = await fetch('/api/bookmarks/collections');
      const data = await response.json();
      if (data.success) {
        setCollections(data.collections);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (selectedCollection !== 'all') {
        params.append('collectionId', selectedCollection);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/bookmarks?${params}`);
      const data = await response.json();

      if (data.success) {
        setBookmarks(data.bookmarks);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      const response = await csrfFetch('/api/bookmarks/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCollectionName,
          description: newCollectionDescription || undefined,
          visibility: 'private'
        })
      });

      const data = await response.json();
      if (data.success) {
        setCollections([...collections, data.collection]);
        setNewCollectionName('');
        setNewCollectionDescription('');
        setShowNewCollectionForm(false);
      } else {
        alert(data.error || 'Failed to create collection');
      }
    } catch (error) {
      console.error('Failed to create collection:', error);
      alert('Failed to create collection');
    }
  };

  const visitBookmark = async (bookmark: Bookmark) => {
    // Track visit
    try {
      await csrfFetch(`/api/bookmarks/${bookmark.id}/visit`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to track visit:', error);
    }

    // Open URL
    window.open(bookmark.url, '_blank');
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'community_index': return '🌟';
      case 'site_content': return '🏠';
      case 'external_search': return '🌐';
      case 'manual': return '📝';
      default: return '🔗';
    }
  };

  const getSourceLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'community_index': return 'Community';
      case 'site_content': return 'Site';
      case 'external_search': return 'Web Search';
      case 'manual': return 'Manual';
      default: return 'Unknown';
    }
  };

  return (
    <Layout siteConfig={siteConfig}>
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2E4B3F] mb-2">
            📚 My Bookmarks
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage your saved sites and collections
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Collections */}
          <div className="lg:col-span-1">
            <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[#2E4B3F]">Collections</h2>
                <button
                  onClick={() => setShowNewCollectionForm(true)}
                  className="text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  title="Create new collection"
                >
                  +
                </button>
              </div>

              {/* New Collection Form */}
              {showNewCollectionForm && (
                <form onSubmit={createCollection} className="mb-4 p-3 bg-white rounded border">
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="Collection name"
                    className="w-full px-2 py-1 text-sm border rounded mb-2"
                    required
                  />
                  <textarea
                    value={newCollectionDescription}
                    onChange={(e) => setNewCollectionDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-2 py-1 text-sm border rounded mb-2 h-16 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCollectionForm(false);
                        setNewCollectionName('');
                        setNewCollectionDescription('');
                      }}
                      className="flex-1 text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Collections List */}
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCollection('all')}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedCollection === 'all'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>📚 All Bookmarks</span>
                    <span className="text-xs text-gray-500">
                      {collections.reduce((sum, c) => sum + c.bookmarkCount, 0)}
                    </span>
                  </div>
                </button>

                {collections.map((collection) => (
                  <button
                    key={collection.id}
                    onClick={() => setSelectedCollection(collection.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      selectedCollection === collection.id
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{collection.isDefault ? '⭐' : '📁'} {collection.name}</span>
                      <span className="text-xs text-gray-500">{collection.bookmarkCount}</span>
                    </div>
                    {collection.description && (
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        {collection.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Bookmarks */}
          <div className="lg:col-span-3">
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bookmarks..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Bookmarks Grid */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading bookmarks...</p>
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="mb-4">No bookmarks found.</p>
                <Link href="/discover" className="text-blue-600 hover:text-blue-800">
                  Discover and save some sites →
                </Link>
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  {bookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 cursor-pointer" onClick={() => visitBookmark(bookmark)}>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-gray-900 break-words">
                              {bookmark.title}
                            </h3>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1 flex-shrink-0">
                              {getSourceIcon(bookmark.sourceType)} {getSourceLabel(bookmark.sourceType)}
                            </span>
                          </div>

                          <div className="text-xs text-green-600 mb-2 break-all">
                            {bookmark.url}
                          </div>

                          {bookmark.description && (
                            <p className="text-sm text-gray-600 mb-2 break-words">
                              {bookmark.description}
                            </p>
                          )}

                          {bookmark.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {bookmark.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>Saved {new Date(bookmark.createdAt).toLocaleDateString()}</span>
                            {bookmark.visitsCount > 0 && (
                              <span>{bookmark.visitsCount} visits</span>
                            )}
                            {bookmark.collection && (
                              <span>in {bookmark.collection.name}</span>
                            )}
                          </div>
                        </div>

                        <div className="ml-4">
                          <button
                            onClick={() => visitBookmark(bookmark)}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Visit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>

                    <span className="px-3 py-2 text-sm">
                      Page {currentPage} of {pagination.totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                      disabled={currentPage === pagination.totalPages}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
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

  if (!user) {
    return {
      redirect: {
        destination: '/auth/signin?redirect=' + encodeURIComponent('/bookmarks'),
        permanent: false,
      },
    };
  }

  return {
    props: {
      siteConfig,
      user: {
        id: user.id,
        primaryHandle: user.primaryHandle
      }
    }
  };
};