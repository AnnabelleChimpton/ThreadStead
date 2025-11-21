import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { csrfFetchJson } from '@/lib/api/client/csrf-fetch';

interface PollOption {
  id: string;
  text: string;
  order: number;
  voteCount: number;
  percentage: number;
}

interface Poll {
  id: string;
  question: string;
  description?: string | null;
  createdAt: string;
  endsAt?: string | null;
  isActive: boolean;
  isClosed: boolean;
  totalVotes: number;
  userVote: string | null;
  options: PollOption[];
  creator: {
    id: string;
    primaryHandle: string | null;
    role: string;
  };
}

interface PollsData {
  polls: Poll[];
}

export default function PollsPanel() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [expandedPolls, setExpandedPolls] = useState<Set<string>>(new Set());
  const { user, loggedIn } = useCurrentUser();

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/polls', {
        credentials: 'include'
      });

      if (response.ok) {
        const data: PollsData = await response.json();
        setPolls(data.polls);
      }
    } catch (err) {
      console.error('Error fetching polls:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!loggedIn || voting) return;

    try {
      setVoting(pollId);
      await csrfFetchJson(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        body: { optionId }
      });

      // Refresh polls to get updated vote counts
      await fetchPolls();
    } catch (err: any) {
      console.error('Error voting:', err);
      alert(err.message || 'Failed to record vote');
    } finally {
      setVoting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const togglePollExpanded = (pollId: string) => {
    setExpandedPolls((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pollId)) {
        newSet.delete(pollId);
      } else {
        newSet.add(pollId);
      }
      return newSet;
    });
  };

  const renderPollOption = (poll: Poll, option: PollOption, showResults: boolean) => {
    const isUserVote = poll.userVote === option.id;
    const isSelected = selectedOptions[poll.id] === option.id;

    if (showResults) {
      return (
        <div
          key={option.id}
          className={`mb-3 p-3 border rounded ${
            isUserVote
              ? 'border-2 border-thread-meadow bg-thread-meadow/5'
              : 'border-[#A18463]'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-medium text-[#2E4B3F]">
                {option.text}
              </span>
              {isUserVote && (
                <span className="text-xs bg-thread-meadow text-white px-2 py-0.5 rounded">
                  Your vote
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-thread-sage">
              {option.percentage}%
            </span>
          </div>
          <div className="bg-[#D4C4A8] rounded-full overflow-hidden h-3">
            <div
              className="bg-thread-sage h-3 rounded-full transition-all duration-500"
              style={{ width: `${option.percentage}%` }}
            />
          </div>
          <div className="text-xs text-thread-sage/70 mt-1">
            {option.voteCount} {option.voteCount === 1 ? 'vote' : 'votes'}
          </div>
        </div>
      );
    }

    return (
      <button
        key={option.id}
        onClick={() => setSelectedOptions({ ...selectedOptions, [poll.id]: option.id })}
        disabled={voting === poll.id}
        className={`w-full mb-2 p-3 border rounded text-left transition-all ${
          isSelected
            ? 'border-2 border-thread-meadow bg-thread-meadow/10'
            : 'border-[#A18463] hover:bg-thread-cream/50'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              isSelected ? 'border-thread-meadow bg-thread-meadow' : 'border-[#A18463]'
            }`}
          >
            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
          </div>
          <span className="text-sm sm:text-base text-[#2E4B3F]">{option.text}</span>
        </div>
      </button>
    );
  };

  const renderPoll = (poll: Poll) => {
    const showResults = poll.isClosed;
    const canVote = loggedIn && !poll.isClosed;
    const hasVoted = poll.userVote !== null;
    const hasSelected = selectedOptions[poll.id] !== undefined;
    const isExpanded = expandedPolls.has(poll.id);

    // Pre-select user's current vote if they haven't selected a different option
    const currentSelection = hasSelected ? selectedOptions[poll.id] : (hasVoted ? poll.userVote : undefined);

    // Find winning option for closed polls
    const winningOption = poll.isClosed
      ? poll.options.reduce((max, opt) => opt.voteCount > max.voteCount ? opt : max, poll.options[0])
      : null;

    // Compact view for closed polls
    if (poll.isClosed && !isExpanded) {
      return (
        <div
          key={poll.id}
          className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[1px_1px_0_#A18463] p-2 sm:p-3 mb-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-[#2E4B3F] truncate">
                  {poll.question}
                </h4>
                <span className="text-xs bg-thread-stone text-white px-2 py-0.5 rounded whitespace-nowrap">
                  Closed
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-thread-sage/70">
                <span>{poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}</span>
                {winningOption && poll.totalVotes > 0 && (
                  <>
                    <span>•</span>
                    <span className="truncate">Winner: {winningOption.text}</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => togglePollExpanded(poll.id)}
              className="px-2 py-1 text-xs border border-[#A18463] rounded hover:bg-thread-cream/50 whitespace-nowrap"
            >
              View Results
            </button>
          </div>
        </div>
      );
    }

    // Full view for active polls or expanded closed polls
    return (
      <div
        key={poll.id}
        className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-3 sm:p-4 mb-3 sm:mb-4"
      >
        {/* Poll header */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-base sm:text-lg font-bold text-[#2E4B3F] flex-1">
              {poll.question}
            </h4>
            {poll.isActive && !poll.isClosed && (
              <span className="text-xs bg-thread-meadow text-white px-2 py-1 rounded whitespace-nowrap">
                Active
              </span>
            )}
            {poll.isClosed && (
              <span className="text-xs bg-thread-stone text-white px-2 py-1 rounded whitespace-nowrap">
                Closed
              </span>
            )}
          </div>
          {poll.description && (
            <p className="text-sm text-thread-sage mb-2">{poll.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-thread-sage/70">
            <span>Posted {formatDate(poll.createdAt)}</span>
            {poll.endsAt && !poll.isClosed && (
              <span>• Ends {formatDate(poll.endsAt)}</span>
            )}
            <span>• {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}</span>
          </div>
        </div>

        {/* Results shown ABOVE voting interface for users who have voted */}
        {canVote && hasVoted && (
          <>
            <div className="text-sm font-medium text-[#2E4B3F] mb-2">
              Current results:
            </div>
            <div className="mb-4">
              {poll.options.map((option) => renderPollOption(poll, option, true))}
            </div>
          </>
        )}

        {/* Voting interface for active polls */}
        {canVote && (
          <>
            <div className="mb-3">
              <div className="text-sm font-medium text-[#2E4B3F] mb-2">
                {hasVoted ? 'Change your vote:' : 'Cast your vote:'}
              </div>
              {poll.options.map((option) => {
                const isSelected = currentSelection === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedOptions({ ...selectedOptions, [poll.id]: option.id })}
                    disabled={voting === poll.id}
                    className={`w-full mb-2 p-3 border rounded text-left transition-all ${
                      isSelected
                        ? 'border-2 border-thread-meadow bg-thread-meadow/10'
                        : 'border-[#A18463] hover:bg-thread-cream/50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-thread-meadow bg-thread-meadow' : 'border-[#A18463]'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span className="text-sm sm:text-base text-[#2E4B3F]">{option.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => currentSelection && handleVote(poll.id, currentSelection)}
              disabled={!currentSelection || voting === poll.id}
              className={`w-full border border-[#A18463] px-4 py-2 rounded shadow-cozySm transition-all mb-3 ${
                currentSelection && voting !== poll.id
                  ? 'bg-thread-cream hover:bg-thread-sage/10 active:translate-x-[1px] active:translate-y-[1px]'
                  : 'bg-gray-100 cursor-not-allowed opacity-50'
              }`}
            >
              {voting === poll.id ? 'Submitting...' : hasVoted ? 'Change Vote' : 'Submit Vote'}
            </button>
          </>
        )}

        {/* Results for closed polls */}
        {showResults && (
          <>
            <div className="text-sm font-medium text-[#2E4B3F] mb-2">
              Final results:
            </div>
            <div className="mb-3">
              {poll.options.map((option) => renderPollOption(poll, option, true))}
            </div>
            {isExpanded && (
              <button
                onClick={() => togglePollExpanded(poll.id)}
                className="text-xs text-thread-sage hover:text-thread-pine underline"
              >
                Collapse
              </button>
            )}
          </>
        )}

        {/* Message for logged-out users */}
        {!loggedIn && !poll.isClosed && (
          <div className="text-center text-sm text-thread-sage/70 italic">
            Log in to vote in this poll
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-3 sm:p-4 mb-3 sm:mb-4 w-full max-w-full overflow-hidden">
      <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-[#2E4B3F] px-1 flex items-center gap-2">
        <PixelIcon name="chart" size={20} />
        Polls
      </h3>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-[#D4C4A8] rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-[#D4C4A8] rounded w-full mb-1"></div>
              <div className="h-3 bg-[#D4C4A8] rounded w-5/6"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && polls.length === 0 && (
        <div className="text-center py-6">
          <PixelIcon name="chart" size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm sm:text-base mb-2 text-thread-sage">No active polls right now</p>
          <p className="text-xs sm:text-sm text-thread-sage/70">Check back later!</p>
        </div>
      )}

      {/* Polls list */}
      {!loading && polls.length > 0 && (
        <div>{polls.map((poll) => renderPoll(poll))}</div>
      )}
    </div>
  );
}
