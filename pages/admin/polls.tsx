import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { csrfFetchJson } from '@/lib/api/client/csrf-fetch';
import { PixelIcon } from '@/components/ui/PixelIcon';
import Head from 'next/head';

interface PollOption {
  id: string;
  text: string;
  order: number;
  voteCount?: number;
}

interface Poll {
  id: string;
  question: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  endsAt: string | null;
  isActive: boolean;
  creator: {
    id: string;
    primaryHandle: string | null;
    role: string;
  };
  options?: PollOption[];
  _count: {
    votes: number;
    options: number;
  };
}

interface CreatePollForm {
  question: string;
  description: string;
  options: string[];
  endsAt: string;
}

interface AdminPollsPageProps {
  isAdmin: boolean;
  userId: string | null;
}

export default function AdminPollsPage({ isAdmin, userId }: AdminPollsPageProps) {
  const router = useRouter();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);

  const [createForm, setCreateForm] = useState<CreatePollForm>({
    question: '',
    description: '',
    options: ['', ''],
    endsAt: ''
  });

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }
    fetchPolls();
  }, [isAdmin]);

  const fetchPolls = async () => {
    try {
      const response = await fetch('/api/admin/polls?limit=50');
      const data = await response.json();

      if (response.ok) {
        setPolls(data.polls);
      }
    } catch (error) {
      console.error('Failed to fetch polls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Filter out empty options
      const validOptions = createForm.options.filter(opt => opt.trim().length > 0);

      if (validOptions.length < 2) {
        alert('Please provide at least 2 options');
        setSubmitting(false);
        return;
      }

      const data = await csrfFetchJson('/api/admin/polls', {
        method: 'POST',
        body: {
          question: createForm.question,
          description: createForm.description || null,
          options: validOptions,
          endsAt: createForm.endsAt || null
        }
      });

      alert('Poll created successfully!');
      setShowCreateForm(false);
      setCreateForm({
        question: '',
        description: '',
        options: ['', ''],
        endsAt: ''
      });
      fetchPolls();
    } catch (error: any) {
      console.error('Failed to create poll:', error);
      alert(error.message || 'Failed to create poll');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (pollId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'close' : 'activate'} this poll?`)) {
      return;
    }

    try {
      await csrfFetchJson(`/api/admin/polls/${pollId}`, {
        method: 'PATCH',
        body: { isActive: !currentStatus }
      });

      alert('Poll updated successfully!');
      fetchPolls();
    } catch (error: any) {
      console.error('Failed to update poll:', error);
      alert(error.message || 'Failed to update poll');
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
      return;
    }

    try {
      await csrfFetchJson(`/api/admin/polls/${pollId}`, {
        method: 'DELETE'
      });

      alert('Poll deleted successfully!');
      fetchPolls();
    } catch (error: any) {
      console.error('Failed to delete poll:', error);
      alert(error.message || 'Failed to delete poll');
    }
  };

  const addOption = () => {
    if (createForm.options.length < 10) {
      setCreateForm({
        ...createForm,
        options: [...createForm.options, '']
      });
    }
  };

  const removeOption = (index: number) => {
    if (createForm.options.length > 2) {
      setCreateForm({
        ...createForm,
        options: createForm.options.filter((_, i) => i !== index)
      });
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...createForm.options];
    newOptions[index] = value;
    setCreateForm({
      ...createForm,
      options: newOptions
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return <div>Redirecting...</div>;
  }

  return (
    <>
      <Head>
        <title>Polls Management - Admin</title>
      </Head>

      <div className="min-h-screen bg-[#F5E9D4] p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="thread-module p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <PixelIcon name="chart" size={32} className="text-thread-sage" />
                <h1 className="text-3xl font-bold text-[#2E4B3F]">Polls Management</h1>
              </div>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="border border-[#A18463] px-4 py-2 bg-thread-cream hover:bg-thread-sage/10 rounded shadow-cozySm"
              >
                <PixelIcon name={showCreateForm ? 'close' : 'plus'} size={16} className="inline mr-2" />
                {showCreateForm ? 'Cancel' : 'Create Poll'}
              </button>
            </div>
            <p className="text-thread-sage">Manage community polls, create new polls, and view voting statistics.</p>
          </div>

          {/* Create Poll Form */}
          {showCreateForm && (
            <div className="thread-module p-6 mb-6">
              <h2 className="text-xl font-bold text-[#2E4B3F] mb-4">Create New Poll</h2>
              <form onSubmit={handleCreatePoll} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#2E4B3F] mb-1">
                    Question <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.question}
                    onChange={(e) => setCreateForm({ ...createForm, question: e.target.value })}
                    className="w-full border border-[#A18463] p-2 rounded"
                    placeholder="What would you like to ask the community?"
                    required
                    maxLength={500}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2E4B3F] mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full border border-[#A18463] p-2 rounded"
                    placeholder="Add more context or details about this poll..."
                    rows={3}
                    maxLength={1000}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2E4B3F] mb-2">
                    Options <span className="text-red-500">*</span> (2-10)
                  </label>
                  {createForm.options.map((option, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className="flex-1 border border-[#A18463] p-2 rounded"
                        placeholder={`Option ${index + 1}`}
                        required
                        maxLength={200}
                      />
                      {createForm.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="px-3 py-2 border border-red-400 text-red-600 hover:bg-red-50 rounded"
                        >
                          <PixelIcon name="close" size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {createForm.options.length < 10 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-sm text-thread-sage hover:text-thread-pine"
                    >
                      + Add Option
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2E4B3F] mb-1">
                    End Date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.endsAt}
                    onChange={(e) => setCreateForm({ ...createForm, endsAt: e.target.value })}
                    className="w-full border border-[#A18463] p-2 rounded"
                  />
                  <p className="text-xs text-thread-sage/70 mt-1">
                    Leave empty for no expiration
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="border border-[#A18463] px-6 py-2 bg-thread-meadow text-white hover:bg-thread-meadow/90 rounded shadow-cozySm disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Poll'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="border border-[#A18463] px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Polls List */}
          <div className="thread-module p-6">
            <h2 className="text-xl font-bold text-[#2E4B3F] mb-4">All Polls</h2>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-[#D4C4A8] rounded"></div>
                  ))}
                </div>
              </div>
            ) : polls.length === 0 ? (
              <div className="text-center py-8 text-thread-sage">
                <PixelIcon name="chart" size={48} className="mx-auto mb-3 opacity-30" />
                <p>No polls yet. Create your first poll!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.map((poll) => (
                  <div
                    key={poll.id}
                    className="border border-[#A18463] rounded-lg p-4 bg-[#FCFAF7]"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-[#2E4B3F]">{poll.question}</h3>
                          {poll.isActive ? (
                            <span className="text-xs bg-thread-meadow text-white px-2 py-1 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs bg-thread-stone text-white px-2 py-1 rounded">
                              Closed
                            </span>
                          )}
                        </div>
                        {poll.description && (
                          <p className="text-sm text-thread-sage mb-2">{poll.description}</p>
                        )}
                        <div className="flex gap-4 text-xs text-thread-sage/70">
                          <span>Created {formatDate(poll.createdAt)}</span>
                          {poll.endsAt && (
                            <span>• Ends {formatDate(poll.endsAt)}</span>
                          )}
                          <span>• {poll._count.votes} votes</span>
                          <span>• {poll._count.options} options</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActive(poll.id, poll.isActive)}
                          className="px-3 py-2 border border-[#A18463] text-sm rounded hover:bg-thread-cream"
                          title={poll.isActive ? 'Close poll' : 'Activate poll'}
                        >
                          <PixelIcon
                            name={poll.isActive ? 'check' : 'edit'}
                            size={16}
                          />
                        </button>
                        <button
                          onClick={() => handleDeletePoll(poll.id)}
                          className="px-3 py-2 border border-red-400 text-red-600 text-sm rounded hover:bg-red-50"
                          title="Delete poll"
                        >
                          <PixelIcon name="close" size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<AdminPollsPageProps> = async (context) => {
  const user = await getSessionUser(context.req as any);

  return {
    props: {
      isAdmin: user?.role === 'admin' || false,
      userId: user?.id || null
    }
  };
};
