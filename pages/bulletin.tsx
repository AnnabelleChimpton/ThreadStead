import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { csrfFetchJson } from '@/lib/api/client/csrf-fetch';
import UserQuickView from '@/components/ui/feedback/UserQuickView';
import {
  getBulletinColor,
  getUserBulletinCategories,
  getAllBulletinCategories,
  type BulletinCategory,
} from '@/lib/helpers/bulletinHelpers';

interface Bulletin {
  id: string;
  category: BulletinCategory;
  text: string;
  linkUrl: string | null;
  createdAt: string;
  expiresAt: string;
  user: {
    id: string;
    primaryHandle: string | null;
    profile: {
      displayName: string | null;
    } | null;
  };
}

interface BulletinPageProps {
  siteConfig: SiteConfig;
  user?: {
    id: string;
    primaryHandle: string | null;
    role: string;
  };
}

export default function BulletinBoard({ siteConfig, user }: BulletinPageProps) {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [userBulletin, setUserBulletin] = useState<Bulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const { loggedIn } = useCurrentUser();

  const [formData, setFormData] = useState({
    category: 'LOOKING_FOR' as BulletinCategory,
    text: '',
    linkUrl: '',
  });

  const isAdmin = user?.role === 'admin';
  const categories = isAdmin ? getAllBulletinCategories() : getUserBulletinCategories();

  useEffect(() => {
    fetchBulletins();
  }, []);

  const fetchBulletins = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bulletin', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setBulletins(data.bulletins);

        // Find user's bulletin if logged in
        if (user) {
          const myBulletin = data.bulletins.find((b: Bulletin) => b.user.id === user.id);
          setUserBulletin(myBulletin || null);
        }
      }
    } catch (err) {
      console.error('Error fetching bulletins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.text.trim() || formData.text.length > 200) {
      alert('Please enter text between 1 and 200 characters');
      return;
    }

    try {
      setSubmitting(true);

      await csrfFetchJson('/api/bulletin', {
        method: 'POST',
        body: {
          category: formData.category,
          text: formData.text.trim(),
          linkUrl: formData.linkUrl.trim() || null,
        },
      });

      // Reset form and refresh
      setFormData({ category: 'LOOKING_FOR', text: '', linkUrl: '' });
      setShowForm(false);
      await fetchBulletins();
    } catch (err: any) {
      console.error('Error posting bulletin:', err);
      alert(err.message || 'Failed to post bulletin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this note from the bulletin board?')) return;

    try {
      await csrfFetchJson(`/api/bulletin/${id}`, {
        method: 'DELETE',
      });

      await fetchBulletins();
    } catch (err: any) {
      console.error('Error deleting bulletin:', err);
      alert(err.message || 'Failed to delete bulletin');
    }
  };

  const handleEdit = () => {
    if (userBulletin) {
      setFormData({
        category: userBulletin.category,
        text: userBulletin.text,
        linkUrl: userBulletin.linkUrl || '',
      });
      setShowForm(true);
    }
  };

  const getUserDisplay = (bulletin: Bulletin) => {
    return bulletin.user.profile?.displayName || bulletin.user.primaryHandle || 'Anonymous';
  };

  const getUsername = (bulletin: Bulletin): string | null => {
    if (!bulletin.user.primaryHandle) return null;
    // Strip @domain from primaryHandle (e.g., "user@homepageagain" -> "user")
    return bulletin.user.primaryHandle.split('@')[0];
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <>
      <Head>
        <title>Bulletin Board - {siteConfig.site_name}</title>
        <meta
          name="description"
          content="A shared corkboard for quick notes, requests, and invitations from neighbors."
        />
      </Head>

      <Layout siteConfig={siteConfig} fullWidth={true}>
        <div className="w-full max-w-full sm:max-w-7xl mx-auto px-0 sm:px-4 py-4 sm:py-6">
          {/* Page Header */}
          <div className="thread-module p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6">
            <div className="flex items-center gap-3 mb-2">
              <PixelIcon name="article" size={32} className="text-thread-sage" />
              <h1 className="thread-headline text-2xl sm:text-3xl md:text-4xl font-bold">
                Bulletin Board
              </h1>
            </div>
            <p className="text-thread-sage leading-relaxed text-sm sm:text-base">
              A shared corkboard for quick notes, requests, and invitations from neighbors.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
            {/* Your Note Section (Sidebar on large screens) */}
            <div className="lg:col-span-1">
              <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-4 sticky top-4">
                <h2 className="text-lg font-bold text-[#2E4B3F] mb-3">Your Note</h2>

                {!loggedIn ? (
                  <p className="text-sm text-[#5A5A5A]">
                    Log in to post your own note on the board.
                  </p>
                ) : userBulletin && !showForm ? (
                  <div>
                    <div
                      className={`${
                        getBulletinColor(userBulletin.category).bg
                      } border border-[#A18463] rounded p-3 mb-3 shadow-sm`}
                    >
                      <div className="text-xs font-semibold text-[#2E4B3F] mb-1">
                        {getBulletinColor(userBulletin.category).label}
                      </div>
                      <p className="text-sm text-[#2F2F2F] mb-2">{userBulletin.text}</p>
                      {userBulletin.linkUrl && (
                        <a
                          href={userBulletin.linkUrl || '#'}
                          className="text-xs text-[#2E4B3F] hover:text-[#4FAF6D] underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Visit page →
                        </a>
                      )}
                      <div className="text-xs text-[#5A5A5A] mt-2">
                        Expires in {getDaysUntilExpiry(userBulletin.expiresAt)} days
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleEdit}
                        className="flex-1 text-xs px-3 py-2 border border-[#A18463] rounded bg-[#FCFAF7] hover:bg-[#F5E9D4] transition-colors shadow-[1px_1px_0_#A18463]"
                      >
                        Replace
                      </button>
                      <button
                        onClick={() => handleDelete(userBulletin.id)}
                        className="flex-1 text-xs px-3 py-2 border border-[#A18463] rounded bg-[#FCFAF7] hover:bg-[#E27D60]/20 transition-colors shadow-[1px_1px_0_#A18463]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-[#2E4B3F] mb-1">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value as BulletinCategory })
                        }
                        className="w-full px-3 py-2 border border-[#A18463] rounded text-sm bg-white"
                      >
                        {categories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#2E4B3F] mb-1">
                        Text ({formData.text.length}/200)
                      </label>
                      <textarea
                        value={formData.text}
                        onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                        className="w-full px-3 py-2 border border-[#A18463] rounded text-sm resize-none"
                        rows={4}
                        maxLength={200}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#2E4B3F] mb-1">
                        Link (optional)
                      </label>
                      <input
                        type="url"
                        value={formData.linkUrl}
                        onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-[#A18463] rounded text-sm"
                        placeholder="https://..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 text-sm px-4 py-2 border border-[#A18463] rounded bg-[#4FAF6D] text-white hover:bg-[#3d9159] transition-colors shadow-[2px_2px_0_#A18463] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
                      >
                        {submitting ? 'Posting...' : userBulletin ? 'Replace Note' : 'Post Note'}
                      </button>
                      {userBulletin && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowForm(false);
                            setFormData({ category: 'LOOKING_FOR', text: '', linkUrl: '' });
                          }}
                          className="text-sm px-3 py-2 border border-[#A18463] rounded bg-[#FCFAF7] hover:bg-[#F5E9D4] transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Board Grid */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="animate-pulse bg-[#D4C4A8] rounded-lg h-40"></div>
                  ))}
                </div>
              ) : bulletins.length === 0 ? (
                <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-8 text-center">
                  <p className="text-[#5A5A5A] mb-2">No notes on the board yet.</p>
                  <p className="text-sm text-[#5A5A5A]">Be the first to post!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {bulletins.map((bulletin) => {
                    const colorConfig = getBulletinColor(bulletin.category);
                    const hasLink = !!bulletin.linkUrl;
                    const username = getUsername(bulletin);

                    return (
                      <div
                        key={bulletin.id}
                        className={`${colorConfig.bg} border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-4 flex flex-col ${
                          !hasLink && username ? 'cursor-pointer hover:shadow-[3px_3px_0_#A18463] transition-shadow' : ''
                        }`}
                        onClick={() => {
                          if (!hasLink && username) {
                            setSelectedUsername(username);
                          }
                        }}
                      >
                        <div className="text-xs font-semibold text-[#2E4B3F] mb-2">
                          {colorConfig.label}
                        </div>
                        <p className="text-sm text-[#2F2F2F] mb-3 flex-1">{bulletin.text}</p>
                        {hasLink && (
                          <a
                            href={bulletin.linkUrl || '#'}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-[#2E4B3F] hover:text-[#4FAF6D] underline mb-2 inline-block"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Visit page →
                          </a>
                        )}
                        <div className="text-xs text-[#5A5A5A] flex items-center justify-between pt-2 border-t border-[#A18463]/30">
                          <span>{getUserDisplay(bulletin)}</span>
                          <span>Expires in {getDaysUntilExpiry(bulletin.expiresAt)}d</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedUsername && (
          <UserQuickView
            username={selectedUsername}
            isOpen={!!selectedUsername}
            onClose={() => setSelectedUsername(null)}
          />
        )}
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<BulletinPageProps> = async (context) => {
  const siteConfig = await getSiteConfig();
  const user = await getSessionUser(context.req as any);

  return {
    props: {
      siteConfig,
      ...(user
        ? {
            user: {
              id: user.id,
              primaryHandle: user.primaryHandle,
              role: user.role,
            },
          }
        : {}),
    },
  };
};
