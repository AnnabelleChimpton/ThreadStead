import { useState } from 'react';
import { csrfFetchJson } from '@/lib/api/client/csrf-fetch';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface PollOption {
  id: string;
  text: string;
  percentage: number;
  voteCount: number;
}

interface Poll {
  id: string;
  question: string;
  description?: string | null;
  totalVotes: number;
  userVote: string | null;
  options: PollOption[];
}

interface PollPreviewProps {
  poll: Poll;
  onVoted?: () => void;
}

export default function PollPreview({ poll, onVoted }: PollPreviewProps) {
  const [voting, setVoting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(poll.userVote);
  const { loggedIn } = useCurrentUser();

  const handleVote = async () => {
    if (!loggedIn || !selectedOption || voting) return;

    try {
      setVoting(true);
      await csrfFetchJson(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        body: { optionId: selectedOption }
      });

      if (onVoted) {
        onVoted();
      }
    } catch (err: any) {
      console.error('Error voting:', err);
      alert(err.message || 'Failed to record vote');
    } finally {
      setVoting(false);
    }
  };

  const hasVoted = poll.userVote !== null;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-[#2E4B3F] mb-1">{poll.question}</h4>
        {poll.description && (
          <p className="text-xs text-thread-sage mb-2">{poll.description}</p>
        )}
        <p className="text-xs text-thread-sage/70">
          {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}
        </p>
      </div>

      {loggedIn ? (
        <>
          <div className="space-y-2">
            {poll.options.map((option) => {
              const isSelected = selectedOption === option.id;
              const isUserVote = poll.userVote === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedOption(option.id)}
                  disabled={voting}
                  className={`w-full p-2 border rounded text-left text-xs transition-all ${
                    isSelected
                      ? 'border-2 border-thread-meadow bg-thread-meadow/10'
                      : 'border-[#A18463] hover:bg-thread-cream/50'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-thread-meadow bg-thread-meadow' : 'border-[#A18463]'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className="text-[#2E4B3F]">{option.text}</span>
                    </div>
                    {isUserVote && (
                      <span className="text-xs bg-thread-meadow text-white px-1.5 py-0.5 rounded flex-shrink-0">
                        Your vote
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleVote}
            disabled={!selectedOption || voting}
            className={`w-full border border-[#A18463] px-3 py-1.5 rounded text-xs shadow-sm transition-all ${
              selectedOption && !voting
                ? 'bg-thread-cream hover:bg-thread-sage/10 active:translate-x-[1px] active:translate-y-[1px]'
                : 'bg-gray-100 cursor-not-allowed opacity-50'
            }`}
          >
            {voting ? 'Submitting...' : hasVoted ? 'Change Vote' : 'Submit Vote'}
          </button>
        </>
      ) : (
        <div className="text-center text-xs text-thread-sage/70 italic py-2">
          Log in to vote in this poll
        </div>
      )}
    </div>
  );
}
