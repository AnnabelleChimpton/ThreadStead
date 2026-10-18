import { useState } from 'react';
import Modal from '@/components/ui/feedback/Modal';

interface WelcomeRingIntroPopupProps {
  onClose: () => void;
  onStartTour: () => void;
}

// One callout style for every aside in the popup
const noteClass = 'border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3 text-xs sm:text-sm text-nb-ink';

export default function WelcomeRingIntroPopup({ onClose, onStartTour }: WelcomeRingIntroPopupProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Hi, welcome in!",
      content: (
        <div>
          <p className="text-base sm:text-lg mb-4 leading-relaxed">
            This is a practice ring, a place to try posting and see how rings work before you go join others.
          </p>
          <div className={noteClass}>
            <strong>What&apos;s a ThreadRing?</strong> A small group around one topic, with its own feed, members and 88×31 badge.
          </div>
        </div>
      )
    },
    {
      title: "How rings work",
      content: (
        <div>
          <p className="text-sm sm:text-base leading-relaxed mb-4">
            A ring is kind of like an old webring with a shared feed. Each one has a topic and a host, and any ring can
            branch off into a new one. When a member posts, it shows up in the ring&apos;s feed and anyone in the ring
            can reply.
          </p>
          <div className={noteClass}>
            <strong>Tip:</strong> A post lives on your page, and also shows up in any ring you share it to.
          </div>
        </div>
      )
    },
    {
      title: "About this ring",
      content: (
        <div>
          <p className="text-sm sm:text-base leading-relaxed">
            The tour at the top of the page has five steps. First you join the ring, if you haven&apos;t yet. Then you
            open a post and read the replies, leave a comment (the Introduce Yourself post is a good place to say hi),
            and click someone&apos;s username to visit their page. Last, go look around the other rings. That&apos;s the
            whole tour!
          </p>
        </div>
      )
    },
    {
      title: "Before you go in",
      content: (
        <div>
          <p className="text-base sm:text-lg mb-4 leading-relaxed">
            Take your time, the tour will wait for you.
          </p>
          <div className={`${noteClass} mb-4`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold">Your progress</span>
              <span className="flex gap-1" aria-hidden="true">
                {[0, 1, 2, 3, 4].map(i => (
                  <span key={i} className="w-2 h-2 rounded-full border border-nb-ink-mid" />
                ))}
              </span>
            </div>
            <div className="text-nb-ink-mid">
              One dot fills in for each step you finish.
            </div>
          </div>
          <p className="text-xs sm:text-sm text-nb-ink-mid">
            You can minimize the tour bar any time.
          </p>
        </div>
      )
    }
  ];

  const handleStartTour = () => {
    onStartTour();
    onClose();
  };

  const footer = (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Step indicators */}
      <ol className="flex gap-2 order-2 sm:order-1" aria-label={`Step ${step + 1} of ${steps.length}`}>
        {steps.map((s, index) => (
          <li
            key={s.title}
            aria-current={index === step ? 'step' : undefined}
            data-state={index === step ? 'current' : index < step ? 'done' : 'upcoming'}
            className={`step-dot w-3 h-3 rounded-full border-2 border-nb-ink-mid ${
              index === step ? 'bg-nb-ink border-nb-ink' : index < step ? 'bg-nb-ink-mid' : ''
            }`}
          />
        ))}
      </ol>

      {/* Navigation buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="ts-bare text-sm underline">
            Back
          </button>
        )}

        {step < steps.length - 1 ? (
          <button onClick={() => setStep(step + 1)} className="thread-button btn btn--primary w-full sm:w-auto px-6">
            Next
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button onClick={onClose} className="thread-button-secondary btn btn--secondary text-sm sm:text-base">
              I&apos;ll explore on my own
            </button>
            <button onClick={handleStartTour} className="thread-button btn btn--primary text-sm sm:text-base px-6">
              Start the tour
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={steps[step].title}
      maxWidth="max-w-xl"
      closeLabel="Close popup"
      footer={footer}
    >
      {steps[step].content}
    </Modal>
  );
}
