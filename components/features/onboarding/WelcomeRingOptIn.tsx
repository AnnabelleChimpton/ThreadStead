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
    <div className="max-w-2xl w-full bg-white border border-black p-8 shadow-[4px_4px_0_#000]">
      {/* Success message for username */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🎉</div>
        <h2 className="text-2xl font-bold text-green-700 mb-2">
          Welcome, {username}!
        </h2>
        <p className="text-gray-600">
          Your username has been claimed successfully.
        </p>
      </div>

      {/* Welcome Ring invitation */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed border-purple-300 rounded-xl p-6 mb-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🧵</div>
          <h3 className="text-xl font-bold text-purple-800 mb-3">
            Want a guided tour?
          </h3>
          <p className="text-purple-700 mb-4 leading-relaxed">
            <strong>Join the Welcome Ring to learn how ThreadRings work!</strong><br/>
            It&apos;s a fun, interactive tutorial that teaches you about communities, posting, and connecting with others.
          </p>
          
          <div className="bg-white/80 border border-purple-200 rounded-lg p-4 mb-4">
            <h4 className="font-bold text-purple-800 mb-2">What you&apos;ll learn:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-purple-700">
              <div className="flex items-center gap-2">
                <span>📖</span>
                <span>How to read Ring posts</span>
              </div>
              <div className="flex items-center gap-2">
                <span>💬</span>
                <span>Join conversations</span>
              </div>
              <div className="flex items-center gap-2">
                <span>👤</span>
                <span>Explore member profiles</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🌳</span>
                <span>Discover the Ring family tree</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-purple-600 italic">
            Takes about 5 minutes • You can leave anytime • Get a graduate badge! 🎓
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={handleJoin}
          disabled={isLoading}
          className="px-8 py-3 bg-gradient-to-r from-purple-200 to-blue-200 hover:from-purple-300 hover:to-blue-300 border-2 border-purple-400 shadow-[3px_3px_0_#7c3aed] hover:shadow-[4px_4px_0_#7c3aed] font-bold text-purple-800 transition-all hover:translate-y-[-2px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && decision === true ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⭐</span>
              Joining Welcome Ring...
            </span>
          ) : (
            <>🎯 Yes, start the tour!</>
          )}
        </button>
        
        <button
          onClick={handleSkip}
          disabled={isLoading}
          className="px-8 py-3 bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 shadow-[2px_2px_0_#6b7280] font-medium text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && decision === false ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⭐</span>
              Finishing setup...
            </span>
          ) : (
            <>Skip for now</>
          )}
        </button>
      </div>

      <div className="text-center mt-4">
        <p className="text-xs text-gray-500">
          Don&apos;t worry! You can always join the Welcome Ring later from your profile or the ThreadRings page.
        </p>
      </div>
    </div>
  );
}