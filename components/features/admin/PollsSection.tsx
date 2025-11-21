import React, { useState, useEffect } from 'react';
import { csrfFetchJson } from '@/lib/api/client/csrf-fetch';
import { PixelIcon } from '@/components/ui/PixelIcon';

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

export default function PollsSection() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState<CreatePollForm>({
    question: '',
    description: '',
    options: ['', ''],
    endsAt: ''
  });

  useEffect(() => {
    fetchPolls();
  }, []);

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

  return (
    <div className="border border-gray-300 rounded p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold flex items-center gap-2">
          <PixelIcon name="chart" /> Community Polls
        </h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="border border-black px-3 py-1 bg-blue-200 hover:bg-blue-100 shadow-[1px_1px_0_#000] text-sm"
        >
          <PixelIcon name={showCreateForm ? 'close' : 'plus'} size={14} className="inline mr-1 align-middle" />
          {showCreateForm ? 'Cancel' : 'Create Poll'}
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Manage community polls, create new polls, and view voting statistics.
      </p>

      {/* Create Poll Form */}
      {showCreateForm && (
        <div className="border border-gray-200 rounded p-4 bg-white mb-4">
          <h4 className="font-bold mb-3">Create New Poll</h4>
          <form onSubmit={handleCreatePoll} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Question <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createForm.question}
                onChange={(e) => setCreateForm({ ...createForm, question: e.target.value })}
                className="w-full border border-black p-2 text-sm"
                placeholder="What would you like to ask the community?"
                required
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description (optional)
              </label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="w-full border border-black p-2 text-sm"
                placeholder="Add more context or details about this poll..."
                rows={3}
                maxLength={1000}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Options <span className="text-red-500">*</span> (2-10)
              </label>
              {createForm.options.map((option, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    className="flex-1 border border-black p-2 text-sm"
                    placeholder={`Option ${index + 1}`}
                    required
                    maxLength={200}
                  />
                  {createForm.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="px-2 py-1 border border-black text-red-600 hover:bg-red-50"
                    >
                      <PixelIcon name="close" size={14} />
                    </button>
                  )}
                </div>
              ))}
              {createForm.options.length < 10 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Option
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                End Date (optional)
              </label>
              <input
                type="datetime-local"
                value={createForm.endsAt}
                onChange={(e) => setCreateForm({ ...createForm, endsAt: e.target.value })}
                className="w-full border border-black p-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for no expiration
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="border border-black px-4 py-2 bg-green-200 hover:bg-green-100 shadow-[1px_1px_0_#000] text-sm disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Poll'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="border border-black px-4 py-2 bg-gray-200 hover:bg-gray-300 shadow-[1px_1px_0_#000] text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Polls List */}
      <div>
        <h4 className="font-bold mb-3">All Polls</h4>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading polls...</div>
        ) : polls.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <PixelIcon name="chart" size={32} className="mx-auto mb-2 opacity-30" />
            <p>No polls yet. Create your first poll!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {polls.map((poll) => (
              <div
                key={poll.id}
                className="border border-gray-300 rounded p-3 bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-semibold">{poll.question}</h5>
                      {poll.isActive ? (
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                          Closed
                        </span>
                      )}
                    </div>
                    {poll.description && (
                      <p className="text-sm text-gray-600 mb-2">{poll.description}</p>
                    )}
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>Created {formatDate(poll.createdAt)}</span>
                      {poll.endsAt && (
                        <span>• Ends {formatDate(poll.endsAt)}</span>
                      )}
                      <span>• {poll._count.votes} votes</span>
                      <span>• {poll._count.options} options</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggleActive(poll.id, poll.isActive)}
                      className="px-2 py-1 border border-black text-xs bg-blue-200 hover:bg-blue-100 shadow-[1px_1px_0_#000]"
                      title={poll.isActive ? 'Close poll' : 'Activate poll'}
                    >
                      <PixelIcon
                        name={poll.isActive ? 'check' : 'edit'}
                        size={14}
                      />
                    </button>
                    <button
                      onClick={() => handleDeletePoll(poll.id)}
                      className="px-2 py-1 border border-black text-xs text-red-600 bg-red-50 hover:bg-red-100 shadow-[1px_1px_0_#000]"
                      title="Delete poll"
                    >
                      <PixelIcon name="close" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
