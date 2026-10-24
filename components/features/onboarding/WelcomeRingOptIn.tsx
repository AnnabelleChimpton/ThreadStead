import { useState } from 'react';

interface WelcomeRingOptInProps {
  username: string;
  onDecision: (joinWelcomeRing: boolean) => void;
  isLoading?: boolean;
}

export default function WelcomeRingOptIn({ 
  username, 
  onDecision, 
  isLoading = false 
}: WelcomeRingOptInProps) {
  const [decision, setDecision] = useState<boolean | null>(null);

  const handleJoin = () => {
    setDecision(true);
    onDecision(true);
  };

  const handleSkip = () => {
    setDecision(false);
    onDecision(false);
  };

  return (
    <div className="w-full max-w-2xl">
    <div className="thread-module">
    <div className="sm:p-4">
      {/* Success message for username */}
      <div className="text-center mb-6">
        <h2 className="thread-headline text-2xl font-bold mb-2">
          Welcome, {username}!
        </h2>
        <p className="text-nb-ink-mid">
          It&apos;s all yours!
        </p>
      </div>

      {/* Welcome Ring invitation */}
      <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-cozy p-5 mb-6">
        <div className="text-center">
          <h3 className="thread-headline text-xl font-bold mb-3">
            Start with the Welcome Ring?
          </h3>
          <p className="text-nb-ink mb-0 leading-relaxed">
            It&apos;s where new people say hi, so it&apos;s a good first ring. Post a hello, read what everyone else
            wrote, and you&apos;ll see how rings work. You can leave whenever you want.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={handleJoin}
          disabled={isLoading}
          className="thread-button btn btn--primary btn--lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && decision === true ? (
            <span className="flex items-center gap-2">
              Joining Welcome Ring...
            </span>
          ) : (
            <>Yes, join it</>
          )}
        </button>
        
        <button
          onClick={handleSkip}
          disabled={isLoading}
          className="thread-button-secondary btn btn--secondary btn--lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && decision === false ? (
            <span className="flex items-center gap-2">
              Finishing setup...
            </span>
          ) : (
            <>Skip for now</>
          )}
        </button>
      </div>

      <div className="text-center mt-4">
        <p className="text-xs text-nb-ink-mid">
          You can join it later from the ThreadRings page.
        </p>
      </div>
    </div>
    </div>
    </div>
  );
}