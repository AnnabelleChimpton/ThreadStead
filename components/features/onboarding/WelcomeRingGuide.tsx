import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WelcomeProgress, WelcomeStep } from '@/lib/welcome/types';
import { getWelcomeProgress, updateWelcomeProgress } from '@/lib/welcome/progress';
import { celebrateAction, setCelebrationToastHandler } from '@/lib/welcome/celebrations';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/ui/feedback/Toast';
import { useWelcomeRingIntro } from '@/hooks/useWelcomeRingIntro';
import WelcomeRingIntroPopup from './WelcomeRingIntroPopup';

interface WelcomeRingGuideProps {
  ringSlug: string;
  viewer?: {
    id: string;
    primaryHandle?: string | null;
    threadRingMemberships?: Array<{ threadRingId: string }>;
  } | null;
  ring?: {
    curator?: {
      id: string;
    } | null;
  } | null;
}

export default function WelcomeRingGuide({ ringSlug, viewer, ring }: WelcomeRingGuideProps) {
  const [progress, setProgress] = useState<WelcomeProgress | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toasts, showSuccess, hideToast } = useToast();
  const { shouldShowIntro, isLoading: introLoading, markIntroAsSeen } = useWelcomeRingIntro(ringSlug);

  // Hydration fix - only render progress-dependent content on client
  useEffect(() => {
    setIsClient(true);
    setProgress(getWelcomeProgress());
  }, []);
  
  // Set up the toast handler for celebrations
  useEffect(() => {
    setCelebrationToastHandler(showSuccess);
  }, [showSuccess]);

  // Listen for progress updates (useful for testing)
  useEffect(() => {
    const handleProgressUpdate = () => {
      const newProgress = getWelcomeProgress();
      setProgress(newProgress);
      
      // Reset currentStepIndex if progress was reset
      if (!newProgress.readFirstPost && !newProgress.leftFirstComment && 
          !newProgress.visitedProfile && !newProgress.browseRings) {
        setCurrentStepIndex(0);
        setIsMinimized(false); // Expand the guide when reset
      }
    };
    
    window.addEventListener('welcomeProgressUpdate', handleProgressUpdate);
    return () => {
      window.removeEventListener('welcomeProgressUpdate', handleProgressUpdate);
    };
  }, []);

  // Helper function to get steps from progress
  const getStepsFromProgress = (progress: WelcomeProgress): WelcomeStep[] => [
    {
      id: 'joinedRing',
      title: 'Join the Welcome Ring',
      description: 'Click "Join Ring" to become a member and get started!',
      target: '.join-button',
      completed: progress.joinedRing
    },
    {
      id: 'readFirstPost',
      title: 'Check out the discussion',
      description: 'Click "View Comments" on any post to see the conversation',
      target: '.comment-button',
      completed: progress.readFirstPost
    },
    {
      id: 'leftFirstComment', 
      title: 'Join the conversation',
      description: 'Share your thoughts! Try commenting on the "Introduce Yourself" post',
      target: '.comment-button',
      completed: progress.leftFirstComment
    },
    {
      id: 'visitedProfile',
      title: 'Visit a member profile',
      description: 'Click on any username to see their profile and discover their style',
      target: '.user-link',
      completed: progress.visitedProfile
    },
    {
      id: 'browseRings',
      title: 'Discover more Rings', 
      description: 'Browse other communities and find ones that match your interests',
      target: '.browse-rings-link',
      completed: progress.browseRings
    }
  ];

  // Find current step (first incomplete step)
  useEffect(() => {
    if (!progress) return;
    const steps = getStepsFromProgress(progress);
    const firstIncompleteIndex = steps.findIndex(step => !step.completed);
    setCurrentStepIndex(firstIncompleteIndex === -1 ? steps.length : firstIncompleteIndex);
  }, [progress]);

  // Check if user is already a member of the Welcome ring and auto-progress first step
  useEffect(() => {
    if (!isClient || !progress || !viewer) return;
    
    // Check if user is already a member of the Welcome ring
    const isWelcomeRingMember = viewer.threadRingMemberships?.some(
      membership => membership.threadRingId === 'welcome'
    );
    
    // Also check if user is the Ring Host/Curator (important edge case!)
    const isRingHost = ring?.curator && viewer.id === ring.curator.id;
    
    // If they're a member OR the host but haven't completed the first step, auto-progress it
    if ((isWelcomeRingMember || isRingHost) && !progress.joinedRing) {
      const updatedProgress = updateWelcomeProgress({ joinedRing: true });
      setProgress(updatedProgress);
      celebrateAction('joinedRing');
      
      // Show appropriate toast message
      if (isRingHost) {
        // Special message for the Ring Host
        showSuccess("Welcome back! As the Ring Host, you're automatically part of this community! 👑");
      }
    }
  }, [isClient, progress, viewer, ring]);

  // Check for completion
  useEffect(() => {
    if (!progress || progress.completedWelcome) return;
    const steps = getStepsFromProgress(progress);
    if (steps.every(step => step.completed)) {
      const updatedProgress = updateWelcomeProgress({ completedWelcome: true });
      setProgress(updatedProgress);
      celebrateAction('completedWelcome');
    }
  }, [progress]);

  // Handle intro popup actions
  const handleStartTour = () => {
    // Ensure the guide is expanded when starting the tour
    setIsMinimized(false);
    
    // Show welcome toast for existing members
    if (viewer?.threadRingMemberships?.some(m => m.threadRingId === 'welcome')) {
      setTimeout(() => {
        showSuccess('Welcome back to the Welcome Ring! 🎉 You&apos;re already a member, so we&apos;ve marked that step complete.');
      }, 500);
    }
  };

  const handleCloseIntro = () => {
    markIntroAsSeen();
    
    // Show welcome toast for existing members
    if (viewer?.threadRingMemberships?.some(m => m.threadRingId === 'welcome')) {
      setTimeout(() => {
        showSuccess('Welcome back to the Welcome Ring! 🎉 You&apos;re already a member, so we&apos;ve marked that step complete.');
      }, 500);
    }
  };

  // Don't render until client-side hydration is complete
  if (!isClient || !progress) {
    return null;
  }

  // Get current steps (after progress check)
  const steps = getStepsFromProgress(progress);

  // Don't show if already completed
  if (progress.completedWelcome) {
    return (
      <div className="bg-gradient-to-r from-green-100 to-blue-100 border-b-2 border-green-400 p-3">
        <div className="text-center">
          <span className="text-green-700 font-bold">🎓 Welcome Ring Graduate!</span>
          <span className="ml-2 text-green-600 text-sm">You&apos;ve completed the welcome tour!</span>
        </div>
      </div>
    );
  }

  // Don't show if not on welcome ring
  if (ringSlug !== 'welcome') {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="sticky top-0 z-40 bg-yellow-100 border-b-2 border-yellow-400 p-2">
        <button
          onClick={() => setIsMinimized(false)}
          className="text-sm text-yellow-700 hover:text-yellow-900 font-medium"
        >
          → Show Welcome Tour ({steps.filter(s => s.completed).length}/{steps.length} complete)
        </button>
      </div>
    );
  }

  const currentStep = steps[currentStepIndex];
  const completedCount = steps.filter(s => s.completed).length;
  const progressPercentage = (completedCount / steps.length) * 100;

  return (
    <>
      {/* Welcome Intro Popup */}
      {shouldShowIntro && !introLoading && (
        <WelcomeRingIntroPopup
          onClose={handleCloseIntro}
          onStartTour={handleStartTour}
        />
      )}

      <div className="sticky top-0 z-40 bg-gradient-to-r from-green-100 via-blue-100 to-purple-100 border-b-4 border-dashed border-black">
        {/* Progress bar */}
        <div className="h-2 bg-white/50">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-blue-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-gray-700">Welcome Tour</span>
            
            {/* Progress dots */}
            <div className="flex gap-2">
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    step.completed 
                      ? 'bg-green-500 shadow-lg scale-110' 
                      : currentStepIndex === idx
                      ? 'bg-blue-400 animate-pulse'
                      : 'bg-gray-300'
                  }`}
                  title={step.title}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Minimize
          </button>
        </div>

        {/* Current step */}
        {currentStep && (
          <div className="flex items-center justify-between bg-white/80 rounded-lg px-4 py-2 border-2 border-black shadow-[2px_2px_0_#000]">
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {currentStepIndex === 0 && '🎯'}
                {currentStepIndex === 1 && '💬'}
                {currentStepIndex === 2 && '✍️'}
                {currentStepIndex === 3 && '👤'}
                {currentStepIndex === 4 && '🧵'}
              </div>
              <div>
                <div className="font-medium text-gray-800">{currentStep.title}</div>
                <div className="text-sm text-gray-600">{currentStep.description}</div>
              </div>
            </div>
            
            {currentStepIndex === 4 && (
              <Link
                href="/threadrings"
                className="text-sm bg-blue-200 hover:bg-blue-300 px-3 py-1 rounded border border-black shadow-[1px_1px_0_#000] font-medium"
              >
                Browse Rings
              </Link>
            )}
            
            {!currentStep.completed && (
              <span className="animate-bounce text-blue-500 text-xl">→</span>
            )}
          </div>
        )}

        {/* Completion message */}
        {completedCount === steps.length && (
          <div className="mt-3 text-center">
            <span className="text-green-600 font-bold">Almost there! Complete all steps to graduate!</span>
          </div>
        )}
      </div>
      
        {/* Toast Notifications for Welcome Ring celebrations */}
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
}