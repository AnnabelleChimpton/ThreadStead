import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WelcomeProgress, WelcomeStep } from '@/lib/welcome/types';
import { getWelcomeProgress, updateWelcomeProgress } from '@/lib/welcome/progress';
import { celebrateAction, setCelebrationToastHandler } from '@/lib/welcome/celebrations';
import { useToast } from "@/contexts/ToastContext";
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
  const { showSuccess } = useToast();
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
      description: 'Click "Join Ring" at the top of this page.',
      target: '.join-button',
      completed: progress.joinedRing
    },
    {
      id: 'readFirstPost',
      title: 'Open a thread',
      description: 'Click the comment count under any post to read the replies.',
      target: '.comment-button',
      completed: progress.readFirstPost
    },
    {
      id: 'leftFirstComment', 
      title: 'Leave a comment',
      description: 'Say hello on the "Introduce Yourself" post, or reply to anything.',
      target: '.comment-button',
      completed: progress.leftFirstComment
    },
    {
      id: 'visitedProfile',
      title: 'Visit someone\'s page',
      description: 'Click any username to see their page.',
      target: '.user-link',
      completed: progress.visitedProfile
    },
    {
      id: 'browseRings',
      title: 'Browse the rings',
      description: 'Each ring is a small group around one topic. Join any that fit.',
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
        showSuccess("You host this ring, so you're already a member.");
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
        showSuccess("You're already a member, so that step is checked off.");
      }, 500);
    }
  };

  const handleCloseIntro = () => {
    markIntroAsSeen();
    
    // Show welcome toast for existing members
    if (viewer?.threadRingMemberships?.some(m => m.threadRingId === 'welcome')) {
      setTimeout(() => {
        showSuccess("You're already a member, so that step is checked off.");
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
      <div className="bg-nb-paper border-b-2 border-nb-ink-mid p-3">
        <div className="text-center text-nb-ink">
          <span className="font-bold">Welcome Ring graduate</span>
          <span className="ml-2 text-sm text-nb-ink-mid">You finished the tour.</span>
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
      <div className="sticky top-0 z-40 bg-nb-paper border-b-2 border-nb-ink-mid px-4 py-2">
        <button
          onClick={() => setIsMinimized(false)}
          className="ts-bare text-sm font-semibold underline"
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

      <div className="sticky top-0 z-40 bg-nb-paper text-nb-ink border-b-2 border-nb-ink-mid shadow-nb-sm">
        {/* Progress bar */}
        <div className="h-1.5 bg-nb-ink-mid/15">
          <div
            className="h-full bg-nb-ink-mid transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="thread-headline text-lg font-bold">Welcome Tour</span>
            
            {/* Progress dots */}
            <div className="flex gap-2">
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  data-state={step.completed ? 'done' : currentStepIndex === idx ? 'current' : 'upcoming'}
                  className={`w-3 h-3 rounded-full border-2 ${
                    step.completed
                      ? 'bg-nb-ink-mid border-nb-ink-mid'
                      : currentStepIndex === idx
                      ? 'bg-nb-ink border-nb-ink'
                      : 'border-nb-ink-mid'
                  }`}
                  title={step.title}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsMinimized(true)}
            className="ts-bare text-sm underline"
          >
            Minimize
          </button>
        </div>

        {/* Current step */}
        {currentStep && (
          <div className="flex items-center justify-between gap-3 bg-white/70 rounded-md px-4 py-2 border-2 border-dotted border-nb-ink-mid/60">
            <div className="flex items-center gap-3">
              <div>
                <div className="font-semibold">{currentStep.title}</div>
                <div className="text-sm text-nb-ink-mid">{currentStep.description}</div>
              </div>
            </div>
            
            {currentStepIndex === 4 && (
              <Link
                href="/threadrings"
                className="btn btn--secondary inline-block text-sm px-3 py-1 font-semibold no-underline bg-thread-paper text-thread-pine border-2 border-thread-sage rounded-md shadow-cozy-sm"
              >
                Browse Rings
              </Link>
            )}
            
            {!currentStep.completed && (
              <span aria-hidden="true" className="text-nb-ink-mid text-xl">→</span>
            )}
          </div>
        )}

        {/* Completion message */}
        {completedCount === steps.length && (
          <div className="mt-3 text-center">
            <span className="font-bold">That&apos;s every step.</span>
          </div>
        )}
      </div>
      </div>
    </>
  );
}