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
      title: "Welcome to your first ThreadRing!",
      content: (
        <div>
          <p className="text-base sm:text-lg mb-4 leading-relaxed">
            This ring is where every new neighbor starts — a place to try posting and see how rings work.
          </p>
          <div className={noteClass}>
            <strong>What&apos;s a ThreadRing?</strong> A small group around one topic, with its own feed, members and 88×31 badge.
          </div>
        </div>
      )
    },
    {
      title: "How ThreadRings Work",
      content: (
        <div>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 sm:mb-6 text-sm">
            <div>
              <dt className="font-semibold">Connected</dt>
              <dd className="text-nb-ink-mid">Like an old webring, with a shared feed</dd>
            </div>
            <div>
              <dt className="font-semibold">Growing</dt>
              <dd className="text-nb-ink-mid">Any ring can be forked into a new one</dd>
            </div>
            <div>
              <dt className="font-semibold">Themed</dt>
              <dd className="text-nb-ink-mid">Each one has a topic and a host</dd>
            </div>
          </dl>
          <p className="text-sm sm:text-base leading-relaxed mb-4">
            Somewhere between a <strong>Discord</strong> channel and an <strong>old forum</strong>: members post, everyone in the ring sees it in the ring&apos;s feed, and anyone can reply.
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
          <p className="text-sm sm:text-base leading-relaxed mb-4">
            The <strong>Welcome Ring</strong> is a training ground. A short tour at the top of the page walks you through five things:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mb-4 text-xs sm:text-sm">
            <li><strong>Read posts</strong> and open the replies</li>
            <li><strong>Leave comments</strong> on the Introduce Yourself post, or anywhere</li>
            <li><strong>Visit profiles</strong> by clicking a username</li>
          </ul>
          <div className={noteClass}>
            Then browse the other rings. That&apos;s the whole tour.
          </div>
        </div>
      )
    },
    {
      title: "Before you go in",
      content: (
        <div>
          <p className="text-base sm:text-lg mb-4 leading-relaxed">
            Everyone here started in this ring too. Take your time — the tour waits for you.
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
