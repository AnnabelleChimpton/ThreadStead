import { useState } from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface WelcomeRingIntroPopupProps {
  onClose: () => void;
  onStartTour: () => void;
}

export default function WelcomeRingIntroPopup({ onClose, onStartTour }: WelcomeRingIntroPopupProps) {
  const [step, setStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const steps = [
    {
      title: "Welcome to your first ThreadRing!",
      content: (
        <div className="text-center">
          <div className="mb-4 flex justify-center animate-bounce"><PixelIcon name="home" size={48} /></div>
          <p className="text-base sm:text-lg mb-4 leading-relaxed">
            This ring is where every new neighbor starts — a place to try posting and see how rings work.
          </p>
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200 text-xs sm:text-sm text-blue-800">
            <strong>What&apos;s a ThreadRing?</strong> A small group around one topic, with its own feed, members and 88×31 badge.
          </div>
        </div>
      )
    },
    {
      title: "How ThreadRings Work",
      content: (
        <div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="text-center">
              <div className="mb-1 sm:mb-2 flex justify-center"><PixelIcon name="link" size={28} /></div>
              <div className="text-xs sm:text-sm font-semibold">Connected</div>
              <div className="text-xs text-gray-600 hidden sm:block">Like an old webring, with a shared feed</div>
            </div>
            <div className="text-center">
              <div className="mb-1 sm:mb-2 flex justify-center"><PixelIcon name="chart" size={28} /></div>
              <div className="text-xs sm:text-sm font-semibold">Growing</div>
              <div className="text-xs text-gray-600 hidden sm:block">Any ring can be forked into a new one</div>
            </div>
            <div className="text-center">
              <div className="mb-1 sm:mb-2 flex justify-center"><PixelIcon name="paint-bucket" size={28} /></div>
              <div className="text-xs sm:text-sm font-semibold">Themed</div>
              <div className="text-xs text-gray-600 hidden sm:block">Each one has a topic and a host</div>
            </div>
          </div>
          <p className="text-sm sm:text-base leading-relaxed mb-4">
            Somewhere between a <strong>Discord</strong> channel and an <strong>old forum</strong>: members post, everyone in the ring sees it in the ring&apos;s feed, and anyone can reply.
          </p>
          <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-xs sm:text-sm text-green-800">
            <PixelIcon name="lightbulb" size={14} className="inline-block align-middle mr-1" /><strong>Tip:</strong> A post lives on your page, and also shows up in any ring you share it to.
          </div>
        </div>
      )
    },
    {
      title: "About this ring",
      content: (
        <div>
          <div className="flex items-center justify-center mb-4">
            <div className="animate-pulse"><PixelIcon name="trophy" size={40} /></div>
          </div>
          <p className="text-sm sm:text-base leading-relaxed mb-4">
            The <strong>Welcome Ring</strong> is a training ground. A short tour at the top of the page walks you through five things:
          </p>
          <div className="space-y-2 sm:space-y-3 mb-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <div><PixelIcon name="eye" size={18} /></div>
              <div className="text-xs sm:text-sm">
                <strong>Read posts</strong> and open the replies
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <div><PixelIcon name="chat" size={18} /></div>
              <div className="text-xs sm:text-sm">
                <strong>Leave comments</strong> on the Introduce Yourself post, or anywhere
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
              <div><PixelIcon name="users" size={18} /></div>
              <div className="text-xs sm:text-sm">
                <strong>Visit profiles</strong> by clicking a username
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-100 to-blue-100 p-3 rounded-lg border-2 border-dashed border-green-400 text-xs sm:text-sm text-green-800">
            Then browse the other rings. That&apos;s the whole tour.
          </div>
        </div>
      )
    },
    {
      title: "Before you go in",
      content: (
        <div className="text-center">
          <p className="text-base sm:text-lg mb-4 sm:mb-6 leading-relaxed">
            Everyone here started in this ring too. Take your time — the tour waits for you.
          </p>
          <div className="bg-gradient-to-r from-purple-100 via-blue-100 to-green-100 p-3 sm:p-4 rounded-xl border-2 border-purple-300 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-2">
              <span className="text-xs sm:text-sm font-bold">Your progress</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              </div>
            </div>
            <div className="text-xs text-purple-700">
              One dot fills in for each step you finish.
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mb-4">
            You can minimize the tour bar any time.
          </p>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (step < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setStep(step + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setStep(step - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleStartTour = () => {
    onStartTour();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10001] p-4 overflow-y-auto">
      <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto border-2 sm:border-4 border-black my-2 sm:my-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-200 via-blue-200 to-green-200 p-4 sm:p-6 border-b-2 border-black relative overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 hover:bg-white/50 rounded-full transition-colors text-xl font-bold text-gray-600 hover:text-gray-800 z-10"
            aria-label="Close popup"
          >
            ×
          </button>

          <h1 className={`text-lg sm:text-xl md:text-2xl font-bold text-purple-800 pr-8 sm:pr-12 transition-opacity duration-150 ${
            isAnimating ? 'opacity-50' : 'opacity-100'
          }`}>
            {steps[step].title}
          </h1>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 md:p-8">
          <div className={`transition-all duration-150 ${
            isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
          }`}>
            {steps[step].content}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 sm:p-6 border-t-2 border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Step indicators */}
            <div className="flex gap-2 order-2 sm:order-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === step 
                      ? 'bg-purple-500 scale-125 shadow-lg' 
                      : index < step 
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto order-1 sm:order-2">
              {step > 0 && (
                <button
                  onClick={prevStep}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors w-full sm:w-auto"
                >
                  Back
                </button>
              )}
              
              {step < steps.length - 1 ? (
                <button
                  onClick={nextStep}
                  className="bg-purple-200 hover:bg-purple-300 px-6 py-2 rounded-lg border-2 border-purple-400 shadow-[2px_2px_0_#7c3aed] font-bold text-purple-800 transition-all hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#7c3aed] w-full sm:w-auto"
                >
                  Next
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={onClose}
                    className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg border-2 border-gray-400 text-gray-700 transition-all text-sm sm:text-base"
                  >
                    I&apos;ll explore on my own
                  </button>
                  <button
                    onClick={handleStartTour}
                    className="bg-green-200 hover:bg-green-300 px-6 py-2 rounded-lg border-2 border-green-500 shadow-[2px_2px_0_#16a34a] font-bold text-green-800 transition-all hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#16a34a] text-sm sm:text-base"
                  >
                    Start the tour
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}